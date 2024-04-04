import { createTRPCRouter, anyUserProcedure } from "~/server/api/trpc";
import { z } from "zod";
import { usernameSchema } from "~/utils/schema";
import { clerkClient } from "@clerk/nextjs";
import { env } from "process";

export const usersRouter = createTRPCRouter({
  syncUser: anyUserProcedure
    .input(
      z.object({
        clerkIsSignedIn: z.boolean().optional(), // convenient way to retrigger sync on state change
      }),
    )
    .query(async ({ ctx }) => {
      if (ctx.userVerified === true) {
        const clerkId = ctx.userId;
        const tempId = ctx.tempId!;

        let user = await ctx.prisma.user.findUnique({
          where: { id: clerkId },
        });

        // try upgrading the tempuser
        if (!user) {
          user = await ctx.prisma.user.findUnique({
            where: { id: tempId },
          });

          if (user) {
            user = await ctx.prisma.user.update({
              where: { id: tempId },
              data: {
                id: clerkId,
                elevenlabsCharacterQuota: 100_000,
              },
            });
          }
        }

        // there was no tempuser, make a new user
        if (!user) {
          user = await ctx.prisma.user.create({
            data: {
              id: clerkId,
              elevenlabsCharacterQuota: 100_000,
            },
          });
        }

        if (
          user.elevenlabsCharacterQuota === 0 ||
          user.elevenlabsCharacterQuota === 30_000
        ) {
          user = await ctx.prisma.user.update({
            where: { id: clerkId },
            data: { elevenlabsCharacterQuota: 100_000 }, // everyones getting 100,000 characters to play with <3
          });
        }

        return user;
      }

      const tempId = ctx.userId;
      let user = await ctx.prisma.user.findUnique({
        where: { id: tempId },
      });

      if (!user) {
        user = await ctx.prisma.user.create({
          data: {
            id: tempId,
          },
        });
      }

      return user;
    }),

  // TODO: change this to use frontend username update from useUser
  updateUser: anyUserProcedure
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
