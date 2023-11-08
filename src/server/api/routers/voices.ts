import { PutObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { env } from "~/env.mjs";
import {
  createTRPCRouter,
  privateProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { elevenLabsManager } from "~/server/elevenlabs-api";
import { PREVIEW_TEXTS } from "~/server/preview-text";
import { getPublicUrl, s3Client } from "~/server/s3";
import { voiceEditFormSchema } from "~/utils/schema";

export const voicesRouter = createTRPCRouter({
  listVoices: publicProcedure
    .input(
      z
        .object({
          type: z.enum(["newest", "popular"]).optional().default("popular"),
          uniqueNPCId: z.string().optional(),
          characterModelId: z.string().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
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
          warcraftNpcDisplay: {
            include: { npcs: true },
          },
        },
        orderBy: {
          ...(input?.type === "newest"
            ? { createdAt: "desc" }
            : { score: "desc" }), // defaults to popular sorting if input object is null
        },
        where: {
          modelVersions: {
            some: {
              published: true,
            },
          },
          ...(input?.uniqueNPCId
            ? {
                uniqueWarcraftNpcId: input.uniqueNPCId,
              }
            : {}),
          ...(input?.characterModelId
            ? {
                wacraftNpcDisplayId: input.characterModelId,
              }
            : {}),
        },

        take: 20,
      });

      const mapped = voices.map((voice) => ({
        ...voice,
        modelVersions: voice.modelVersions.map((version) => ({
          ...version,
          previewSounds: version.previewSounds.map((sound) => ({
            ...sound,
            publicUrl: getPublicUrl(sound.bucketKey),
          })),
        })),
      }));

      return mapped;
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
        (sound) => ({ ...sound, publicUrl: getPublicUrl(sound.bucketKey) }),
      );

      return { voiceName: voice.name, previewSounds: previewSounds };
    }),

  getVoiceModelWorkspace: privateProcedure
    .input(z.object({ voiceModelId: z.string() }))
    .query(async ({ ctx, input }) => {
      const voiceModel = await ctx.prisma.voiceModel.findFirstOrThrow({
        where: { id: input.voiceModelId, voice: { ownerUserId: ctx.userId } },
        include: {
          soundFileJoins: {
            include: { seedSound: { select: { name: true } } },
          },
        },
      });

      const seedSounds = voiceModel.soundFileJoins.map((it) => ({
        id: it.seedSoundId,
        active: it.active,
        name: it.seedSound.name,
      }));

      const sortedSeedSounds = seedSounds
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((it) => ({
          id: it.id,
          active: it.active,
        }));

      return {
        seedSounds: sortedSeedSounds,
      };
    }),

  postVoiceModel: privateProcedure
    .input(
      z.object({
        voiceModelId: z.string(),
        warcraftNpcDisplayId: z.string().optional(),
        voiceTitle: z.string(),
      }),
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
          ...(input.warcraftNpcDisplayId
            ? {
                warcraftNpcDisplay: {
                  connect: { id: input.warcraftNpcDisplayId },
                },
              }
            : {}),
        },
      });

      const seedBucketKeys = voiceModel.soundFileJoins.map(
        (join) => join.seedSound.bucketKey,
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
              style: voiceModel.elevenLabsStyle,
              use_speaker_boost: voiceModel.elevenLabsSpeakerBoost,
            },
          },
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
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const voiceModel = await ctx.prisma.voiceModel.findFirstOrThrow({
        where: { id: input.voiceModelId, voice: { ownerUserId: ctx.userId } },
        include: { soundFileJoins: { include: { seedSound: true } } },
      });

      const seedBucketKeys = voiceModel.soundFileJoins.map(
        (join) => join.seedSound.bucketKey,
      );

      await ctx.prisma.voiceModel.update({
        where: { id: input.voiceModelId },
        data: {
          elevenLabsModelId: input.formData.modelName,
          elevenLabsSimilarityBoost: input.formData.similarity,
          elevenLabsStability: input.formData.stability,
          elevenLabsSpeakerBoost: input.formData.speakerBoost,
          elevenLabsStyle: input.formData.style,
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
            style: input.formData.style,
            use_speaker_boost: input.formData.speakerBoost,
          },
        },
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

  updateVoiceGenerationSettings: privateProcedure
    .input(
      z.object({
        voiceModelId: z.string(),
        formData: voiceEditFormSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.voiceModel.update({
        where: { id: input.voiceModelId },
        data: {
          elevenLabsModelId: input.formData.modelName,
          elevenLabsSimilarityBoost: input.formData.similarity,
          elevenLabsStability: input.formData.stability,
          elevenLabsSpeakerBoost: input.formData.speakerBoost,
          elevenLabsStyle: input.formData.style,
        },
      });
    }),

  updateSeedSound: privateProcedure
    .input(
      z.object({
        voiceModelId: z.string(),
        seedSoundId: z.string(),
        active: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.voiceModelSeedSounds.update({
        where: {
          voiceModelId_seedSoundId: {
            seedSoundId: input.seedSoundId,
            voiceModelId: input.voiceModelId,
          },
        },
        data: {
          active: input.active,
        },
      });
    }),
  rateVoice: privateProcedure
    .input(
      z.object({
        voiceId: z.string(),
        action: z.enum(["upvote", "downvote"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { voiceId, action } = input;
      const { userId } = ctx;

      const userVote = {
        where: {
          userId_voiceId: {
            userId,
            voiceId,
          },
        },
      };

      await ctx.prisma.$transaction(async (prisma) => {
        if (action === "upvote") {
          const existingUpvote = await prisma.userUpvotes.findUnique(userVote);

          if (existingUpvote) {
            await prisma.userUpvotes.delete(userVote);
            await prisma.voice.update({
              where: { id: voiceId },
              data: { score: { decrement: 1 } },
            });
          } else {
            await prisma.userUpvotes.create({
              data: {
                userId,
                voiceId,
              },
            });
            await prisma.userDownvotes.delete(userVote);
          }
        } else if (action === "downvote") {
          const existingDownvote =
            await prisma.userDownvotes.findUnique(userVote);

          if (existingDownvote) {
            await prisma.userDownvotes.delete(userVote);
            await prisma.voice.update({
              where: { id: voiceId },
              data: { score: { increment: 1 } },
            });
          } else {
            await prisma.userDownvotes.create({
              data: {
                userId,
                voiceId,
              },
            });
            await prisma.userUpvotes.delete(userVote);
          }
        }
      });
    }),
});
