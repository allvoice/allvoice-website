import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { TRPCError } from "@trpc/server";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { env } from "~/env.mjs";
import { anyUserProcedure, createTRPCRouter } from "~/server/api/trpc";
import { getPublicUrl, s3Client } from "~/server/s3";

export const filesRouter = createTRPCRouter({
  createUploadUrl: anyUserProcedure
    .input(
      z.object({
        fileName: z.string().max(191),
        voiceModelId: z.string(),
        active: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.voiceModel.findUniqueOrThrow({
        where: {
          voice: {
            ownerUserId: ctx.userId,
          },
          id: input.voiceModelId,
        },
      });

      const existingFile = await ctx.prisma.seedSound.findFirst({
        where: {
          name: input.fileName,
          voiceModelJoins: {
            some: {
              voiceModelId: input.voiceModelId,
            },
          },
        },
      });

      if (existingFile) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `file with the name "${input.fileName}" already exists for this voice model.`,
        });
      }

      const key = "seed/" + uuidv4();

      const command = new PutObjectCommand({
        Bucket: env.BUCKET_NAME,
        Key: key,
      });

      const dbFile = await ctx.prisma.seedSound.create({
        data: {
          bucketKey: key,
          name: input.fileName,
          uploader: {
            connect: {
              id: ctx.userId,
            },
          },
          voiceModelJoins: {
            create: {
              voiceModel: { connect: { id: input.voiceModelId } },
              active: input.active,
            },
          },
          uploadComplete: env.NODE_ENV == "development" ? true : false, // no notification to set this on local dev
        },
      });

      return {
        fileId: dbFile.id,
        uploadUrl: await getSignedUrl(s3Client, command, { expiresIn: 3600 }),
        active: input.active,
      };
    }),

  getSeedSound: anyUserProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const seedSound = await ctx.prisma.seedSound.findUniqueOrThrow({
        where: { id: input.id },
      });

      const publicUrl = getPublicUrl(seedSound.bucketKey);
      return {
        id: seedSound.id,
        bucketKey: seedSound.bucketKey,
        name: seedSound.name,
        uploadComplete: seedSound.uploadComplete,
        publicUrl: publicUrl,
      };
    }),

  deleteSeedSoundForVoiceModel: anyUserProcedure
    .input(z.object({ seedSoundId: z.string(), voiceModelId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.voiceModel.findUniqueOrThrow({
        where: {
          voice: {
            ownerUserId: ctx.userId,
          },
          id: input.voiceModelId,
        },
      });

      await ctx.prisma.voiceModelSeedSounds.delete({
        where: {
          voiceModelId_seedSoundId: {
            seedSoundId: input.seedSoundId,
            voiceModelId: input.voiceModelId,
          },
        },
      });

      // TODO: implement cleanup for unused seed sounds
    }),
});
