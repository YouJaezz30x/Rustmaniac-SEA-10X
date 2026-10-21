import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { rateLimit, requireCsrf } from "@/lib/security";
import { vipPriceCents } from "@/lib/pricing";
import { durationLabel, type DurationKey } from "@/lib/brand";

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
          currency: "usd",
          unit_amount: unit,
          product_data: { name: label },
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
          currency: "usd",
          unit_amount: unit,
          product_data: { name: item.plugin.name },
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

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const stripe = new Stripe(stripeKey);

  const order = await prisma.order.create({
    data: {
      userId: session.user.id,
      email: session.user.email ?? "unknown@rustmaniac.local",
      displayName: session.user.name,
      status: "PENDING",
      totalCents,
      items: { create: orderItems },
    },
  });

  const checkout = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: session.user.email ?? undefined,
    line_items: lineItems,
    success_url: `${siteUrl}/receipt/${order.id}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/store?cancelled=1`,
    metadata: { orderId: order.id, userId: session.user.id },
  });

  await prisma.order.update({
    where: { id: order.id },
    data: { stripeSessionId: checkout.id },
  });

  return NextResponse.json({ url: checkout.url, orderId: order.id });
}
