import { PutObjectCommand } from "@aws-sdk/client-s3";
import { clerkClient } from "@clerk/nextjs";
import { RawVoiceline } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { env } from "~/env.mjs";
import logger from "~/logger";
import {
  anyUserProcedure,
  createTRPCRouter,
  publicProcedure,
  verifiedUserProcedure,
} from "~/server/api/trpc";
import { checkCharacterQuota, recordUsedCharacterQuota } from "~/server/db";
import { elevenLabsManager } from "~/server/elevenlabs-api";
import { getPublicUrl, s3Client } from "~/server/s3";
import { voiceEditFormSchema } from "~/utils/schema";
import {
  DEFAULT_REPLACE_DICT,
  getFirstNSentences,
  getGenderSpecificRenderedText,
  renderWarcraftTemplate,
} from "~/utils/warcraft-template-util";

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
          ownerUser: {
            select: {
              id: true,
              username: true,
            },
          },
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
          warcraftNpcDisplay: true,

          ...(ctx.userId
            ? {
                votes: { where: { userId: ctx.userId } },
              }
            : {}),
          ...(ctx.userId
            ? {
                favorites: { where: { userId: ctx.userId } },
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
                warcraftNpcDisplayId: input.characterModelId,
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

  getVoiceModelWorkspace: anyUserProcedure
    .input(z.object({ voiceModelId: z.string() }))
    .query(async ({ ctx, input }) => {
      const voiceModel = await ctx.prisma.voiceModel.findFirstOrThrow({
        where: { id: input.voiceModelId, voice: { ownerUserId: ctx.userId } },
        include: {
          soundFileJoins: {
            include: { seedSound: { select: { name: true } } },
          },
          voice: {
            include: {
              warcraftNpcDisplay: true,
              uniqueWarcraftNpc: true,
            },
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

      const warcraftDisplayName =
        voiceModel.voice.warcraftNpcDisplay?.voiceName;
      const uniqueWarcraftNpcName = voiceModel.voice.uniqueWarcraftNpc?.name;

      return {
        seedSounds: sortedSeedSounds,
        warcraftDisplayName,
        uniqueWarcraftNpcName,
      };
    }),
  updateWarcraftLink: anyUserProcedure
    .input(
      z.object({
        voiceModelId: z.string(),
        warcraftNpcDisplayId: z.string().optional(),
        uniqueWarcraftNpcId: z.string().optional(),
        clientSide: z
          .object({
            name: z.string().optional(), // helpful clientside for optimistic updates
          })
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.warcraftNpcDisplayId && input.uniqueWarcraftNpcId) {
        throw new Error(
          "both warcraftNpcDisplayId and uniqueWarcraftNpcId cannot be filled at the same time",
        );
      }
      const voiceModel = await ctx.prisma.voiceModel.findFirstOrThrow({
        where: {
          id: input.voiceModelId,
          voice: { ownerUserId: ctx.userId },
        },
      });

      await ctx.prisma.voice.update({
        where: {
          id: voiceModel.voiceId,
          ownerUserId: ctx.userId,
          modelVersions: {
            none: { published: true },
          },
        },
        data: {
          warcraftNpcDisplay: input.warcraftNpcDisplayId
            ? {
                connect: { id: input.warcraftNpcDisplayId },
              }
            : {
                disconnect: true,
              },
          uniqueWarcraftNpc: input.uniqueWarcraftNpcId
            ? {
                connect: { id: input.uniqueWarcraftNpcId },
              }
            : {
                disconnect: true,
              },
        },
      });
    }),

  postVoiceModel: verifiedUserProcedure
    .input(
      z.object({
        voiceModelId: z.string(),
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
        include: {
          soundFileJoins: {
            where: { active: true },
            include: { seedSound: true },
          },
        },
      });

      try {
        const user = await ctx.prisma.user.findUnique({
          where: { id: ctx.userId },
        });
        if (!user?.username) {
          const clerkUser = await clerkClient.users.getUser(ctx.userId);
          if (clerkUser.username) {
            await ctx.prisma.user.update({
              where: { id: ctx.userId },
              data: { username: clerkUser.username },
            });
          }
        }
      } catch (error) {
        logger.warn("updating user username", error);
      }
      // make auto-preview noises

      const voice = await ctx.prisma.voice.update({
        where: { id: voiceModel.voiceId },
        data: {
          name: input.voiceTitle,
        },
      });

      const seedBucketKeys = voiceModel.soundFileJoins.map(
        (join) => join.seedSound.bucketKey,
      );

      await elevenLabsManager.ensureVoiceIsLoaded({
        name: input.voiceModelId,
        bucketKeys: seedBucketKeys,
      });

      // Get a random voiceline related to the linked charactermodel or NPC
      let randomVoiceline: RawVoiceline | undefined;
      if (voice.uniqueWarcraftNpcId) {
        const uniqueNpc = await ctx.prisma.uniqueWarcraftNpc.findUnique({
          where: { id: voice.uniqueWarcraftNpcId },
          include: {
            npcs: {
              include: {
                rawVoicelines: true,
              },
            },
          },
        });
        const allVoicelines =
          uniqueNpc?.npcs.flatMap((npc) => npc.rawVoicelines) ?? [];
        randomVoiceline =
          allVoicelines[Math.floor(Math.random() * allVoicelines.length)];
      } else if (voice.warcraftNpcDisplayId) {
        const warcraftNpcDisplay =
          await ctx.prisma.warcraftNpcDisplay.findUnique({
            where: { id: voice.warcraftNpcDisplayId },
            include: {
              npcs: {
                include: {
                  npc: {
                    include: {
                      rawVoicelines: true,
                    },
                  },
                },
              },
            },
          });
        const allVoicelines =
          warcraftNpcDisplay?.npcs.flatMap((npc) => npc.npc.rawVoicelines) ??
          [];
        randomVoiceline =
          allVoicelines[Math.floor(Math.random() * allVoicelines.length)];
      }

      if (!randomVoiceline) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No voiceline could be found for the linked entity.",
        });
      }
      const renderedTexts = renderWarcraftTemplate(randomVoiceline.text, {
        class: DEFAULT_REPLACE_DICT.$c,
        name: DEFAULT_REPLACE_DICT.$n,
        race: DEFAULT_REPLACE_DICT.$r,
      });

      const { renderedText, maleOnly, femaleOnly } =
        getGenderSpecificRenderedText(renderedTexts);

      const ttsResponse = await elevenLabsManager.textToSpeechStream(
        {
          name: input.voiceModelId,
          bucketKeys: seedBucketKeys,
        },
        {
          text: renderedText,
          modelId: voiceModel.elevenLabsModelId,
          generationSettings: {
            similarity_boost: voiceModel.elevenLabsSimilarityBoost,
            stability: voiceModel.elevenLabsStability,
            style: voiceModel.elevenLabsStyle,
            use_speaker_boost: voiceModel.elevenLabsSpeakerBoost,
          },
        },
      );

      await recordUsedCharacterQuota(ctx.userId, renderedText.length);

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
          iconEmoji: "🗣️",
          bucketKey: genKey,
          voiceModel: { connect: { id: voiceModel.id } },
        },
      });

      await ctx.prisma.renderedVoiceline.create({
        data: {
          voiceModel: { connect: { id: voiceModel.id } },
          rawVoiceline: { connect: { id: randomVoiceline.id } },
          text: renderedText,
          bucketKey: genKey,

          race: DEFAULT_REPLACE_DICT.$r,
          class: DEFAULT_REPLACE_DICT.$c,
          name: DEFAULT_REPLACE_DICT.$n,
          maleOnly: maleOnly,
          femaleOnly: femaleOnly,
        },
      });

      await ctx.prisma.voiceModel.update({
        where: { id: voiceModel.id },
        data: {
          published: true,
        },
      });

      return `/voices/${voice.id}`;
    }),
  generateTestSound: verifiedUserProcedure
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
          soundFileJoins: {
            where: { active: true },
            include: { seedSound: true },
          },
          voice: true,
        },
      });

      const updateVoiceModelParamsPromise = ctx.prisma.voiceModel.update({
        where: { id: input.voiceModelId },
        data: {
          elevenLabsModelId: input.formData.modelName,
          elevenLabsSimilarityBoost: input.formData.similarity,
          elevenLabsStability: input.formData.stability,
          elevenLabsSpeakerBoost: input.formData.speakerBoost,
          elevenLabsStyle: input.formData.style,
        },
      });

      const seedBucketKeys = voiceModel.soundFileJoins.map(
        (join) => join.seedSound.bucketKey,
      );

      if (
        seedBucketKeys.length > env.NEXT_PUBLIC_ELEVENLABS_MAX_ACTIVE_SAMPLES
      ) {
        throw new Error("exceeded maximum active samples limit");
      }

      let warcraftTemplate;
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
        warcraftTemplate = uniqueNpc?.npcs?.[0]?.rawVoicelines?.[0]?.text;
      } else if (voiceModel.voice.warcraftNpcDisplayId) {
        const warcraftNpcDisplay =
          await ctx.prisma.warcraftNpcDisplay.findUnique({
            where: { id: voiceModel.voice.warcraftNpcDisplayId },
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
        warcraftTemplate =
          warcraftNpcDisplay?.npcs?.[0]?.npc?.rawVoicelines?.[0]?.text;
      }

      if (!warcraftTemplate) {
        throw new Error(
          "could not find text to generate. Select a character model or npc.",
        );
      }

      const renderedTexts = renderWarcraftTemplate(warcraftTemplate);
      const { renderedText } = getGenderSpecificRenderedText(renderedTexts);

      const textToGenerate = getFirstNSentences(renderedText, 2);

      if (!textToGenerate) {
        throw new Error(
          "first sentence regex failed for text: " + renderedText,
        );
      }

      const hasEnoughQuota = await checkCharacterQuota(
        ctx.userId,
        textToGenerate.length,
      );
      if (!hasEnoughQuota) {
        throw new Error("not enough quota to generate");
      }
      const ttsResponse = await elevenLabsManager.textToSpeechStream(
        {
          name: input.voiceModelId,
          bucketKeys: seedBucketKeys,
        },
        {
          text: textToGenerate,
          modelId: input.formData.modelName,
          generationSettings: {
            similarity_boost: input.formData.similarity,
            stability: input.formData.stability,
            style: input.formData.style,
            use_speaker_boost: input.formData.speakerBoost,
          },
        },
      );
      const recordQuotaPromise = recordUsedCharacterQuota(
        ctx.userId,
        textToGenerate.length,
      );

      const genKey = `test/${uuidv4()}`;

      await ctx.prisma.testSound.create({
        data: {
          bucketKey: genKey,
          voiceModel: { connect: { id: input.voiceModelId } },
        },
      });

      const putObjectCommand = new PutObjectCommand({
        Bucket: env.BUCKET_NAME,
        Key: genKey,
        Body: ttsResponse.stream,
        ContentLength: ttsResponse.contentLength,
        ContentType: ttsResponse.contentType,
      });

      await s3Client.send(putObjectCommand);
      await updateVoiceModelParamsPromise;
      await recordQuotaPromise;

      return getPublicUrl(genKey);
    }),

  updateVoiceGenerationSettings: anyUserProcedure
    .input(
      z.object({
        voiceModelId: z.string(),
        formData: voiceEditFormSchema.deepPartial(),
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

  updateSeedSound: anyUserProcedure
    .input(
      z.object({
        voiceModelId: z.string(),
        seedSoundId: z.string(),
        active: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // idk if this is abuse, but this effectively checks user perms
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

  rateVoice: anyUserProcedure
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

  bookmarkVoice: anyUserProcedure
    .input(
      z.object({
        voiceId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { voiceId } = input;
      const { userId } = ctx;

      const existingBookmark = await ctx.prisma.favorite.findUnique({
        where: {
          userId_voiceId: {
            userId,
            voiceId,
          },
        },
      });

      if (!existingBookmark) {
        await ctx.prisma.favorite.create({
          data: {
            voice: { connect: { id: voiceId } },
            user: { connect: { id: userId } },
          },
        });
      } else {
        await ctx.prisma.favorite.delete({
          where: {
            userId_voiceId: {
              userId,
              voiceId,
            },
          },
        });
      }
    }),

  createVoiceModel: anyUserProcedure
    .input(
      z.object({
        forkVoiceId: z.string().optional(),
        uniqueNPCId: z.string().optional(),
        characterModelId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { userId } = ctx;
      const { forkVoiceId, uniqueNPCId, characterModelId } = input;

      if (forkVoiceId) {
        // forked flow
        const voiceToBeForked = await ctx.prisma.voice.findUniqueOrThrow({
          where: {
            id: forkVoiceId,
          },
          include: {
            modelVersions: {
              orderBy: {
                createdAt: "desc",
              },
              take: 1,
              include: {
                soundFileJoins: true,
              },
            },
          },
        });

        const voiceModel = voiceToBeForked.modelVersions[0];
        if (!voiceModel) {
          throw new Error("voice model not found");
        }

        const newVoiceModel = await ctx.prisma.voiceModel.create({
          data: {
            voice: {
              create: {
                ownerUser: {
                  connectOrCreate: {
                    where: { id: userId },
                    create: { id: userId },
                  },
                },
                forkParent: { connect: { id: voiceToBeForked.id } },
                ...(voiceToBeForked.uniqueWarcraftNpcId
                  ? {
                      uniqueWarcraftNpc: {
                        connect: { id: voiceToBeForked.uniqueWarcraftNpcId },
                      },
                    }
                  : {}),
                ...(voiceToBeForked.warcraftNpcDisplayId
                  ? {
                      warcraftNpcDisplay: {
                        connect: { id: voiceToBeForked.warcraftNpcDisplayId },
                      },
                    }
                  : {}),
              },
            },
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
      } else {
        // non forked flow
        const voiceModel = await ctx.prisma.voiceModel.create({
          data: {
            voice: {
              create: {
                ownerUser: {
                  connectOrCreate: {
                    where: { id: userId },
                    create: { id: userId },
                  },
                },
                uniqueWarcraftNpc: uniqueNPCId
                  ? {
                      connect: {
                        id: uniqueNPCId,
                      },
                    }
                  : undefined,
                warcraftNpcDisplay: characterModelId
                  ? {
                      connect: {
                        id: characterModelId,
                      },
                    }
                  : undefined,
              },
            },
          },
        });

        return voiceModel.id;
      }
    }),
});
