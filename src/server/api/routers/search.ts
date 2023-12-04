import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const searchRouter = createTRPCRouter({
  search: publicProcedure
    .input(
      z.object({
        query: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      if (input.query == "") {
        return {
          npcs: [],
          characterModels: [],
        };
      }

      const npcsPromise = ctx.prisma.uniqueWarcraftNpc.findMany({
        where: {
          name: {
            search: `*${input.query}*`,
          },
        },
        orderBy: {
          _relevance: {
            fields: ["name"],
            search: input.query,
            sort: "asc",
          },
        },
      });
      const characterModelsPromise = ctx.prisma.warcraftNpcDisplay.findMany({
        where: {
          OR: [
            {
              voiceName: {
                search: `*${input.query}*`,
              },
            },
            {
              voiceName: {
                search: `*${input.query.replace(/\s+/g, "")}*`,
              },
            },
          ],
        },
        include: {
          npcs: {
            include: {
              npc: { select: { uniqueWarcraftNpcId: true } },
            },
          },
        },

        orderBy: {
          _relevance: {
            fields: ["voiceName"],
            search: input.query,
            sort: "asc",
          },
        },
      });

      const [npcs, characterModels] = await Promise.all([
        npcsPromise,
        characterModelsPromise,
      ]);

      const uniqueNpcIds = new Set(npcs.map((npc) => npc.id));

      const filteredModels = characterModels.filter((model) => {
        const uniqueModelNpcIds = new Set(
          model.npcs.map((npc) => npc.npc.uniqueWarcraftNpcId),
        );
        if (uniqueModelNpcIds.size !== 1) {
          return true;
        }
        const [uniqueModelNpcId] = uniqueModelNpcIds;
        return !uniqueNpcIds.has(uniqueModelNpcId!);
      });

      return {
        npcs,
        characterModels: filteredModels,
      };
    }),
});
