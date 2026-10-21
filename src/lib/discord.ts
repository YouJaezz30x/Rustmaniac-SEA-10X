import { siteUrl } from "./steam";
import { BRAND } from "./brand";

export function discordConfigured(): boolean {
  return Boolean(process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET);
}

export function discordRedirectUri(): string {
  return `${siteUrl()}/api/account/discord/callback`;
}

export function discordAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID ?? "",
    redirect_uri: discordRedirectUri(),
    response_type: "code",
    scope: "identify",
    state,
    prompt: "none",
  });
  return `https://discord.com/oauth2/authorize?${params}`;
}

export async function fetchDiscordUser(code: string): Promise<{ id: string; name: string } | null> {
  const tokenRes = await fetch("https://discord.com/api/v10/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID ?? "",
      client_secret: process.env.DISCORD_CLIENT_SECRET ?? "",
      grant_type: "authorization_code",
      code,
      redirect_uri: discordRedirectUri(),
    }),
    cache: "no-store",
  });
  if (!tokenRes.ok) return null;
  const { access_token } = (await tokenRes.json()) as { access_token?: string };
  if (!access_token) return null;

  const meRes = await fetch("https://discord.com/api/v10/users/@me", {
    headers: { Authorization: `Bearer ${access_token}` },
    cache: "no-store",
  });
  if (!meRes.ok) return null;
  const me = (await meRes.json()) as { id: string; username: string; global_name?: string | null };
  return { id: me.id, name: me.global_name || me.username };
}

/** Posts an embed to the staff purchase-log channel webhook, if DISCORD_PURCHASE_WEBHOOK_URL is set. */
export async function notifyDiscord(title: string, description: string, color = 0xe8c04a) {
  const url = process.env.DISCORD_PURCHASE_WEBHOOK_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: `${BRAND.server} Store`,
        avatar_url: BRAND.logo,
        allowed_mentions: { parse: [] },
        embeds: [{ title, description, color, timestamp: new Date().toISOString() }],
      }),
    });
  } catch (e) {
    console.error("[discord] webhook failed", e);
  }
}
