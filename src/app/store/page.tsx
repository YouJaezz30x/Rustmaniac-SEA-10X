import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { StoreClient } from "@/components/store-client";
import { RecentPurchases } from "@/components/recent-purchases";

export const metadata: Metadata = { title: "VIP Store" };
export const dynamic = "force-dynamic";

export default async function StorePage() {
  const packages = await prisma.vipPackage.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <>
      <div className="page">
        <h1 className="page__title">VIP store</h1>
        <p className="page__lead">
          VIP, VIP+ and VIP++ for 30 days, 90 days or permanently. Each rank gives its own kit every
          12 hours. Buying the same rank again adds the days on top.
        </p>
        <StoreClient packages={packages} />
      </div>
      <RecentPurchases />
    </>
  );
}
