import { GetObjectCommand } from "@aws-sdk/client-s3";
import { s3Client } from "./s3";
import { env } from "~/env.mjs";
import axios from "axios";
import FormData from "form-data";
import { type Readable } from "stream";
import crypto from "crypto";
import { LRUCache } from "lru-cache";
import { prisma } from "./db";
import logger from "~/logger";

const elevenLabsAxios = axios.create({
  baseURL: "https://api.elevenlabs.io",
  headers: {
    "xi-api-key": env.ELEVENLABS_API_KEY,
  },
});

// elevenLabsAxios.interceptors.request.use((request) => {
//   console.log('Sending Request', request.method, request.url)
//   return request
// })

// elevenLabsAxios.interceptors.response.use((response) => {
//   console.log('Responsed')
//   return response
// })

async function deleteVoice(voiceId: string) {
  await elevenLabsAxios.delete(`/v1/voices/${voiceId}`);
}

type GetVoicesResponse = {
  voices: {
    voice_id: string;
    name: string;
    samples?: {
      sample_id: string;
      file_name: string;
      mime_type: string;
      size_bytes: number;
      hash: string;
    }[];
  }[];
};
async function getVoices() {
  return await elevenLabsAxios.get<GetVoicesResponse>("/v1/voices");
}

type AddVoiceArgs = {
  name: string;
  bucketKeys: string[];
};
function hashAddVoiceArgs(object: AddVoiceArgs) {
  const sortedObject = {
    ...object,
    bucketKeys: [...object.bucketKeys].sort(),
  };

  const str = JSON.stringify(sortedObject);
  const hash = crypto.createHash("md5").update(str).digest("hex");
  return hash;
}

type TTSSettings = {
  text: string;
  modelId: string;
  generationSettings?: {
    similarity_boost: number;
    stability: number;
    style: number;
    use_speaker_boost: boolean;
  };
  optimizeStreamingLatency?: number;
};

type VoiceIds = {
  elevenLabsVoiceId: string;
  prismaVoiceId: string;
};

class ElevenLabsManager {
  private activeTtsRequests = 0;
  // TODO: back this by redis for multiple replicas
  private loadedVoices: LRUCache<string, VoiceIds> = new LRUCache({
    max: 1000,
  });
  private initialization: Promise<void> | null = null;

  async initOnce() {
    if (!this.initialization) {
      this.initialization = new Promise<void>(async (resolve, reject) => {
        try {
          await this.getAlreadyLoadedVoicesFromElevenLabs();
          if (this.loadedVoices.size > 0) {
            logger.debug(
              "matched elevenlabs voices to db",
              this.loadedVoices.entries(),
            );
          } else {
            logger.debug("no matched voices found in elevenlabs");
          }
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    }
    return this.initialization;
  }

  private async getAlreadyLoadedVoicesFromElevenLabs() {
    const existingVoices = await getVoices();

    const voiceModels = await prisma.voiceModel.findMany({
      where: {
        id: { in: existingVoices.data.voices.map((voice) => voice.name) },
      },
      include: {
        soundFileJoins: {
          include: { seedSound: { select: { bucketKey: true } } },
        },
      },
    });

    for (const voiceModel of voiceModels) {
      const seedBucketKeys = voiceModel.soundFileJoins.map(
        (join) => join.seedSound.bucketKey,
      );

      const reproducedArgsHash = hashAddVoiceArgs({
        name: voiceModel.id,
        bucketKeys: seedBucketKeys,
      });
      const elevenVoice = existingVoices.data.voices.find(
        (voice) => voice.name == voiceModel.id,
      );

      if (!elevenVoice) {
        throw new Error(
          `Failed to link existing elevenlabs voice to db voice: ${voiceModel.id}`,
        );
      }
      this.loadedVoices.set(reproducedArgsHash, {
        elevenLabsVoiceId: elevenVoice.voice_id,
        prismaVoiceId: voiceModel.id,
      });
    }

    // delete unmatched voices in prod
    if (env.NODE_ENV === "production") {
      const loadedVoiceIds = new Set(
        Array.from(
          this.loadedVoices.values(),
          (voice) => voice.elevenLabsVoiceId,
        ),
      );
      const voicesToDelete = existingVoices.data.voices.filter(
        (voice) =>
          !loadedVoiceIds.has(voice.voice_id) &&
          voice.samples &&
          voice.samples.length > 0,
      );
      if (voicesToDelete.length > 0) {
        logger.info("starting to delete voices");
      }
      for (const voice of voicesToDelete) {
        logger.info("deleting elevenlabs voiceid: " + voice.voice_id);
        await deleteVoice(voice.voice_id);
      }
      if (voicesToDelete.length > 0) {
        logger.info("done deleting voices");
      }
    }
  }
  private async upsertVoice(args: AddVoiceArgs): Promise<string> {
    const { name, bucketKeys } = args;
    const form = new FormData();

    form.append("name", name);

    for (const key of bucketKeys) {
      const getObjectCommand = new GetObjectCommand({
        Bucket: env.BUCKET_NAME,
        Key: key,
      });

      const response = await s3Client.send(getObjectCommand);
      const fileStream = response.Body;

      if (fileStream == null) {
        throw new Error(`Failed to get seed sound: ${key}`);
      }

      form.append("files", fileStream, {
        contentType: response.ContentType,
        knownLength: response.ContentLength,
        filename: key,
      });
    }
    const existingVoiceId = Array.from(this.loadedVoices.values()).find(
      (voice) => voice.prismaVoiceId === args.name,
    )?.elevenLabsVoiceId;

    if (existingVoiceId) {
      await deleteVoice(existingVoiceId);
      const keyToDelete = Array.from(this.loadedVoices.entries()).find(
        ([_, voiceIds]) => voiceIds.elevenLabsVoiceId === existingVoiceId,
      )?.[0];
      if (keyToDelete) {
        this.loadedVoices.delete(keyToDelete);
      }
    }

    try {
      const response = await elevenLabsAxios.post<{ voice_id: string }>(
        "/v1/voices/add",
        form,
        {
          headers: {
            Accept: "application/json",
            "Content-Type": "multipart/form-data",
          },
        },
      );
      if (response.status === 200) {
        return response.data.voice_id;
      } else {
        throw new Error(`Error adding voice: ${response.statusText}`);
      }
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      throw new Error(`Error adding voice: ${error}`);
    }
  }

  async ensureVoiceIsLoaded(args: AddVoiceArgs): Promise<string> {
    await this.initOnce();
    const argHash = hashAddVoiceArgs(args);
    if (this.loadedVoices.has(argHash)) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return this.loadedVoices.get(argHash)!.elevenLabsVoiceId;
    }

    // subtract ELEVENLABS_MAX_CONCURRENCY for safety buffer
    if (
      this.loadedVoices.size ==
      env.ELEVENLABS_MAX_VOICES - env.ELEVENLABS_MAX_CONCURRENCY
    ) {
      const voiceIdToDelete = this.loadedVoices.pop();
      if (voiceIdToDelete) {
        await deleteVoice(voiceIdToDelete.elevenLabsVoiceId);
      }
    }

    const newVoiceId = await this.upsertVoice(args);
    this.loadedVoices.set(argHash, {
      elevenLabsVoiceId: newVoiceId,
      prismaVoiceId: args.name,
    });
    return newVoiceId;
  }

  async textToSpeechStream(
    voiceArgs: AddVoiceArgs,

    {
      text,
      modelId = "eleven_monolingual_v1",
      generationSettings,
      optimizeStreamingLatency = 0,
    }: TTSSettings,
  ) {
    await this.initOnce();
    const voiceId = await this.ensureVoiceIsLoaded(voiceArgs);

    while (this.activeTtsRequests >= env.ELEVENLABS_MAX_CONCURRENCY) {
      // Wait a bit if there are too many active tasks
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    this.activeTtsRequests++;
    try {
      const response = await elevenLabsAxios.post(
        `/v1/text-to-speech/${voiceId}`,
        {
          text,
          model_id: modelId,
          voice_settings: generationSettings,
        },
        {
          headers: {
            Accept: "audio/mpeg",
          },
          responseType: "stream",
          params: {
            optimize_streaming_latency: optimizeStreamingLatency,
          },
        },
      );
      const contentLength = response.headers["content-length"] as
        | string
        | undefined;
      const contentType = response.headers["content-type"] as
        | string
        | undefined;

      if (response.status === 200 && contentLength != null) {
        return {
          stream: response.data as Readable,
          contentLength: parseInt(contentLength),
          contentType: contentType,
        };
      } else {
        throw new Error(
          `Error generating speech audio: code: ${
            response.status
          }, content-length: ${contentLength ?? 0}`,
        );
      }
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      const errorMessage = `error in elevenlabs TTS call: ${error}`;
      logger.error(errorMessage);
      throw new Error(errorMessage);
    } finally {
      this.activeTtsRequests--;
    }
  }
}

export const elevenLabsManager = new ElevenLabsManager();
void elevenLabsManager.initOnce();
