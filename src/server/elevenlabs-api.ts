import { GetObjectCommand } from "@aws-sdk/client-s3";
import { s3Client } from "./s3";
import { env } from "~/env.mjs";
import { TRPCError } from "@trpc/server";
import axios from "axios";
import FormData from "form-data";
import { type Readable } from "stream";
import crypto from "crypto";
import { LRUCache } from "lru-cache";
import { prisma } from "./db";

const elevenLabsAxios = axios.create({
  baseURL: "https://api.elevenlabs.io",
  headers: {
    "xi-api-key": env.ELEVENLABS_API_KEY,
  },
});

async function deleteVoice(voiceId: string) {
  await elevenLabsAxios.delete(`/v1/voices/${voiceId}`);
}

type GetVoicesResponse = {
  voices: {
    voice_id: string;
    name: string;
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
  };
  optimizeStreamingLatency?: number;
};

class ElevenLabsManager {
  private activeTtsRequests = 0;
  private loadedVoices: LRUCache<string, string> = new LRUCache({
    max: env.ELEVENLABS_MAX_VOICES * 2,
  });
  private initialization: Promise<void> | null = null;

  async initOnce() {
    if (!this.initialization) {
      this.initialization = new Promise<void>(async (resolve, reject) => {
        try {
          await this.getAlreadyLoadedVoicesFromElevenLabs();
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
      include: { soundFileJoins: { include: { seedSound: true } } },
    });

    for (const voiceModel of voiceModels) {
      const seedBucketKeys = voiceModel.soundFileJoins.map(
        (join) => join.seedSound.bucketKey
      );

      const reproducedArgsHash = hashAddVoiceArgs({
        name: voiceModel.id,
        bucketKeys: seedBucketKeys,
      });
      const elevenVoice = existingVoices.data.voices.find(
        (voice) => voice.name == voiceModel.id
      );

      if (!elevenVoice) {
        throw new TRPCError({
          message: `Failed to link existing elevenlabs voice to db voice`,
          code: "INTERNAL_SERVER_ERROR",
        });
      }
      this.loadedVoices.set(reproducedArgsHash, elevenVoice.voice_id);
    }
  }
  private async addVoice(args: AddVoiceArgs): Promise<string> {
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
        throw new TRPCError({
          message: `Failed to get seed sound: ${key}`,
          code: "INTERNAL_SERVER_ERROR",
        });
      }

      form.append("files", fileStream, {
        contentType: response.ContentType,
        knownLength: response.ContentLength,
        filename: key,
      });
    }

    const response = await elevenLabsAxios.post<{ voice_id: string }>(
      "/v1/voices/add",
      form,
      {
        headers: {
          Accept: "application/json",
          "Content-Type": "multipart/form-data",
        },
      }
    );

    if (response.status === 200) {
      return response.data.voice_id;
    } else {
      throw new TRPCError({
        message: `Error adding voice: ${response.statusText}`,
        code: "INTERNAL_SERVER_ERROR",
      });
    }
  }

  async ensureVoiceIsLoaded(args: AddVoiceArgs): Promise<string> {
    await this.initOnce();
    const argHash = hashAddVoiceArgs(args);
    if (this.loadedVoices.has(argHash)) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return this.loadedVoices.get(argHash)!;
    }

    // subtract ELEVENLABS_MAX_CONCURRENCY for safety buffer
    if (
      this.loadedVoices.size ==
      env.ELEVENLABS_MAX_VOICES - env.ELEVENLABS_MAX_CONCURRENCY
    ) {
      const voiceIdToDelete = this.loadedVoices.pop();
      if (voiceIdToDelete) {
        await deleteVoice(voiceIdToDelete);
      }
    }

    const newVoiceId = await this.addVoice(args);
    this.loadedVoices.set(argHash, newVoiceId);
    return newVoiceId;
  }
  async textToSpeechStream(
    voiceArgs: AddVoiceArgs,

    {
      text,
      modelId = "eleven_monolingual_v1",
      generationSettings,
      optimizeStreamingLatency = 0,
    }: TTSSettings
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
        }
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
        throw new TRPCError({
          message: `Error generating speech audio: code: ${
            response.status
          }, content-length: ${contentLength ?? 0}`,
          code: "INTERNAL_SERVER_ERROR",
        });
      }
    } catch (error) {
      throw new TRPCError({
        message: `Error in elevenlabs TTS call`,
        code: "INTERNAL_SERVER_ERROR",
      });
    } finally {
      this.activeTtsRequests--;
    }
  }
}

export const elevenLabsManager = new ElevenLabsManager();
void elevenLabsManager.initOnce();
