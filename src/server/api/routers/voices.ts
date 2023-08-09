import { PutObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { env } from "~/env.mjs";
import { voiceEditFormSchema } from "~/pages/voicemodels/[voiceModelId]/edit";
import {
  createTRPCRouter,
  privateProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { elevenLabsManager } from "~/server/elevenlabs-api";
import { PREVIEW_TEXTS } from "~/server/preview-text";
import { getPublicUrl, s3Client } from "~/server/s3";

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
          where: {
            published: true,
          },
          take: 1,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      where: {
        modelVersions: {
          some: {
            published: true,
          },
        },
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
          where: {
            published: true,
          },
          take: 1,
        },
      },
      orderBy: {
        likes: "desc",
      },
      where: {
        modelVersions: {
          some: {
            published: true,
          },
        },
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
            where: {
              published: true,
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

      await elevenLabsManager.ensureVoiceIsLoaded({
        name: input.voiceModelId,
        bucketKeys: seedBucketKeys,
      });

      for (const previewText of PREVIEW_TEXTS) {
        const ttsResponse = await elevenLabsManager.textToSpeechStream(
          {
            name: input.voiceModelId,
            bucketKeys: seedBucketKeys,
          },
          {
            text: previewText.text,
            modelId: voiceModel.elevenLabsModelId,
            generationSettings: {
              similarity_boost: voiceModel.elevenLabsSimilarityBoost,
              stability: voiceModel.elevenLabsStability,
            },
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

      await ctx.prisma.voiceModel.update({
        where: { id: voiceModel.id },
        data: {
          published: true,
        },
      });

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

      const ttsResponse = await elevenLabsManager.textToSpeechStream(
        {
          name: input.voiceModelId,
          bucketKeys: seedBucketKeys,
        },
        {
          text: input.formData.generationText,
          modelId: input.formData.modelName,
          generationSettings: {
            similarity_boost: input.formData.similarity,
            stability: input.formData.stability,
          },
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

      return getPublicUrl(genKey);
    }),
});
