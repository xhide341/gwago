import "dotenv/config";
import { PrismaClient } from "../../generated/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Re-export all types/enums from generated client for convenience
export * from "../../generated/client";

// Singleton pattern — prevents multiple Prisma instances in dev (hot reload)
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient;
  adapter: PrismaPg;
};

if (!globalForPrisma.adapter && process.env.DATABASE_URL) {
  globalForPrisma.adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  });
}

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({ adapter: globalForPrisma.adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
