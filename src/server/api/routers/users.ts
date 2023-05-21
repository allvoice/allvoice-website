import {
  createTRPCRouter,
  privateProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { z } from "zod";

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
  likeSound: privateProcedure
    .input(z.object({ voiceId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.userLikes.create({
        data: {
          userId: ctx.userId,
          voiceId: input.voiceId,
        },
      });
    }),
  unlikeSound: privateProcedure
    .input(z.object({ voiceId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.userLikes.delete({
        where: {
          userId_voiceId: {
            voiceId: input.voiceId,
            userId: ctx.userId,
          },
        },
      });
    }),
});
