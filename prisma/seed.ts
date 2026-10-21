import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Safe to re-run: existing rows are left alone (admin edits survive), only missing ones are added.
// Placeholder rows from the original scaffold are removed.

const armor = "Metal facemask, metal chest plate, road sign kilt and gloves, hoodie, pants, boots";

const packages = [
  {
    slug: "vip",
    name: "VIP",
    tier: "VIP",
    grantTier: "vip",
    description: "The VIP kit every 12 hours: a full weapon loadout, armor and a big stack of resources.",
    features: ["VIP kit every 12 hours", "LR-300, AK, SKS, L96 and 3 bolt rifles", "500 HV rifle ammo, 3 supply signals", "Delivered in game automatically"],
    kitContents: [
      "LR-300, AK-47, SKS, L96, 3x Bolt Action Rifle",
      "500 HV 5.56 ammo, 3 supply signals",
      armor,
      "60k wood, 60k stone, 60k metal ore, 60k sulfur ore",
      "20k sulfur, 20k metal fragments, 1k HQM, 5k HQ ore",
      "15k cloth, 12k leather, 10k low grade fuel, 5k scrap",
    ],
    priceMonth: 499,
    priceThree: 1299,
    pricePerm: 3499,
    sortOrder: 1,
  },
  {
    slug: "vip-plus",
    name: "VIP+",
    tier: "VIP+",
    grantTier: "vip+",
    description: "Everything in the VIP kit with double ammo and resources, plus medical supplies.",
    features: ["VIP+ kit every 12 hours", "Same guns as VIP, 1,020 HV ammo", "6 supply signals, 50 large medkits, 60 syringes", "Delivered in game automatically"],
    kitContents: [
      "LR-300, AK-47, SKS, L96, 3x Bolt Action Rifle",
      "1,020 HV 5.56 ammo, 6 supply signals",
      "50 large medkits, 60 syringes",
      armor,
      "150k wood, 150k stone, 120k metal ore, 120k sulfur ore",
      "40k sulfur, 40k metal fragments, 1.5k HQM, 8k HQ ore",
      "25k cloth, 25k leather, 25k low grade fuel, 10k scrap",
    ],
    priceMonth: 899,
    priceThree: 2399,
    pricePerm: 5999,
    sortOrder: 2,
  },
  {
    slug: "vip-plusplus",
    name: "VIP++",
    tier: "VIP++",
    grantTier: "vip++",
    description: "The biggest kit on the server: extra rifles, an M4 shotgun and the most resources.",
    features: ["VIP++ kit every 12 hours", "2 LR-300s, 2 AKs, M4 shotgun, SKS, L96, 3 bolt rifles", "9 supply signals, 50 large medkits, 60 syringes", "Delivered in game automatically"],
    kitContents: [
      "2x LR-300, 2x AK-47 (one special edition), M4 Shotgun, SKS, L96, 3x Bolt Action Rifle",
      "1,020 HV 5.56 ammo, 9 supply signals",
      "50 large medkits, 60 syringes",
      armor,
      "220k wood, 220k stone, 180k metal ore, 180k sulfur ore",
      "60k sulfur, 100k metal fragments, 2k HQM, 12k HQ ore",
      "35k cloth, 35k leather, 25k low grade fuel, 15k scrap",
    ],
    priceMonth: 1499,
    priceThree: 3999,
    pricePerm: 9999,
    sortOrder: 3,
  },
];

const rules = [
  ["Fair play", "No cheating or exploits", "No cheating, scripting, macros or exploiting bugs. Instant ban."],
  ["Conduct", "No hate or harassment", "No racism, hate speech, harassment or threats, in game or on Discord."],
  ["Conduct", "No doxxing", "No doxxing or sharing other people's personal information."],
  ["Teams", "Max team size 10", "Max team size is 10. No alliances above the limit."],
  ["Raiding", "No griefing", "No griefing outside normal raiding: no offline-trap abuse, no blocking monuments, roads or bases."],
  ["Community", "No advertising", "No advertising other servers or Discords."],
  ["Chat", "No spam", "No spam or flooding in chat."],
  ["Chat", "English in public chat", "Use English in public chat so admins can moderate."],
  ["Staff", "Respect staff decisions", "Respect admin decisions and don't impersonate staff. Disputes go through a ticket."],
  ["Fair play", "No ban evasion", "Ban evasion with an alt account means a permanent ban on all accounts."],
] as const;

const plugins = [
  ["loot-editor", "LootEditor", "In-game loot table editor with per-crate slot limits and drop-rate simulation.", "1.6.0"],
  ["loot-studio", "LootStudio", "Tree-based loot editor (/loot2) with weighted branches, item groups and container previews.", "1.1.0"],
  ["smelt-rates", "SmeltRates", "Per-furnace smelting batches, electric furnace power checks and refinery rates.", "1.0.6"],
  ["quick-deposit", "QuickDeposit", "Take All, Deposit Match, Deposit All and deposit-by-category buttons on every box.", "1.0.2"],
  ["clan-team", "ClanTeam", "Keeps Rust teams and clans in sync, with an inventory invite popup and wipe reset.", "1.0.0"],
  ["animal-farm", "AnimalFarm", "Breedable animals, chicken coops and farm pens with genetics.", "1.0.0"],
] as const;

const placeholderStaff = ["Maniac", "OxideFox", "SEAWarden", "KitSmith"];
const placeholderReviews = ["TokTokRaid", "BlueprintBee", "OilRigOwl"];
const placeholderRules = [
  "No cheating / macros",
  "English + Bahasa in chat",
  "No offline abuse exploits",
  "No RMT outside the store",
  "Respect team limits",
];
const placeholderAnnouncements = ["Wipe Friday 20:00 GMT+8", "VIP++ kit refresh"];

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (adminEmail && adminPassword) {
    const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (!existing) {
      await prisma.user.create({
        data: {
          email: adminEmail,
          passwordHash: await bcrypt.hash(adminPassword, 12),
          role: "ADMIN",
          name: "Rustmaniac Admin",
        },
      });
      console.log(`Created admin ${adminEmail}`);
    } else if (existing.role !== "ADMIN") {
      await prisma.user.update({ where: { id: existing.id }, data: { role: "ADMIN" } });
    }
  }

  await prisma.user.deleteMany({ where: { email: "player@example.com" } });
  await prisma.order.deleteMany({ where: { stripeSessionId: { startsWith: "seed_" } } });
  await prisma.staff.deleteMany({ where: { name: { in: placeholderStaff } } });
  await prisma.review.deleteMany({ where: { author: { in: placeholderReviews }, userId: null } });
  await prisma.rule.deleteMany({ where: { title: { in: placeholderRules } } });
  await prisma.announcement.deleteMany({ where: { title: { in: placeholderAnnouncements } } });

  for (const pkg of packages) {
    const data = {
      ...pkg,
      features: JSON.stringify(pkg.features),
      kitContents: JSON.stringify(pkg.kitContents),
    };
    const existing = await prisma.vipPackage.findUnique({ where: { slug: pkg.slug } });
    if (!existing) {
      await prisma.vipPackage.create({ data });
    } else if (existing.kitContents === "[]") {
      // First run on a database that still has the scaffold's packages: replace the copy, keep prices.
      const { priceMonth, priceThree, pricePerm, ...copy } = data;
      void priceMonth;
      void priceThree;
      void pricePerm;
      await prisma.vipPackage.update({ where: { slug: pkg.slug }, data: copy });
    }
  }

  if ((await prisma.rule.count()) === 0) {
    await prisma.rule.createMany({
      data: rules.map(([category, title, body], i) => ({ category, title, body, sortOrder: i + 1 })),
    });
  }

  for (const [i, [slug, name, description, version]] of plugins.entries()) {
    const existing = await prisma.plugin.findUnique({ where: { slug } });
    if (!existing) {
      await prisma.plugin.create({
        data: { slug, name, description, version, priceCents: 0, active: false, sortOrder: i + 1 },
      });
    } else {
      await prisma.plugin.update({ where: { slug }, data: { description, version } });
    }
  }

  if ((await prisma.announcement.count()) === 0) {
    await prisma.announcement.create({
      data: {
        title: "Monthly force wipe",
        body: "Maps wipe with Facepunch's force wipe on the first Thursday of every month (19:00 UTC, Friday 3:00 AM UTC+8). Clans and PvP stats reset each wipe; playtime ranks are kept.",
        pinned: true,
      },
    });
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
