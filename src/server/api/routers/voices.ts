import { PutObjectCommand } from "@aws-sdk/client-s3";
import { type Prisma, type User } from "@prisma/client";
import { username } from "react-lorem-ipsum";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { env } from "~/env.mjs";
import { voiceEditFormSchema } from "~/pages/voicemodels/[voiceModelId]/edit";
import {
  createTRPCRouter,
  privateProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import {
  addVoice,
  deleteVoice,
  textToSpeechStream,
} from "~/server/elevenlabs-api";
import { PREVIEW_TEXTS } from "~/server/preview-text";
import { getPublicUrl, s3Client } from "~/server/s3";

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
  getVoiceDetails: publicProcedure
    .input(z.object({ voiceId: z.string() }))
    .query(async ({ input, ctx }) => {
      const voice = await ctx.prisma.voice.findFirstOrThrow({
        where: {
          id: input.voiceId,
        },
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
      });
      const previewSounds = voice.modelVersions[0]?.previewSounds.map(
        (sound) => ({ ...sound, publicUrl: getPublicUrl(sound.bucketKey) })
      );

      return { voiceName: voice.name, previewSounds: previewSounds };
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

  postVoiceModel: privateProcedure
    .input(
      z.object({
        voiceModelId: z.string(),
        warcraftNpcDisplayId: z.string(),
        voiceTitle: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const voiceModel = await ctx.prisma.voiceModel.findFirstOrThrow({
        where: { id: input.voiceModelId, voice: { ownerUserId: ctx.userId } },
        include: { soundFileJoins: { include: { seedSound: true } } },
      });

      // make auto-preview noises

      const voice = await ctx.prisma.voice.update({
        where: { id: voiceModel.voiceId },
        data: {
          name: input.voiceTitle,
          warcraftNpcDisplay: {
            connect: { id: input.warcraftNpcDisplayId },
          },
        },
      });

      const seedBucketKeys = voiceModel.soundFileJoins.map(
        (join) => join.seedSound.bucketKey
      );

      const elevenlabsVoiceId = await addVoice(
        input.voiceModelId,
        seedBucketKeys
      );

      for (const previewText of PREVIEW_TEXTS) {
        const ttsResponse = await textToSpeechStream(
          elevenlabsVoiceId,
          previewText.text,
          voiceModel.elevenLabsModelId,
          {
            similarity_boost: voiceModel.elevenLabsSimilarityBoost,
            stability: voiceModel.elevenLabsStability,
          }
        );

        const genKey = `preview/${uuidv4()}`;

        const putObjectCommand = new PutObjectCommand({
          Bucket: env.BUCKET_NAME,
          Key: genKey,
          Body: ttsResponse.stream,
          ContentLength: ttsResponse.contentLength,
          ContentType: ttsResponse.contentType,
        });

        await s3Client.send(putObjectCommand);

        await ctx.prisma.previewSound.create({
          data: {
            iconEmoji: previewText.emoji,
            bucketKey: genKey,
            voiceModel: { connect: { id: voiceModel.id } },
          },
        });
      }

      void deleteVoice(elevenlabsVoiceId);

      return `/voices/${voice.id}`;
    }),
  generateTestSound: privateProcedure
    .input(
      z.object({
        voiceModelId: z.string(),
        formData: voiceEditFormSchema,
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

      await ctx.prisma.voiceModel.update({
        where: { id: input.voiceModelId },
        data: {
          elevenLabsModelId: input.formData.modelName,
          elevenLabsSimilarityBoost: input.formData.similarity,
          elevenLabsStability: input.formData.stability,
        },
      });

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
