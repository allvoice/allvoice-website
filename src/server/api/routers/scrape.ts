import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const scrapeRouter = createTRPCRouter({
  uploadWOWData: publicProcedure
    .input(
      z.object({
        text: z.string(),
        textLanguageName: z.string().optional(),
        textLanguageId: z.string().optional(),

        source: z.enum(["accept", "progress", "complete", "gossip"]),

        questName: z.string().optional(),
        questId: z.number().optional(),

        entityId: z.number().optional(),
        entityName: z.string().optional(),
        entitySex: z.enum(["male", "female"]).optional(),
        entityRaceId: z.number().optional(),
        entityModelId: z.number().optional(),

        playerName: z.string(),
        playerSex: z.enum(["male", "female"]),
        playerRace: z.string(),
        playerClass: z.string(),

        clientVersion: z.string(),
        clientLanguageISO: z.string(),
      }),
    )
    .mutation(() => {}),
});
