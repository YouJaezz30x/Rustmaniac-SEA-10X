import { NextResponse } from "next/server";
import { createOAuthState } from "@/lib/auth-cookies";
import { discordAuthorizeUrl, discordConfigured } from "@/lib/discord";
import { siteUrl } from "@/lib/steam";
import { requireUser } from "@/lib/session";

export async function GET() {
  if (!(await requireUser())) return NextResponse.redirect(`${siteUrl()}/login`);
  if (!discordConfigured()) return NextResponse.redirect(`${siteUrl()}/account?error=discord-setup`);
  const state = await createOAuthState();
  return NextResponse.redirect(discordAuthorizeUrl(state));
}
