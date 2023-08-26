import {
  createTRPCRouter,
  privateProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { z } from "zod";
import { decrementVoiceLikes, incrementVoiceLikes } from "~/server/db";

export const usersRouter = createTRPCRouter({
  listLikedSounds: publicProcedure.query(async ({ ctx }) => {
    const userId = ctx.userId;
    if (!userId) return new Set();

    const likedSounds = await ctx.prisma.userLikes.findMany({
      where: {
        userId,
      },
    });
    return new Set(likedSounds.map((likedSound) => likedSound.voiceId));
  }),
  toggleLiked: privateProcedure
    .input(z.object({ voiceId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const currentlyLiked = await ctx.prisma.userLikes.findFirst({
        where: {
          voiceId: input.voiceId,
          userId: ctx.userId,
        },
      });
      if (currentlyLiked) {
        await ctx.prisma.userLikes.delete({
          where: {
            userId_voiceId: {
              voiceId: input.voiceId,
              userId: ctx.userId,
            },
          },
        });
        await decrementVoiceLikes(input.voiceId);
        return { liked: false };
      } else {
        await ctx.prisma.userLikes.create({
          data: {
            userId: ctx.userId,
            voiceId: input.voiceId,
          },
        });
        await incrementVoiceLikes(input.voiceId);
        return { liked: true };
      }
    }),
});
