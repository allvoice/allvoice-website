import { createTRPCRouter, privateProcedure } from "~/server/api/trpc";

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
});
