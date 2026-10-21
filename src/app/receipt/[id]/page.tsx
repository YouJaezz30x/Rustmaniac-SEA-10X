import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { formatMoney } from "@/lib/pricing";
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
  if (!isOwner && !isAdmin) notFound();

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
          Customer: {order.displayName || "Player"}{order.steamId ? ` · Steam ${order.steamId}` : ""}{order.email ? ` · ${order.email}` : ""}
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
                <td>{formatMoney(item.unitCents * item.quantity, order.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {(order.invoicePdf || order.invoiceUrl) && (
          <p style={{ marginTop: "1rem" }}>
            Official invoice:{" "}
            {order.invoicePdf && (
              <a href={order.invoicePdf} target="_blank" rel="noreferrer">
                Download PDF
              </a>
            )}
            {order.invoicePdf && order.invoiceUrl && " · "}
            {order.invoiceUrl && (
              <a href={order.invoiceUrl} target="_blank" rel="noreferrer">
                View online
              </a>
            )}
          </p>
        )}
        {order.status === "PENDING" && (
          <p style={{ marginTop: "1rem" }}>
            Waiting for payment confirmation. Refresh this page in a moment.
          </p>
        )}
        <p style={{ marginTop: "1.25rem", fontWeight: 700 }}>
          Total {formatMoney(order.totalCents, order.currency)}
        </p>
        <p style={{ color: "#6a5f55", fontSize: "0.9rem" }}>
          VIP is given to the Steam account above automatically, usually within a minute or two of payment. Need help? Open a ticket on our Discord. Print this page to save it as a PDF.
        </p>
      </div>
    </div>
  );
}
