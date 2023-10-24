import { createTRPCRouter } from "~/server/api/trpc";
import { voicesRouter } from "./routers/voices";
import { filesRouter } from "~/server/api/routers/files";
import { usersRouter } from "./routers/users";
import { warcraftRouter } from "./routers/warcraft";
import { searchRouter } from "./routers/search";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  search: searchRouter,
  voices: voicesRouter,
  files: filesRouter,
  users: usersRouter,
  warcraft: warcraftRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
