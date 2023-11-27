import { createTRPCRouter, privateProcedure } from "~/server/api/trpc";
import { z } from "zod";

export const usersRouter = createTRPCRouter({
  updateUsername: privateProcedure
    .input(z.object({ username: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { username } = input;
      const { userId } = ctx;

      const existingUser = await ctx.prisma.user.findUnique({
        where: { username },
      });

      if (existingUser) {
        throw new Error("Username is already taken");
      }

      await ctx.prisma.user.update({
        where: { id: userId },
        data: { username },
      });
    }),
});
