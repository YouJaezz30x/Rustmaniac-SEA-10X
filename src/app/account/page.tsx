import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatUsd } from "@/lib/pricing";
import { durationLabel } from "@/lib/brand";

export const metadata: Metadata = { title: "Account" };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await requireUser();
  if (!session) redirect("/login");

  const orders = await prisma.order.findMany({
    where: { userId: session.user.id },
    include: { items: true },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <div className="page">
      <h1 className="page__title">Account</h1>
      <p className="page__lead">
        Signed in as <strong>{session.user.email ?? session.user.name}</strong> · role{" "}
        {session.user.role}
        {session.user.steamId ? ` · Steam ${session.user.steamId}` : ""}
      </p>

      <div className="section-head">
        <h2>Orders</h2>
        <p className="muted">Receipts and fulfillment status for your purchases.</p>
      </div>

      {orders.length === 0 ? (
        <p className="muted">
          No orders yet. Visit the <Link href="/store">VIP store</Link>.
        </p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Items</th>
              <th>Total</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td>{order.createdAt.toISOString().slice(0, 10)}</td>
                <td>
                  {order.items
                    .map(
                      (i) =>
                        `${i.name}${i.duration ? ` (${durationLabel(i.duration)})` : ""}`
                    )
                    .join(", ")}
                </td>
                <td>{formatUsd(order.totalCents)}</td>
                <td>{order.status}</td>
                <td>
                  <Link href={`/receipt/${order.id}`}>Receipt</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
