import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { env } from "~/env.mjs";
import { createTRPCRouter, privateProcedure } from "~/server/api/trpc";
import { getPublicUrl, s3Client } from "~/server/s3";

export const filesRouter = createTRPCRouter({
  createUploadUrl: privateProcedure
    .input(
      z.object({ fileName: z.string().max(191), voiceModelId: z.string() })
    )
    .mutation(async ({ ctx, input }) => {
      const key = uuidv4();

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
            create: { voiceModel: { connect: { id: input.voiceModelId } } },
          },
          uploadComplete: env.NODE_ENV == "development" ? true : false, // no notification to set this on local dev
        },
      });

      return {
        fileId: dbFile.id,
        uploadUrl: await getSignedUrl(s3Client, command, { expiresIn: 3600 }),
      };
    }),

  getSeedSound: privateProcedure
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

  deleteSeedSoundForVoiceModel: privateProcedure
    .input(z.object({ seedSoundId: z.string(), voiceModelId: z.string() }))
    .mutation(async ({ ctx, input }) => {
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
