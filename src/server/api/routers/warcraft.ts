import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const warcraftRouter = createTRPCRouter({
  getUniqueNPC: publicProcedure
    .input(
      z.object({
        uniqueNPCId: z.string().min(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      const uniqueNPC = await ctx.prisma.uniqueWarcraftNpc.findUniqueOrThrow({
        where: { id: input.uniqueNPCId },
        include: {
          npcs: {
            select: { npcId: true },
          },
        },
      });

      const npcIds = uniqueNPC?.npcs.map((npc) => npc.npcId);

      return {
        name: uniqueNPC.name,
        npcIds: npcIds,
      };
    }),

  getCharacterModel: publicProcedure
    .input(
      z.object({
        characterModelId: z.string().min(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      const characterModel =
        await ctx.prisma.warcraftNpcDisplay.findUniqueOrThrow({
          where: { id: input.characterModelId },
          include: {
            npcs: {
              include: { npc: { include: { uniqueWarcraftNpc: true } } },
            },
          },
        });

      const uniqueNpcSet = new Set();
      const uniqueNpcs: { name: string; id: string }[] = [];

      characterModel.npcs.forEach((npc) => {
        const uniqueNpcData = {
          name: npc.npc.uniqueWarcraftNpc.name,
          id: npc.npc.uniqueWarcraftNpc.id,
        };
        const uniqueNpc = JSON.stringify(uniqueNpcData);
        if (!uniqueNpcSet.has(uniqueNpc)) {
          uniqueNpcSet.add(uniqueNpc);
          uniqueNpcs.push(uniqueNpcData);
        }
      });

      return {
        name: characterModel.voiceName,
        uniqueNpcs: uniqueNpcs,
      };
    }),
});
