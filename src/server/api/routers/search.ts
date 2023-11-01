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
      const characterModelsPromise = ctx.prisma.wacraftNpcDisplay.findMany({
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

      return {
        npcs,
        characterModels,
      };
    }),
});
