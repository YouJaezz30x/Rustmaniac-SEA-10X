import { NextResponse } from "next/server";
import { BRAND } from "@/lib/brand";

/**
 * Steam OpenID stub — requires STEAM_API_KEY.
 * Full Steam OpenID flow can be wired with next-auth Steam provider or openid-client.
 */
export async function GET() {
  if (!process.env.STEAM_API_KEY) {
    return NextResponse.json(
      {
        configured: false,
        message:
          "Steam login is not configured. Set STEAM_API_KEY from https://steamcommunity.com/dev/apikey and restart the app.",
        docs: "https://steamcommunity.com/dev/apikey",
        returnHint: `${process.env.NEXTAUTH_URL ?? BRAND.server}/api/auth/callback/steam`,
      },
      { status: 501 }
    );
  }

  // Placeholder redirect target once OpenID is wired
  return NextResponse.json({
    configured: true,
    message: "Steam API key present. Wire OpenID realm/return_to against NEXTAUTH_URL.",
  });
}
