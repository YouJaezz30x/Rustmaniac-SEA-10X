const OPENID_ENDPOINT = "https://steamcommunity.com/openid/login";
const CLAIMED_ID = /^https:\/\/steamcommunity\.com\/openid\/id\/(\d{17})$/;

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export function steamLoginUrl(returnTo: string): string {
  const params = new URLSearchParams({
    "openid.ns": "http://specs.openid.net/auth/2.0",
    "openid.mode": "checkid_setup",
    "openid.return_to": returnTo,
    "openid.realm": siteUrl(),
    "openid.identity": "http://specs.openid.net/auth/2.0/identifier_select",
    "openid.claimed_id": "http://specs.openid.net/auth/2.0/identifier_select",
  });
  return `${OPENID_ENDPOINT}?${params}`;
}

/** Verifies the OpenID response with Steam and returns the 64-bit Steam ID, or null. */
export async function verifySteamResponse(query: URLSearchParams, expectedReturnTo: string): Promise<string | null> {
  if (query.get("openid.mode") !== "id_res") return null;
  const returnTo = query.get("openid.return_to") ?? "";
  if (!returnTo.startsWith(expectedReturnTo)) return null;
  const match = CLAIMED_ID.exec(query.get("openid.claimed_id") ?? "");
  if (!match) return null;

  const body = new URLSearchParams();
  for (const [key, value] of query) {
    if (key.startsWith("openid.")) body.set(key, value);
  }
  body.set("openid.mode", "check_authentication");

  const res = await fetch(OPENID_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  if (!res.ok) return null;
  const text = await res.text();
  return /is_valid\s*:\s*true/.test(text) ? match[1] : null;
}

export type SteamProfile = { name: string; avatarUrl: string | null };

/** Display name and avatar from the Steam Web API. Needs STEAM_API_KEY; returns null without it. */
export async function fetchSteamProfile(steamId: string): Promise<SteamProfile | null> {
  const key = process.env.STEAM_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(
      `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${key}&steamids=${steamId}`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      response?: { players?: { personaname?: string; avatarfull?: string }[] };
    };
    const player = data.response?.players?.[0];
    if (!player?.personaname) return null;
    return { name: player.personaname, avatarUrl: player.avatarfull ?? null };
  } catch {
    return null;
  }
}
