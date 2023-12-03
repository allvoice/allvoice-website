import { createTRPCRouter, privateProcedure } from "~/server/api/trpc";
import { z } from "zod";
import { usernameSchema } from "~/utils/schema";
import { clerkClient } from "@clerk/nextjs";
import { env } from "process";

export const usersRouter = createTRPCRouter({
  getUserDetails: privateProcedure.query(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUniqueOrThrow({
      where: { id: ctx.userId },
    });

    return {
      characterQuota: user.elevenlabsCharacterQuota,
      characterQuotaUsed: user.elevenlabsCharacterQuotaUsed,
    };
  }),

  // TODO: change this to use frontend username update from useUser
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

      await clerkClient.users.updateUser(userId, {
        username: username,
      });

      // needed because development env doesnt have webhooks to sync
      if (env.NODE_ENV === "development") {
        await ctx.prisma.user.update({
          where: { id: userId },
          data: { username },
        });
      }

      return {
        username: username,
      };
    }),
});
