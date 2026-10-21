import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/pricing";
import { durationLabel } from "@/lib/brand";
import { discordConfigured } from "@/lib/discord";

export const metadata: Metadata = { title: "Account" };
export const dynamic = "force-dynamic";

const NOTICES: Record<string, { ok: boolean; text: string }> = {
  "linked=steam": { ok: true, text: "Steam linked. VIP you buy now goes to this Steam account in game." },
  "linked=discord": { ok: true, text: "Discord linked." },
  "error=steam": { ok: false, text: "Steam sign-in didn't complete. Please try again." },
  "error=steam-taken": { ok: false, text: "That Steam account is already linked to another website account." },
  "error=discord": { ok: false, text: "Discord linking didn't complete. Please try again." },
  "error=discord-taken": { ok: false, text: "That Discord account is already linked to another website account." },
  "error=discord-setup": { ok: false, text: "Discord linking isn't switched on yet." },
};

const DELIVERY_LABEL: Record<string, string> = {
  PENDING: "Waiting for server",
  DELIVERED: "Delivered in game",
  FAILED: "Delivery failed — staff notified",
};

type Props = { searchParams: Promise<Record<string, string | undefined>> };

export default async function AccountPage({ searchParams }: Props) {
  const session = await requireUser();
  if (!session) redirect("/login");

  const query = await searchParams;
  const notice = Object.entries(NOTICES).find(([key]) => {
    const [k, v] = key.split("=");
    return query[k] === v;
  })?.[1];

  const [user, orders] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.user.id } }),
    prisma.order.findMany({
      where: { userId: session.user.id },
      include: { items: true, deliveries: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);
  if (!user) redirect("/login");

  return (
    <div className="page">
      <h1 className="page__title">Account</h1>
      <p className="page__lead">
        Signed in as <strong>{user.steamName ?? user.name ?? user.email}</strong>
        {user.email ? ` · ${user.email}` : ""}
      </p>

      {notice && <p className={`alert ${notice.ok ? "alert--ok" : "alert--error"}`}>{notice.text}</p>}

      <div className="link-row">
        <article className="link-card">
          <h3>Steam</h3>
          {user.steamId ? (
            <p>
              Linked: <strong>{user.steamName ?? "Steam account"}</strong> ({user.steamId})
            </p>
          ) : (
            <p>Required for VIP. Your rank is given to this Steam account in game.</p>
          )}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- redirects off-site to Steam */}
          <a className={`btn ${user.steamId ? "btn--ghost" : "btn--solid"}`} href="/api/auth/steam?mode=link">
            {user.steamId ? "Change Steam account" : "Link Steam"}
          </a>
        </article>
        <article className="link-card">
          <h3>Discord</h3>
          {user.discordId ? (
            <p>
              Linked: <strong>{user.discordName}</strong>
            </p>
          ) : (
            <p>Optional. Lets staff find your purchases when you open a ticket.</p>
          )}
          {discordConfigured() ? (
            <a className="btn btn--ghost" href="/api/account/discord">
              {user.discordId ? "Change Discord account" : "Link Discord"}
            </a>
          ) : (
            <p className="muted">Coming soon.</p>
          )}
        </article>
      </div>

      <div className="section-head">
        <h2>Orders</h2>
        <p className="muted">Receipts and in-game delivery for your purchases.</p>
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
            {orders.map((order) => {
              const delivery =
                order.deliveries.length === 0
                  ? null
                  : order.deliveries.every((d) => d.status === "DELIVERED")
                    ? "DELIVERED"
                    : order.deliveries.some((d) => d.status === "FAILED")
                      ? "FAILED"
                      : "PENDING";
              return (
                <tr key={order.id}>
                  <td>{order.createdAt.toISOString().slice(0, 10)}</td>
                  <td>
                    {order.items
                      .map((i) => `${i.name}${i.duration ? ` (${durationLabel(i.duration)})` : ""}`)
                      .join(", ")}
                  </td>
                  <td>{formatMoney(order.totalCents, order.currency)}</td>
                  <td>{delivery ? DELIVERY_LABEL[delivery] : order.status}</td>
                  <td>
                    <Link href={`/receipt/${order.id}`}>Receipt</Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
