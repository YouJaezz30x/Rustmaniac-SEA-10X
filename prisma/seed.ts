import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = (process.env.ADMIN_EMAIL ?? "admin@rustmaniac.local").toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD ?? "admin123!";
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { passwordHash, role: "ADMIN", name: "Rustmaniac Admin" },
    create: {
      email: adminEmail,
      passwordHash,
      role: "ADMIN",
      name: "Rustmaniac Admin",
    },
  });

  await prisma.user.upsert({
    where: { email: "player@example.com" },
    update: {},
    create: {
      email: "player@example.com",
      passwordHash: await bcrypt.hash("player123!", 12),
      role: "USER",
      name: "SEARaider",
    },
  });

  const packages = [
    {
      slug: "vip",
      name: "VIP",
      tier: "VIP",
      description: "Core perks for daily grinders — kits, queue priority, and home teleports.",
      features: JSON.stringify([
        "Priority queue",
        "VIP kit daily",
        "/home x2",
        "Colored chat tag",
      ]),
      priceMonth: 499,
      priceThree: 1299,
      pricePerm: 3499,
      sortOrder: 1,
    },
    {
      slug: "vip-plus",
      name: "VIP+",
      tier: "VIP+",
      description: "Clan-ready boosts with extra homes, backpack space, and scrap multipliers.",
      features: JSON.stringify([
        "Everything in VIP",
        "/home x4",
        "Extra backpack rows",
        "Scrap multiplier",
        "No map wipe kit loss",
      ]),
      priceMonth: 899,
      priceThree: 2399,
      pricePerm: 5999,
      sortOrder: 2,
    },
    {
      slug: "vip-plusplus",
      name: "VIP++",
      tier: "VIP++",
      description: "Top-shelf SEA 10X status — max teleports, elite kits, and exclusive skins.",
      features: JSON.stringify([
        "Everything in VIP+",
        "/home x6",
        "Elite kit + skin box",
        "TC upkeep discount",
        "Private Discord role",
      ]),
      priceMonth: 1499,
      priceThree: 3999,
      pricePerm: 9999,
      sortOrder: 3,
    },
  ];

  for (const pkg of packages) {
    await prisma.vipPackage.upsert({
      where: { slug: pkg.slug },
      update: pkg,
      create: pkg,
    });
  }

  const plugins = [
    {
      slug: "loot-editor",
      name: "LootEditor",
      description: "Fine-tune crate and barrel loot tables for balanced 10X wipes.",
      priceCents: 2499,
      version: "2.1.0",
      sortOrder: 1,
    },
    {
      slug: "loot-studio",
      name: "LootStudio",
      description: "Visual loot composer with presets for monuments and locked crates.",
      priceCents: 3499,
      version: "1.4.2",
      sortOrder: 2,
    },
    {
      slug: "animal-farm",
      name: "AnimalFarm",
      description: "Breedable animals, feed stations, and farmable leather/meat loops.",
      priceCents: 1999,
      version: "1.2.0",
      sortOrder: 3,
    },
    {
      slug: "smelt-rates",
      name: "SmeltRates",
      description: "Configurable furnace/oil refinery rates tuned for SEA 10X economy.",
      priceCents: 1499,
      version: "3.0.1",
      sortOrder: 4,
    },
    {
      slug: "clan-team",
      name: "ClanTeam",
      description: "Clan tags, shared storage permissions, and team invite tooling.",
      priceCents: 2999,
      version: "1.8.0",
      sortOrder: 5,
    },
  ];

  for (const plugin of plugins) {
    await prisma.plugin.upsert({
      where: { slug: plugin.slug },
      update: plugin,
      create: plugin,
    });
  }

  await prisma.staff.deleteMany();
  await prisma.staff.createMany({
    data: [
      {
        name: "Maniac",
        role: "Owner",
        avatarUrl: "https://files.catbox.moe/5fx3yu.png",
        sortOrder: 1,
      },
      {
        name: "OxideFox",
        role: "Lead Admin",
        sortOrder: 2,
      },
      {
        name: "SEAWarden",
        role: "Moderator",
        sortOrder: 3,
      },
      {
        name: "KitSmith",
        role: "Plugin Dev",
        sortOrder: 4,
      },
    ],
  });

  await prisma.rule.deleteMany();
  await prisma.rule.createMany({
    data: [
      {
        category: "General",
        title: "No cheating / macros",
        body: "ESP, scripts, radar, and automated macros are an instant ban. Report via Discord tickets.",
        sortOrder: 1,
      },
      {
        category: "General",
        title: "English + Bahasa in chat",
        body: "Keep global chat readable. Toxicity and hate speech get muted or banned.",
        sortOrder: 2,
      },
      {
        category: "Raiding",
        title: "No offline abuse exploits",
        body: "Exploit glitches for free raids or item dupes void your VIP and wipe progress.",
        sortOrder: 3,
      },
      {
        category: "Economy",
        title: "No RMT outside the store",
        body: "Buy VIP and plugins only through the official site. Selling kits/items for real money is banned.",
        sortOrder: 4,
      },
      {
        category: "Clans",
        title: "Respect team limits",
        body: "Follow posted max team size for the wipe. Allying past the limit is considered a rules breach.",
        sortOrder: 5,
      },
    ],
  });

  await prisma.announcement.deleteMany();
  await prisma.announcement.createMany({
    data: [
      {
        title: "Wipe Friday 20:00 GMT+8",
        body: "Force wipe this Friday. Blueprint wipe announced in Discord #announcements.",
        pinned: true,
      },
      {
        title: "VIP++ kit refresh",
        body: "Elite kits updated with new skin box rolls. Check /kit in-game after wipe.",
        pinned: false,
      },
    ],
  });

  await prisma.review.deleteMany();
  await prisma.review.createMany({
    data: [
      {
        author: "TokTokRaid",
        rating: 5,
        body: "Best SEA 10X I've played — pop is solid and VIP kits actually feel worth it.",
        approved: true,
      },
      {
        author: "BlueprintBee",
        rating: 5,
        body: "ClanTeam + LootEditor make the wipe feel custom without being pay-to-win.",
        approved: true,
      },
      {
        author: "OilRigOwl",
        rating: 4,
        body: "Admins are fair. Wish queue was shorter on wipe night but VIP priority helps.",
        approved: true,
      },
    ],
  });

  const vip = await prisma.vipPackage.findUnique({ where: { slug: "vip-plus" } });
  if (vip) {
    await prisma.order.deleteMany({ where: { stripeSessionId: { startsWith: "seed_" } } });
    await prisma.order.create({
      data: {
        email: "buyer1@example.com",
        displayName: "TokTokRaid",
        status: "PAID",
        totalCents: vip.priceMonth,
        stripeSessionId: "seed_order_1",
        items: {
          create: [
            {
              kind: "vip",
              name: "VIP+",
              duration: "ONE_MONTH",
              unitCents: vip.priceMonth,
              vipPackageId: vip.id,
            },
          ],
        },
      },
    });
    await prisma.order.create({
      data: {
        email: "buyer2@example.com",
        displayName: "OilRigOwl",
        status: "FULFILLED",
        totalCents: 1499,
        stripeSessionId: "seed_order_2",
        fulfilledAt: new Date(),
        items: {
          create: [
            {
              kind: "vip",
              name: "VIP++",
              duration: "ONE_MONTH",
              unitCents: 1499,
            },
          ],
        },
      },
    });
  }

  console.log("Seed complete.");
  console.log(`Admin: ${adminEmail} / ${adminPassword}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
