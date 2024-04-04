import { createTRPCRouter, anyUserProcedure } from "~/server/api/trpc";
import { z } from "zod";
import { usernameSchema } from "~/utils/schema";
import { clerkClient } from "@clerk/nextjs";
import { env } from "process";

export const usersRouter = createTRPCRouter({
  syncUser: anyUserProcedure
    .input(
      z.object({
        clerkIsSignedIn: z.boolean().optional(),
      }),
    )
    .query(async ({ ctx }) => {
      if (ctx.userVerified === true) {
        const clerkId = ctx.userId;
        const tempId = ctx.tempId;
        if (!tempId) return;

        const clerkUser = await ctx.prisma.user.findUnique({
          where: { id: clerkId },
        });

        const tempUser = await ctx.prisma.user.findUnique({
          where: { id: tempId },
          include: {
            favorites: true,
            votes: true,
            voices: true,
            seedSounds: true,
          },
        });

        if (clerkUser && tempUser) {
          const transferData = [
            // Transfer non-duplicate favorites
            ctx.prisma.favorite.createMany({
              data: tempUser.favorites.map((favorite) => ({
                userId: clerkId,
                voiceId: favorite.voiceId,
              })),
              skipDuplicates: true,
            }),
            ctx.prisma.favorite.deleteMany({
              where: { userId: tempId },
            }),
            // Transfer non-duplicate votes
            ctx.prisma.vote.createMany({
              data: tempUser.votes.map((vote) => ({
                userId: clerkId,
                voiceId: vote.voiceId,
                type: vote.type,
              })),
              skipDuplicates: true,
            }),
            ctx.prisma.vote.deleteMany({
              where: { userId: tempId },
            }),
            // Transfer voices
            ctx.prisma.voice.updateMany({
              where: { ownerUserId: tempId },
              data: { ownerUserId: clerkId },
            }),
            // Transfer seed sounds
            ctx.prisma.seedSound.updateMany({
              where: { uploaderId: tempId },
              data: { uploaderId: clerkId },
            }),
            // Delete the temp user after transferring the data
            ctx.prisma.user.delete({
              where: { id: tempId },
            }),
          ];

          await ctx.prisma.$transaction(transferData);

          return await ctx.prisma.user.findUnique({
            where: { id: clerkId },
          });
        } else if (tempUser) {
          // Only temp user exists, upgrade the temp user
          const upgradedUser = await ctx.prisma.user.update({
            where: { id: tempId },
            data: {
              id: clerkId,
              elevenlabsCharacterQuota: 100_000,
            },
          });

          return upgradedUser;
        } else if (clerkUser) {
          // Clerk user exists but temp user doesn't
          return clerkUser;
        } else {
          // Neither Clerk user nor temp user exists, create a new user
          const newUser = await ctx.prisma.user.create({
            data: {
              id: clerkId,
              elevenlabsCharacterQuota: 100_000,
            },
          });

          return newUser;
        }
      }

      // User is not verified, handle temp user logic
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
