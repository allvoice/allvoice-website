import {
  createTRPCRouter,
  privateProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { username } from "react-lorem-ipsum";
import { type Prisma, type User } from "@prisma/client";
import { z } from "zod";
import { voiceCreateFormSchema } from "~/pages/voicemodels/[voiceModelId]/edit";
import {
  addVoice,
  deleteVoice,
  textToSpeechStream,
} from "~/server/elevenlabs-api";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3Client } from "~/server/s3";
import { env } from "~/env.mjs";
import { getPublicUrl } from "~/server/s3";
import { v4 as uuidv4 } from "uuid";

function createMockVoices(n: number, user: User) {
  const data: Prisma.VoiceCreateManyInput[] = [];
  for (let i = 0; i < n; i++) {
    data.push({
      ownerUserId: user.id,
      name: username(),
      likes: Math.floor(Math.random() * 1000),
    });
  }
  return data;
}

export const voicesRouter = createTRPCRouter({
  listNewest: publicProcedure.query(async ({ ctx }) => {
    // TODO: Probably want to introduce cursor pagination
    const voices = await ctx.prisma.voice.findMany({
      include: {
        modelVersions: {
          include: {
            previewSounds: true,
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 20,
    });

    return voices;
  }),

  listMostPopular: publicProcedure.query(async ({ ctx }) => {
    const voices = await ctx.prisma.voice.findMany({
      include: {
        modelVersions: {
          include: {
            previewSounds: true,
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
      },
      orderBy: {
        likes: "desc",
      },
      take: 20,
    });

    return voices;
  }),

  getVoiceModelWorkspace: privateProcedure
    .input(z.object({ voiceModelId: z.string() }))
    .query(async ({ ctx, input }) => {
      const voiceModel = await ctx.prisma.voiceModel.findFirstOrThrow({
        where: { id: input.voiceModelId, voice: { ownerUserId: ctx.userId } },
        include: { soundFileJoins: true },
      });

      const seedSoundIds = voiceModel.soundFileJoins.map(
        (join) => join.seedSoundId
      );
      return {
        seedSoundIds: seedSoundIds,
      };
    }),

  generateTestSound: privateProcedure
    .input(
      z.object({
        voiceModelId: z.string(),
        formData: voiceCreateFormSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const voiceModel = await ctx.prisma.voiceModel.findFirstOrThrow({
        where: { id: input.voiceModelId, voice: { ownerUserId: ctx.userId } },
        include: { soundFileJoins: { include: { seedSound: true } } },
      });

      const seedBucketKeys = voiceModel.soundFileJoins.map(
        (join) => join.seedSound.bucketKey
      );

      const elevenlabsVoiceId = await addVoice(
        input.voiceModelId,
        seedBucketKeys
      );

      const ttsResponse = await textToSpeechStream(
        elevenlabsVoiceId,
        input.formData.generationText,
        input.formData.modelName,
        {
          similarity_boost: input.formData.similarity,
          stability: input.formData.stability,
        }
      );

      const genKey = `testgen/${uuidv4()}`;

      const putObjectCommand = new PutObjectCommand({
        Bucket: env.BUCKET_NAME,
        Key: genKey,
        Body: ttsResponse.stream,
        ContentLength: ttsResponse.contentLength,
        ContentType: ttsResponse.contentType,
      });

      await s3Client.send(putObjectCommand);

      void deleteVoice(elevenlabsVoiceId);

      return getPublicUrl(genKey);
    }),

  refreshMock: publicProcedure.query(async ({ ctx }) => {
    const user = await ctx.prisma.user.create({
      data: {
        id: "user_2PhHc4bcsYBoOUw824MbIsVVFVJ", // cameronlund4@gmail.com
      },
    });

    await ctx.prisma.userLikes.deleteMany({});
    await ctx.prisma.previewSound.deleteMany({});
    await ctx.prisma.voiceModel.deleteMany({});
    await ctx.prisma.voice.deleteMany({});

    for (const voiceData of createMockVoices(20, user)) {
      const createdVoice = await ctx.prisma.voice.create({
        data: voiceData,
      });
      if (Math.random() < 0.33) {
        await ctx.prisma.userLikes.create({
          data: {
            userId: user.id,
            voiceId: createdVoice.id,
          },
        });
      }

      for (
        let voiceModelCount = 0;
        voiceModelCount < Math.floor(Math.random() * 4) + 1;
        voiceModelCount++
      ) {
        const createdModel = await ctx.prisma.voiceModel.create({
          data: {
            voiceId: createdVoice.id,
          },
        });

        const faces = ["😭", "🤬", "😁", "😐", "😰", "🥴"];
        const previewCount = Math.floor(Math.random() * 4) + 1;
        for (let i = 0; i < previewCount; i++) {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          const face = faces[Math.floor(Math.random() * faces.length)]!;
          await ctx.prisma.previewSound.create({
            data: {
              bucketKey: username(),
              voiceModelId: createdModel.id,
              iconEmoji: face,
            },
          });
        }
      }
    }
  }),
});
