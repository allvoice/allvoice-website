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

export async function recordUsedCharacterQuota(
  userId: string,
  charactersUsed: number,
) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      elevenlabsCharacterQuotaUsed: {
        increment: charactersUsed,
      },
    },
  });
}

export async function checkCharacterQuota(
  userId: string,
  charactersToGenerate: number,
) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      elevenlabsCharacterQuota: true,
      elevenlabsCharacterQuotaUsed: true,
    },
  });

  return (
    user.elevenlabsCharacterQuota - user.elevenlabsCharacterQuotaUsed >=
    charactersToGenerate
  );
}
