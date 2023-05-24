import { GetObjectCommand } from "@aws-sdk/client-s3";
import { s3Client } from "./s3";
import { env } from "~/env.mjs";
import { TRPCError } from "@trpc/server";
import axios from "axios";
import FormData from "form-data";
import { type Readable } from "stream";

const elevenLabsAxios = axios.create({
  baseURL: "https://api.elevenlabs.io",
  headers: {
    "xi-api-key": env.ELEVENLABS_API_KEY,
  },
});

export async function addVoice(
  name: string,
  bucketKeys: string[]
): Promise<string> {
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

export async function deleteVoice(voiceId: string) {
  await elevenLabsAxios.delete(`/v1/voices/${voiceId}`);
}

export async function textToSpeechStream(
  voiceId: string,
  text: string,
  modelId = "eleven_monolingual_v1",
  voiceSettings?: {
    similarity_boost: number;
    stability: number;
  },
  optimizeStreamingLatency = 0
) {
  const response = await elevenLabsAxios.post(
    `/v1/text-to-speech/${voiceId}`,
    {
      text,
      model_id: modelId,
      voice_settings: voiceSettings,
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
  const contentType = response.headers["content-type"] as string | undefined;

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
}
