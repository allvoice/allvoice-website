import { createTRPCRouter, privateProcedure } from "~/server/api/trpc";

export const warcraftRouter = createTRPCRouter({
  getAllWarcraftVoiceNameOptions: privateProcedure.query(async ({ ctx }) => {
    const results = await ctx.prisma.wacraftNpcDisplay.findMany({
      select: { voiceName: true, id: true },
    });

    return results.map((result) => ({
      label: result.voiceName,
      value: result.id,
    }));
  }),
});
