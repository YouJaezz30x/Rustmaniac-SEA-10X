export const BRAND = {
  name: "Rustmaniac",
  server: "Rustmaniac SEA 10X",
  tagline: "Southeast Asia's hard-fought 10X wipe — loot, clans, and custom Oxide plugins.",
  discord: "https://discord.gg/8tNEXgs3qX",
  bannerFull: "https://files.catbox.moe/0h4gs3.jpg",
  bannerWide: "https://files.catbox.moe/k3z7m5.png",
  logo: "https://files.catbox.moe/5fx3yu.png",
} as const;

export const DURATION_LABELS = {
  ONE_MONTH: "1 month",
  THREE_MONTHS: "3 months",
  PERMANENT: "Permanent",
} as const;

export type DurationKey = keyof typeof DURATION_LABELS;

export function durationLabel(duration: string | null | undefined): string {
  if (!duration) return "";
  return DURATION_LABELS[duration as DurationKey] ?? duration;
}
