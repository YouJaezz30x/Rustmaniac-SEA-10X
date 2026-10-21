import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isGameServer } from "@/lib/server-auth";

/** Pending in-game grants for the RustmaniacStore plugin. */
export async function GET(req: Request) {
  if (!isGameServer(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const deliveries = await prisma.delivery.findMany({
    where: { status: "PENDING", attempts: { lt: 5 } },
    orderBy: { createdAt: "asc" },
    take: 25,
    select: { id: true, steamId: true, tier: true, days: true },
  });
  return NextResponse.json({ deliveries });
}
