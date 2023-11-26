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
          sortType: z.enum(["newest", "popular"]).optional().default("popular"),
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
          uniqueWarcraftNpc: true,

          ...(ctx.userId
            ? {
                votes: { where: { userId: ctx.userId } },
              }
            : {}),
          ...(ctx.userId
            ? {
                userFavoriteJoins: { where: { userId: ctx.userId } },
              }
            : {}),
        },
        orderBy: {
          ...(input?.sortType === "newest"
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
        where: {
          id: input.voiceModelId,
          published: false,
          voice: { ownerUserId: ctx.userId },
        },
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
        include: {
          soundFileJoins: { include: { seedSound: true } },
          voice: true,
        },
      });

      const seedBucketKeys = voiceModel.soundFileJoins.map(
        (join) => join.seedSound.bucketKey,
      );

      let textToGenerate;
      if (voiceModel.voice.uniqueWarcraftNpcId) {
        const uniqueNpc = await ctx.prisma.uniqueWarcraftNpc.findUnique({
          where: { id: voiceModel.voice.uniqueWarcraftNpcId },
          include: {
            npcs: {
              include: { rawVoicelines: { select: { text: true }, take: 1 } },
              take: 1,
            },
          },
        });
        textToGenerate = uniqueNpc?.npcs?.[0]?.rawVoicelines?.[0]?.text;
      } else if (voiceModel.voice.wacraftNpcDisplayId) {
        const warcraftNpcDisplay =
          await ctx.prisma.wacraftNpcDisplay.findUnique({
            where: { id: voiceModel.voice.wacraftNpcDisplayId },
            include: {
              npcs: {
                include: {
                  npc: {
                    include: {
                      rawVoicelines: { select: { text: true }, take: 1 },
                    },
                  },
                },
                take: 1,
              },
            },
          });
        textToGenerate =
          warcraftNpcDisplay?.npcs?.[0]?.npc?.rawVoicelines?.[0]?.text;
      }

      if (!textToGenerate) {
        throw new Error(
          "Could not find text to generate. Select a character model or npc.",
        );
      }
      const firstSentence = textToGenerate.split(/(?<=[.!?])\s/)[0];

      if (!firstSentence) {
        throw new Error(
          "First sentence regex failed for text: " + textToGenerate,
        );
      }
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
          text: firstSentence,
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
        where: { id: input.voiceModelId, published: false },
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
      // idk if this is absuse, but this effectively checks user perms
      await ctx.prisma.voiceModel.findFirstOrThrow({
        where: {
          id: input.voiceModelId,
          published: false,
          voice: { ownerUserId: ctx.userId },
        },
      });

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

      const existingVote = await ctx.prisma.vote.findUnique(userVote);

      if (action === "upvote") {
        if (!existingVote) {
          await ctx.prisma.$transaction([
            ctx.prisma.vote.create({
              data: {
                type: "UPVOTE",
                voice: { connect: { id: voiceId } },
                user: { connect: { id: userId } },
              },
            }),
            ctx.prisma.voice.update({
              where: { id: voiceId },
              data: { score: { increment: 1 } },
            }),
          ]);
        } else if (existingVote.type === "UPVOTE") {
          await ctx.prisma.$transaction([
            ctx.prisma.vote.delete(userVote),
            ctx.prisma.voice.update({
              where: { id: voiceId },
              data: { score: { decrement: 1 } },
            }),
          ]);
        } else if (existingVote.type === "DOWNVOTE") {
          await ctx.prisma.$transaction([
            ctx.prisma.vote.update({
              ...userVote,
              data: { type: "UPVOTE" },
            }),
            ctx.prisma.voice.update({
              where: { id: voiceId },
              data: { score: { increment: 2 } },
            }),
          ]);
        }
      } else if (action === "downvote") {
        if (!existingVote) {
          await ctx.prisma.$transaction([
            ctx.prisma.vote.create({
              data: {
                type: "DOWNVOTE",
                voice: { connect: { id: voiceId } },
                user: { connect: { id: userId } },
              },
            }),
            ctx.prisma.voice.update({
              where: { id: voiceId },
              data: { score: { decrement: 1 } },
            }),
          ]);
        } else if (existingVote.type === "DOWNVOTE") {
          await ctx.prisma.$transaction([
            ctx.prisma.vote.delete(userVote),
            ctx.prisma.voice.update({
              where: { id: voiceId },
              data: { score: { increment: 1 } },
            }),
          ]);
        } else if (existingVote.type === "UPVOTE") {
          await ctx.prisma.$transaction([
            ctx.prisma.vote.update({
              ...userVote,
              data: { type: "DOWNVOTE" },
            }),
            ctx.prisma.voice.update({
              where: { id: voiceId },
              data: { score: { decrement: 2 } },
            }),
          ]);
        }
      }
    }),

  bookmarkVoice: privateProcedure
    .input(
      z.object({
        voiceId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { voiceId } = input;
      const { userId } = ctx;

      const existingBookmark = await ctx.prisma.userFavorites.findUnique({
        where: {
          userId_voiceId: {
            userId,
            voiceId,
          },
        },
      });

      if (!existingBookmark) {
        await ctx.prisma.userFavorites.create({
          data: {
            voice: { connect: { id: voiceId } },
            user: { connect: { id: userId } },
          },
        });
      } else {
        await ctx.prisma.userFavorites.delete({
          where: {
            userId_voiceId: {
              userId,
              voiceId,
            },
          },
        });
      }
    }),

  forkVoice: privateProcedure
    .input(
      z.object({
        voiceId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { voiceId } = input;
      const { userId } = ctx;

      const voiceToBeForked = await ctx.prisma.voice.findUniqueOrThrow({
        where: {
          id: voiceId,
        },
      });

      const newVoice = await ctx.prisma.voice.create({
        data: {
          ownerUser: { connect: { id: userId } },
          forkParent: { connect: { id: voiceToBeForked.id } },
          ...(voiceToBeForked.uniqueWarcraftNpcId
            ? {
                uniqueWarcraftNpc: {
                  connect: { id: voiceToBeForked.uniqueWarcraftNpcId },
                },
              }
            : {}),
          ...(voiceToBeForked.wacraftNpcDisplayId
            ? {
                wacraftNpcDisplay: {
                  connect: { id: voiceToBeForked.wacraftNpcDisplayId },
                },
              }
            : {}),
        },
      });

      const voiceModels = await ctx.prisma.voiceModel.findMany({
        where: {
          voiceId: voiceId,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
        include: {
          soundFileJoins: true,
        },
      });

      const voiceModel = voiceModels[0];
      if (!voiceModel) {
        throw new Error("Voice model not found");
      }

      const newVoiceModel = await ctx.prisma.voiceModel.create({
        data: {
          voice: { connect: { id: newVoice.id } },
          forkParent: { connect: { id: voiceModel.id } },
          elevenLabsModelId: voiceModel.elevenLabsModelId,
          elevenLabsStability: voiceModel.elevenLabsStability,
          elevenLabsSimilarityBoost: voiceModel.elevenLabsSimilarityBoost,
          elevenLabsStyle: voiceModel.elevenLabsStyle,
          elevenLabsSpeakerBoost: voiceModel.elevenLabsSpeakerBoost,
          published: false,
        },
      });

      for (const seedSoundJoin of voiceModel.soundFileJoins) {
        await ctx.prisma.voiceModelSeedSounds.create({
          data: {
            voiceModel: { connect: { id: newVoiceModel.id } },
            seedSound: { connect: { id: seedSoundJoin.seedSoundId } },
            active: seedSoundJoin.active,
          },
        });
      }

      return newVoiceModel.id;
    }),
});
