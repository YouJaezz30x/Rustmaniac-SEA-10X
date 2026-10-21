import { cookies } from "next/headers";
import { randomBytes, timingSafeEqual } from "crypto";
import { encode } from "next-auth/jwt";
import type { NextResponse } from "next/server";

const secure = process.env.NODE_ENV === "production";

export const SESSION_COOKIE = secure ? "__Secure-next-auth.session-token" : "next-auth.session-token";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

const STATE_COOKIE = "rm_oauth_state";

/** Random state stored in a short-lived cookie to tie a provider callback to this browser. */
export async function createOAuthState(): Promise<string> {
  const state = randomBytes(24).toString("hex");
  const jar = await cookies();
  jar.set(STATE_COOKIE, state, { httpOnly: true, sameSite: "lax", secure, path: "/", maxAge: 600 });
  return state;
}

export async function consumeOAuthState(state: string | null): Promise<boolean> {
  const jar = await cookies();
  const expected = jar.get(STATE_COOKIE)?.value;
  jar.delete(STATE_COOKIE);
  if (!expected || !state || expected.length !== state.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(state));
}

/** Signs the user in by writing the same JWT session cookie NextAuth issues. */
export async function issueSession(
  res: NextResponse,
  user: { id: string; name: string | null; email: string | null; role: string; steamId: string | null }
) {
  const token = await encode({
    secret: process.env.NEXTAUTH_SECRET!,
    maxAge: SESSION_MAX_AGE,
    token: {
      sub: user.id,
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      steamId: user.steamId,
    },
  });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}
