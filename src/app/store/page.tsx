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
          VIP / VIP+ / VIP++ with 1 month, 3 months, or permanent. Checkout via Stripe; receipt
          lands after payment.
        </p>
        <StoreClient packages={packages} />
      </div>
      <RecentPurchases />
    </>
  );
}
