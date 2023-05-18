import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { api } from "~/utils/api";
import { username, loremIpsum } from "react-lorem-ipsum";
import { type Prisma, type User } from "@prisma/client";

function createMockVoices(n: number, user: User) {
  const data: Prisma.VoiceCreateManyInput[] = [];
  for (let i = 0; i < n; i++) {
    data.push({
      ownerUserId: user.id,
      name: username(),
      likes: Math.floor(Math.random() * 1000),
    });
  }
  return data;
}

export const voiceRouter = createTRPCRouter({
  listNewest: publicProcedure.query(async ({ input, ctx }) => {
    // TODO: Probably want to introduce cursor pagination
    const voices = await ctx.prisma.voice.findMany({
      include: {
        modelVersions: {
          include: {
            previewSounds: true,
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
      },
      take: 20,
    });

    return voices;
  }),

  refreshMock: publicProcedure.query(async ({ input, ctx }) => {
    const user = await ctx.prisma.user.create({
      data: {},
    });

    await ctx.prisma.userLikes.deleteMany({});
    await ctx.prisma.previewSound.deleteMany({});
    await ctx.prisma.voiceModel.deleteMany({});
    await ctx.prisma.voice.deleteMany({});

    for (const voiceData of createMockVoices(20, user)) {
      const createdVoice = await ctx.prisma.voice.create({
        data: voiceData,
      });
      if (Math.random() < 0.33) {
        await ctx.prisma.userLikes.create({
          data: {
            userId: user.id,
            voiceId: createdVoice.id,
          },
        });
      }

      for (
        let voiceModelCount = 0;
        voiceModelCount < Math.floor(Math.random() * 4) + 1;
        voiceModelCount++
      ) {
        const createdModel = await ctx.prisma.voiceModel.create({
          data: {
            voiceId: createdVoice.id,
            version: username(),
          },
        });

        const faces = ["😭", "🤬", "😁", "😐", "😰", "🥴"];
        const previewCount = Math.floor(Math.random() * 4) + 1;
        for (let i = 0; i < previewCount; i++) {
          const face = faces[Math.floor(Math.random() * faces.length)];
          await ctx.prisma.previewSound.create({
            data: {
              bucketKey: username(),
              voiceModelId: createdModel.id,
              iconEmoji: face!,
            },
          });
        }
      }
    }
  }),
});
