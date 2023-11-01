import { z } from "zod";
import {
  createTRPCRouter,
  privateProcedure,
  publicProcedure,
} from "~/server/api/trpc";

export const warcraftRouter = createTRPCRouter({
  getAllWarcraftVoiceNameOptions: privateProcedure.query(async ({ ctx }) => {
    const results = await ctx.prisma.wacraftNpcDisplay.findMany({
      select: {
        voiceName: true,
        id: true,
        npcs: {
          select: {
            npcId: true, // select npcId for each related record
          },
        },
      },
    });

    return results.map((result) => ({
      label: result.voiceName,
      value: result.id,
      npcsCount: result.npcs.length, // count the number of related records
    }));
  }),

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
            include: { displays: { include: { display: true } } },
          },
        },
      });

      const npcIds = uniqueNPC?.npcs.map((npc) => npc.npcId);

      return {
        name: uniqueNPC.name,
        npcIds: npcIds,
      };
    }),
});
