import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isGameServer } from "@/lib/server-auth";

const schema = z.object({
  links: z
    .array(
      z.object({
        steamId: z.string().regex(/^\d{17}$/),
        discordId: z.string().regex(/^\d{5,25}$/),
        discordName: z.string().max(100).nullable().optional(),
      })
    )
    .max(5000),
});

/** In-game /link results: attaches each Discord account to the website user with that Steam ID. */
export async function POST(req: Request) {
  if (!isGameServer(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  let users = 0;
  for (const link of parsed.data.links) {
    const discordName = link.discordName ?? null;
    await prisma.discordLink.upsert({
      where: { steamId: link.steamId },
      create: { steamId: link.steamId, discordId: link.discordId, discordName },
      update: { discordId: link.discordId, discordName },
    });
    const updated = await prisma.user.updateMany({
      where: { steamId: link.steamId, OR: [{ discordId: null }, { discordId: { not: link.discordId } }] },
      data: { discordId: link.discordId, discordName },
    });
    users += updated.count;
  }
  return NextResponse.json({ ok: true, links: parsed.data.links.length, usersUpdated: users });
}
