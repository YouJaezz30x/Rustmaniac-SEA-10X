import { cookies } from "next/headers";
import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { prisma } from "./prisma";

const CSRF_COOKIE = "rm_csrf";

export async function ensureCsrfToken(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(CSRF_COOKIE)?.value;
  if (existing) return existing;
  const token = randomBytes(32).toString("hex");
  jar.set(CSRF_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  return token;
}

export async function requireCsrf(headerToken: string | null): Promise<boolean> {
  const jar = await cookies();
  const cookieToken = jar.get(CSRF_COOKIE)?.value;
  if (!cookieToken || !headerToken) return false;
  const a = Buffer.from(cookieToken);
  const b = Buffer.from(headerToken);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ ok: boolean; remaining: number }> {
  const id = createHash("sha256").update(key).digest("hex").slice(0, 32);
  const now = new Date();
  const existing = await prisma.rateLimitBucket.findUnique({ where: { id } });

  if (!existing || existing.resetAt <= now) {
    const resetAt = new Date(now.getTime() + windowMs);
    await prisma.rateLimitBucket.upsert({
      where: { id },
      create: { id, count: 1, resetAt },
      update: { count: 1, resetAt },
    });
    return { ok: true, remaining: limit - 1 };
  }

  if (existing.count >= limit) {
    return { ok: false, remaining: 0 };
  }

  await prisma.rateLimitBucket.update({
    where: { id },
    data: { count: existing.count + 1 },
  });
  return { ok: true, remaining: limit - existing.count - 1 };
}

export function sanitizeText(input: string, max = 2000): string {
  return input.replace(/[<>]/g, "").trim().slice(0, max);
}
