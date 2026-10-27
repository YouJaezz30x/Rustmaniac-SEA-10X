import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isGameServer } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

// The streamer's vitals for the /live overlay. Kept as JSON in its own ServerStatus row so no schema change is needed;
// the site only ever reads the "main" row for the server status card.
const ROW = "live-vitals";

const schema = z.object({
  name: z.string().max(64),
  online: z.boolean(),
  alive: z.boolean(),
  wounded: z.boolean(),
  sleeping: z.boolean(),
  health: z.number().min(0).max(1000),
  maxHealth: z.number().min(1).max(1000),
  food: z.number().min(0).max(1000),
  water: z.number().min(0).max(1000),
  radiation: z.number().min(0).max(1000),
});

export async function POST(req: Request) {
  if (!isGameServer(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const data = { hostname: JSON.stringify(parsed.data), online: 0, maxPlayers: 0, sleepers: 0, queued: 0, joining: 0, worldSize: 0, seed: 0 };
  await prisma.serverStatus.upsert({ where: { id: ROW }, create: { id: ROW, ...data }, update: data });
  return NextResponse.json({ ok: true });
}

export async function GET() {
  const row = await prisma.serverStatus.findUnique({ where: { id: ROW } }).catch(() => null);
  const headers = { "Cache-Control": "no-store" };
  if (!row) return NextResponse.json({ ok: false }, { headers });
  let vitals: unknown = null;
  try {
    vitals = JSON.parse(row.hostname);
  } catch {
    return NextResponse.json({ ok: false }, { headers });
  }
  return NextResponse.json({ ok: true, vitals, updatedAt: row.updatedAt.toISOString() }, { headers });
}
