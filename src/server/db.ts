import { PrismaClient } from "@prisma/client";

import { env } from "~/env.mjs";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      env.DATABASE_LOG_LEVEL === "INFO"
        ? ["query", "error", "warn"]
        : env.DATABASE_LOG_LEVEL === "WARN"
          ? ["error", "warn"]
          : ["error"],
  });

if (env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
