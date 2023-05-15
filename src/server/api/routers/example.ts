import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

import { testUploadGetDelete } from "~/server/s3";

export const exampleRouter = createTRPCRouter({
  hello: publicProcedure
    .input(z.object({ text: z.string() }))
    .query(async ({ input, ctx }) => {
      await ctx.prisma.voiceModel.findFirst({
        include: {
          supportedLanguageJoins: {
            include: {
              language: true,
            },
          },
        },
      });

      await testUploadGetDelete();
      return {
        greeting: `Hello ${input.text}`,
      };
    }),
});
