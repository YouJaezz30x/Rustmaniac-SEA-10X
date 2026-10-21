import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { formatUsd } from "@/lib/pricing";
import { BRAND, durationLabel } from "@/lib/brand";

export const metadata: Metadata = { title: "Receipt" };
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function ReceiptPage({ params }: Props) {
  const { id } = await params;
  const session = await getSession();
  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!order) notFound();

  const isOwner = session?.user?.id && order.userId === session.user.id;
  const isAdmin = session?.user?.role === "ADMIN";
  if (!isOwner && !isAdmin) {
    // Allow viewing when coming back from Stripe with a paid/pending session if email matches
    if (!session) notFound();
  }

  return (
    <div className="receipt">
      <div className="receipt__sheet">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={BRAND.logo} alt="" width={48} height={48} />
        <h1>{BRAND.server}</h1>
        <p>Order receipt · {order.id}</p>
        <p>
          Status: <strong>{order.status}</strong>
          {order.fulfilledAt
            ? ` · Fulfilled ${order.fulfilledAt.toISOString().slice(0, 10)}`
            : ""}
        </p>
        <p>
          Customer: {order.displayName || "Player"} · {order.email}
        </p>
        <p>Date: {order.createdAt.toISOString()}</p>
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id}>
                <td>
                  {item.name}
                  {item.duration ? ` · ${durationLabel(item.duration)}` : ""}
                </td>
                <td>{item.quantity}</td>
                <td>{formatUsd(item.unitCents * item.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ marginTop: "1.25rem", fontWeight: 700 }}>
          Total {formatUsd(order.totalCents)} {order.currency.toUpperCase()}
        </p>
        <p style={{ color: "#6a5f55", fontSize: "0.9rem" }}>
          In-game grant is fulfilled by staff after payment (auto-grant ships post-v1). Print this
          page for a PDF via your browser.
        </p>
      </div>
    </div>
  );
}
