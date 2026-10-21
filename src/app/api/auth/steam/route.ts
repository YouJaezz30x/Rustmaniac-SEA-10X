import { NextResponse } from "next/server";
import { createOAuthState } from "@/lib/auth-cookies";
import { siteUrl, steamLoginUrl } from "@/lib/steam";
import { requireUser } from "@/lib/session";

/** Starts Steam sign-in (?mode=login) or links Steam to the signed-in account (?mode=link). */
export async function GET(req: Request) {
  const mode = new URL(req.url).searchParams.get("mode") === "link" ? "link" : "login";
  if (mode === "link" && !(await requireUser())) {
    return NextResponse.redirect(`${siteUrl()}/login`);
  }
  const state = await createOAuthState();
  const returnTo = `${siteUrl()}/api/auth/steam/callback?mode=${mode}&state=${state}`;
  return NextResponse.redirect(steamLoginUrl(returnTo));
}
