import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { env } from "~/env.mjs";
import { createTRPCRouter, privateProcedure } from "~/server/api/trpc";
import { s3Client } from "~/server/s3";

export const filesRouter = createTRPCRouter({
  createUploadUrl: privateProcedure
    .input(z.object({ fileName: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const key = uuidv4();

      const command = new PutObjectCommand({
        Bucket: env.BUCKET_NAME,
        Key: key,
      });

      await ctx.prisma.seedSound.create({
        data: {
          bucketKey: key,
          name: input.fileName,
          uploaderId: ctx.userId,
          uploadComplete: env.NODE_ENV == "development" ? true : false, // no notification to set this on local dev
        },
      });

      return {
        key: key,
        uploadUrl: await getSignedUrl(s3Client, command, { expiresIn: 3600 }),
      };
    }),
});
