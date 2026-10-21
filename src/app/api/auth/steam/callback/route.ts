import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { consumeOAuthState, issueSession } from "@/lib/auth-cookies";
import { fetchSteamProfile, siteUrl, verifySteamResponse } from "@/lib/steam";
import { requireUser } from "@/lib/session";

function back(path: string) {
  return NextResponse.redirect(`${siteUrl()}${path}`);
}

export async function GET(req: Request) {
  const query = new URL(req.url).searchParams;
  const mode = query.get("mode") === "link" ? "link" : "login";
  const failPath = mode === "link" ? "/account?error=steam" : "/login?error=steam";

  if (!(await consumeOAuthState(query.get("state")))) return back(failPath);
  const steamId = await verifySteamResponse(query, `${siteUrl()}/api/auth/steam/callback`);
  if (!steamId) return back(failPath);

  const [profile, discordLink] = await Promise.all([
    fetchSteamProfile(steamId),
    prisma.discordLink.findUnique({ where: { steamId } }),
  ]);
  const profileData = {
    ...(profile ? { steamName: profile.name, avatarUrl: profile.avatarUrl } : {}),
    ...(discordLink ? { discordId: discordLink.discordId, discordName: discordLink.discordName } : {}),
  };

  if (mode === "link") {
    const session = await requireUser();
    if (!session) return back("/login");
    const owner = await prisma.user.findUnique({ where: { steamId } });
    if (owner && owner.id !== session.user.id) return back("/account?error=steam-taken");
    await prisma.user.update({ where: { id: session.user.id }, data: { steamId, ...profileData } });
    return back("/account?linked=steam");
  }

  let user = await prisma.user.findUnique({ where: { steamId } });
  if (user) {
    if (Object.keys(profileData).length > 0) {
      user = await prisma.user.update({ where: { id: user.id }, data: profileData });
    }
  } else {
    user = await prisma.user.create({
      data: { steamId, name: profile?.name ?? `Survivor ${steamId.slice(-4)}`, role: "USER", ...profileData },
    });
  }

  const res = back("/account");
  await issueSession(res, user);
  return res;
}
