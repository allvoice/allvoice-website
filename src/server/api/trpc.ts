/**
 * YOU PROBABLY DON'T NEED TO EDIT THIS FILE, UNLESS:
 * 1. You want to modify request context (see Part 1).
 * 2. You want to create a new middleware or type of procedure (see Part 3).
 *
 * TL;DR - This is where all the tRPC server stuff is created and plugged in. The pieces you will
 * need to use are documented accordingly near the end.
 */

/**
 * 1. CONTEXT
 *
 * This section defines the "contexts" that are available in the backend API.
 *
 * These allow you to access things when processing a request, like the database, the session, etc.
 */
import { type CreateNextContextOptions } from "@trpc/server/adapters/next";
import { getAuth } from "@clerk/nextjs/server";
import { TRPCError, initTRPC } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import { prisma } from "~/server/db";

/**
 * This is the actual context you will use in your router. It will be used to process every request
 * that goes through your tRPC endpoint.
 *
 * @see https://trpc.io/docs/context
 */
export const createTRPCContext = (opts: CreateNextContextOptions) => {
  const { req } = opts;
  const clerk = getAuth(req);
  const tempUserId = req.headers["x-temp-user-id"] as string | undefined;

  if (clerk.userId) {
    // Verified user
    return {
      prisma,
      userId: clerk.userId,
      tempId: tempUserId,
      userVerified: true,
    };
  } else if (tempUserId) {
    // Temporary user
    return {
      prisma,
      userId: tempUserId,
      userVerified: false,
    };
  } else {
    // No user
    return {
      prisma,
    };
  }
};

/**
 * 2. INITIALIZATION
 *
 * This is where the tRPC API is initialized, connecting the context and transformer. We also parse
 * ZodErrors so that you get typesafety on the frontend if your procedure fails due to validation
 * errors on the backend.
 */

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

/**
 * 3. ROUTER & PROCEDURE (THE IMPORTANT BIT)
 *
 * These are the pieces you use to build your tRPC API. You should import these a lot in the
 * "/src/server/api/routers" directory.
 */

/**
 * This is how you create new routers and sub-routers in your tRPC API.
 *
 * @see https://trpc.io/docs/router
 */
export const createTRPCRouter = t.router;

export const publicProcedure = t.procedure;

const enforceAnyUser = t.middleware(async ({ ctx, next }) => {
  if (ctx.userVerified == undefined) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
    });
  }

  if (ctx.userVerified == false) {
    return next({
      ctx: {
        userId: ctx.userId,
        userVerified: false,
      },
    });
  }

  // user is verified
  return next({
    ctx: {
      userId: ctx.userId,
      tempId: ctx.tempId as string,
      userVerified: true,
    },
  });
});
export const anyUserProcedure = t.procedure.use(enforceAnyUser);

const enforceVerifiedUser = t.middleware(async ({ ctx, next }) => {
  if (ctx.userVerified == undefined || ctx.userVerified == false) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
    });
  }

  return next({
    ctx: {
      userId: ctx.userId,
      tempId: ctx.tempId,
      userVerified: true,
    },
  });
});

export const verifiedUserProcedure = t.procedure.use(enforceVerifiedUser);
