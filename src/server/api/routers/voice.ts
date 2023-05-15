import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { api } from "~/utils/api";
import { username, loremIpsum } from 'react-lorem-ipsum';
import { Prisma, User } from '@prisma/client'

function createMockVoices(n: number, user: User) {
  const data: Prisma.VoiceCreateManyInput[] = [];
  for (let i = 0; i < n; i++) {
    data.push({
      ownerUserId: user.id,
      name: username(),
      likes: Math.floor(Math.random() * 1000)
    })
  }
  return data;
}

export const voiceRouter = createTRPCRouter({
  listNewest: publicProcedure
    .query(async ({ input, ctx }) => {
      // TODO: Probably want to introduce cursor pagination
      const voices = await ctx.prisma.voice.findMany({
        // orderBy: {
        //   createdAt: "desc"
        // } // TODO Re-enable once migrated
        take: 20
      });

      return voices;
    }),

  refreshMock: publicProcedure.query(async ({ input, ctx }) => {
    const user = await ctx.prisma.user.create({
      data: {}
    });

    await ctx.prisma.voice.deleteMany({});

    for (const voiceData of createMockVoices(20, user)) {
      const createdVoice = await ctx.prisma.voice.create({
        data: voiceData
      });
      if (Math.random() < .33) {
        await ctx.prisma.userLikes.create({
          data: {
            userId: user.id,
            voiceId: createdVoice.id
          }
        })
      }
    }

  })
});
