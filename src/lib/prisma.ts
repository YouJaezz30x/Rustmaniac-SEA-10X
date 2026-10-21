import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

function resolveDatabaseUrl(): string | undefined {
  const url = process.env.DATABASE_URL;
  if (!url) return url;

  // On Vercel, the deployment FS is read-only — copy seeded SQLite to /tmp.
  if (process.env.VERCEL && url.startsWith("file:")) {
    const dest = "/tmp/rustmaniac.db";
    const candidates = [
      path.join(process.cwd(), "prisma", "dev.db"),
      path.join(__dirname, "..", "..", "prisma", "dev.db"),
    ];
    if (!fs.existsSync(dest)) {
      for (const src of candidates) {
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, dest);
          break;
        }
      }
    }
    return `file:${dest}`;
  }
  return url;
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function makeClient() {
  const datasourceUrl = resolveDatabaseUrl();
  return new PrismaClient({
    datasources: datasourceUrl ? { db: { url: datasourceUrl } } : undefined,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? makeClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
