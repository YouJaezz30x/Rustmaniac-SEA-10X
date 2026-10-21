import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isGameServer } from "@/lib/server-auth";

const schema = z.object({
  hostname: z.string().max(200),
  online: z.number().int().min(0),
  maxPlayers: z.number().int().min(0),
  sleepers: z.number().int().min(0),
  queued: z.number().int().min(0),
  joining: z.number().int().min(0),
  worldSize: z.number().int().min(0),
  seed: z.number().int(),
  wipedAt: z.string().datetime().nullable().optional(),
  nextWipe: z.string().datetime().nullable().optional(),
});

export async function POST(req: Request) {
  if (!isGameServer(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { wipedAt, nextWipe, ...rest } = parsed.data;
  const data = {
    ...rest,
    wipedAt: wipedAt ? new Date(wipedAt) : null,
    nextWipe: nextWipe ? new Date(nextWipe) : null,
  };
  await prisma.serverStatus.upsert({ where: { id: "main" }, create: { id: "main", ...data }, update: data });
  return NextResponse.json({ ok: true });
}
