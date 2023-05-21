import { createTRPCRouter } from "~/server/api/trpc";
import { exampleRouter } from "~/server/api/routers/example";
import { voicesRouter } from "./routers/voices";
import { filesRouter } from "~/server/api/routers/files";
import { usersRouter } from "./routers/users";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  example: exampleRouter,
  voices: voicesRouter,
  files: filesRouter,
  users: usersRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
