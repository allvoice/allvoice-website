import { z } from "zod";
import {
  createTRPCRouter,
  publicProcedure,
} from "~/server/api/trpc";

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
