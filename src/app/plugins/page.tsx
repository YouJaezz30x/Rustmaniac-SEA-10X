import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { PluginsClient } from "@/components/plugins-client";

export const metadata: Metadata = { title: "Plugins" };
export const dynamic = "force-dynamic";

export default async function PluginsPage() {
  const plugins = await prisma.plugin.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div className="page">
      <h1 className="page__title">Plugin marketplace</h1>
      <p className="page__lead">
        Custom Oxide plugins tuned for Rustmaniac SEA 10X — LootEditor, ClanTeam, SmeltRates, and
        more.
      </p>
      <PluginsClient plugins={plugins} />
    </div>
  );
}
