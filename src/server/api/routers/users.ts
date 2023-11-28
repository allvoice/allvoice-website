import { createTRPCRouter, privateProcedure } from "~/server/api/trpc";
import { z } from "zod";
import { usernameSchema } from "~/utils/schema";

export const usersRouter = createTRPCRouter({
  getUserDetails: privateProcedure.query(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUniqueOrThrow({
      where: { id: ctx.userId },
    });

    return { username: user.username };
  }),

  updateUser: privateProcedure
    .input(z.object({ username: usernameSchema }))
    .mutation(async ({ ctx, input }) => {
      const { username } = input;
      const { userId } = ctx;

      const existingUser = await ctx.prisma.user.findUnique({
        where: { username },
      });

      if (existingUser) {
        return {
          error: "username",
          message: "Username is already taken",
        };
      }

      const user = await ctx.prisma.user.update({
        where: { id: userId },
        data: { username },
      });

      return {
        username: user.username,
      };
    }),
});
