export const BRAND = {
  name: "Rustmaniac",
  server: "Rustmaniac SEA 10X",
  tagline: "Southeast Asia's 10X server — instant crafting, clans of 10, custom events and kits. Hosted in Singapore.",
  discord: "https://discord.gg/8tNEXgs3qX",
  bannerFull: "https://files.catbox.moe/0h4gs3.jpg",
  bannerWide: "https://files.catbox.moe/k3z7m5.png",
  logo: "https://files.catbox.moe/5fx3yu.png",
  address: process.env.NEXT_PUBLIC_SERVER_ADDRESS ?? "51.79.214.144:21066",
  region: "Singapore",
  teamSize: 10,
} as const;

export const DURATION_LABELS = {
  ONE_MONTH: "30 days",
  THREE_MONTHS: "90 days",
  PERMANENT: "Permanent",
} as const;

export type DurationKey = keyof typeof DURATION_LABELS;

// Days passed to `vip give` in RustmaniacVIP; null means permanent.
export const DURATION_DAYS: Record<DurationKey, number | null> = {
  ONE_MONTH: 30,
  THREE_MONTHS: 90,
  PERMANENT: null,
};

export function durationLabel(duration: string | null | undefined): string {
  if (!duration) return "";
  return DURATION_LABELS[duration as DurationKey] ?? duration;
}
