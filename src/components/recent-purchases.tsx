import { prisma } from "@/lib/prisma";
import { durationLabel } from "@/lib/brand";
import { formatMoney } from "@/lib/pricing";

export async function RecentPurchases() {
  const orders = await prisma.order.findMany({
    where: { status: { in: ["PAID", "FULFILLED"] } },
    include: { items: true },
    orderBy: { createdAt: "desc" },
    take: 12,
  });

  if (orders.length === 0) {
    return (
      <div className="purchase-feed">
        <p className="muted">No recent purchases yet — be the first this wipe.</p>
      </div>
    );
  }

  return (
    <div className="purchase-feed" aria-label="Recent purchases">
      <ul>
        {orders.map((order) => {
          const item = order.items[0];
          const who = order.displayName || "A survivor";
          const what = item
            ? `${item.name}${item.duration ? ` · ${durationLabel(item.duration)}` : ""}`
            : "Store purchase";
          return (
            <li key={order.id}>
              <span className="purchase-feed__who">{who}</span>
              <span className="purchase-feed__what">{what}</span>
              <span className="purchase-feed__meta">{formatMoney(order.totalCents, order.currency)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
