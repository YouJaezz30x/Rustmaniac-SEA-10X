import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { consumeOAuthState } from "@/lib/auth-cookies";
import { fetchDiscordUser } from "@/lib/discord";
import { siteUrl } from "@/lib/steam";
import { requireUser } from "@/lib/session";

function back(path: string) {
  return NextResponse.redirect(`${siteUrl()}${path}`);
}

export async function GET(req: Request) {
  const session = await requireUser();
  if (!session) return back("/login");

  const query = new URL(req.url).searchParams;
  const code = query.get("code");
  if (!(await consumeOAuthState(query.get("state"))) || !code) return back("/account?error=discord");

  const discord = await fetchDiscordUser(code);
  if (!discord) return back("/account?error=discord");

  const owner = await prisma.user.findUnique({ where: { discordId: discord.id } });
  if (owner && owner.id !== session.user.id) return back("/account?error=discord-taken");

  await prisma.user.update({
    where: { id: session.user.id },
    data: { discordId: discord.id, discordName: discord.name },
  });
  return back("/account?linked=discord");
}
