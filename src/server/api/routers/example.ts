import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

import { testUploadGetDelete } from "~/server/s3";

export const exampleRouter = createTRPCRouter({
  hello: publicProcedure
    .input(z.object({ text: z.string() }))
    .query(async ({ input }) => {
      await testUploadGetDelete();
      return {
        greeting: `Hello ${input.text}`,
      };
    }),
});
