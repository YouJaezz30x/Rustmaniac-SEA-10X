import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { rateLimit, requireCsrf } from "@/lib/security";
import { STORE_CURRENCY, vipPriceCents } from "@/lib/pricing";
import { BRAND, durationLabel, type DurationKey } from "@/lib/brand";
import { siteUrl } from "@/lib/steam";

export async function POST(req: Request) {
  const session = await requireUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? session.user.id;
  const limited = await rateLimit(`checkout:${ip}`, 10, 60_000);
  if (!limited.ok) {
    return NextResponse.json({ error: "Too many checkout attempts" }, { status: 429 });
  }

  if (!(await requireCsrf(req.headers.get("x-csrf-token")))) {
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return NextResponse.json(
      {
        error: "Stripe is not configured",
        hint: "Set STRIPE_SECRET_KEY in .env (test mode key is fine for local).",
      },
      { status: 501 }
    );
  }

  const cart = await prisma.cartItem.findMany({
    where: { userId: session.user.id },
    include: { vipPackage: true, plugin: true },
  });
  if (cart.length === 0) {
    return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (cart.some((item) => item.kind === "vip") && !user?.steamId) {
    return NextResponse.json(
      { error: "Link your Steam account first so we know who gets the VIP rank in game.", needsSteam: true },
      { status: 400 }
    );
  }

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
  const orderItems: {
    kind: string;
    name: string;
    duration: "ONE_MONTH" | "THREE_MONTHS" | "PERMANENT" | null;
    unitCents: number;
    quantity: number;
    vipPackageId?: string;
    pluginId?: string;
  }[] = [];

  let totalCents = 0;
  for (const item of cart) {
    if (item.kind === "vip" && item.vipPackage && item.duration) {
      const duration = item.duration as DurationKey;
      const unit = vipPriceCents(item.vipPackage, duration);
      totalCents += unit * item.quantity;
      const label = `${item.vipPackage.name} (${durationLabel(duration)})`;
      lineItems.push({
        quantity: item.quantity,
        price_data: {
          currency: STORE_CURRENCY,
          unit_amount: unit,
          product_data: {
            name: label,
            description: `In-game ${item.vipPackage.name} rank for Steam ${user?.steamId}. Kit every 12 hours.`,
            metadata: { kind: "vip", slug: item.vipPackage.slug, duration },
          },
        },
      });
      orderItems.push({
        kind: "vip",
        name: item.vipPackage.name,
        duration,
        unitCents: unit,
        quantity: item.quantity,
        vipPackageId: item.vipPackageId ?? undefined,
      });
    } else if (item.kind === "plugin" && item.plugin) {
      const unit = item.plugin.priceCents;
      totalCents += unit * item.quantity;
      lineItems.push({
        quantity: item.quantity,
        price_data: {
          currency: STORE_CURRENCY,
          unit_amount: unit,
          product_data: {
            name: item.plugin.name,
            metadata: { kind: "plugin", slug: item.plugin.slug },
          },
        },
      });
      orderItems.push({
        kind: "plugin",
        name: item.plugin.name,
        duration: null,
        unitCents: unit,
        quantity: item.quantity,
        pluginId: item.pluginId ?? undefined,
      });
    }
  }

  const stripe = new Stripe(stripeKey);

  const order = await prisma.order.create({
    data: {
      userId: session.user.id,
      email: user?.email ?? "",
      displayName: user?.steamName ?? user?.name ?? null,
      steamId: user?.steamId ?? null,
      status: "PENDING",
      totalCents,
      currency: STORE_CURRENCY,
      items: { create: orderItems },
    },
  });

  const metadata = { orderId: order.id, userId: session.user.id, steamId: user?.steamId ?? "" };
  // Payment methods are left to the Dashboard (dynamic payment methods), so cards, Link, wallets and
  // local methods turned on there all show up without code changes.
  const checkout = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      ...(user?.stripeCustomerId
        ? { customer: user.stripeCustomerId }
        : { customer_email: user?.email ?? undefined, customer_creation: "always" as const }),
      client_reference_id: order.id,
      line_items: lineItems,
      success_url: `${siteUrl()}/receipt/${order.id}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl()}/store?cancelled=1`,
      metadata,
      payment_intent_data: {
        description: `${BRAND.server} order ${order.id}`,
        metadata,
      },
      invoice_creation: {
        enabled: true,
        invoice_data: {
          description: `${BRAND.server} store order`,
          metadata,
          custom_fields: user?.steamId ? [{ name: "Steam ID", value: user.steamId }] : undefined,
          footer: "VIP is delivered to your Steam account in game automatically. Support: discord.gg/fE5YdJBgyv",
        },
      },
      adaptive_pricing: { enabled: true },
    },
    { idempotencyKey: `checkout-${order.id}` }
  );

  await prisma.order.update({
    where: { id: order.id },
    data: { stripeSessionId: checkout.id },
  });

  return NextResponse.json({ url: checkout.url, orderId: order.id });
}
