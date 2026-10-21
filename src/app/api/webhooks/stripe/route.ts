import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { queueDeliveries } from "@/lib/fulfillment";
import { notifyDiscord } from "@/lib/discord";
import { formatMoney } from "@/lib/pricing";

export const runtime = "nodejs";

// Stripe retries and may deliver events out of order, so every status change below only moves an
// order forward from the state it is expected to be in.

async function handlePaid(stripe: Stripe, session: Stripe.Checkout.Session) {
  const orderId = session.metadata?.orderId;
  if (!orderId || session.payment_status !== "paid") return;

  const paymentIntent =
    typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
  const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
  const invoiceId = typeof session.invoice === "string" ? session.invoice : session.invoice?.id;

  let invoice: Stripe.Invoice | null = null;
  if (invoiceId) {
    invoice = await stripe.invoices.retrieve(invoiceId).catch(() => null);
  }

  await prisma.order.updateMany({
    where: { id: orderId, status: "PENDING" },
    data: { status: "PAID" },
  });
  const order = await prisma.order.update({
    where: { id: orderId },
    data: {
      email: session.customer_details?.email ?? undefined,
      stripePaymentIntent: paymentIntent,
      stripeInvoiceId: invoiceId ?? undefined,
      invoiceUrl: invoice?.hosted_invoice_url ?? undefined,
      invoicePdf: invoice?.invoice_pdf ?? undefined,
    },
  });

  if (order.userId) {
    await prisma.cartItem.deleteMany({ where: { userId: order.userId } });
    if (customerId) {
      await prisma.user.updateMany({
        where: { id: order.userId, stripeCustomerId: null },
        data: { stripeCustomerId: customerId },
      });
    }
  }
  if (order.status === "PAID") await queueDeliveries(order.id);
}

async function handleUnpaid(session: Stripe.Checkout.Session) {
  const orderId = session.metadata?.orderId;
  if (!orderId) return;
  await prisma.order.updateMany({
    where: { id: orderId, status: "PENDING" },
    data: { status: "CANCELLED" },
  });
}

async function handleRefund(charge: Stripe.Charge) {
  const paymentIntent =
    typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
  if (!paymentIntent) return;
  const order = await prisma.order.findFirst({ where: { stripePaymentIntent: paymentIntent } });
  if (!order || order.status === "REFUNDED") return;

  const fullyRefunded = charge.amount_refunded >= charge.amount;
  if (fullyRefunded) {
    await prisma.order.update({ where: { id: order.id }, data: { status: "REFUNDED" } });
  }
  await notifyDiscord(
    fullyRefunded ? "↩️ Order refunded" : "↩️ Partial refund",
    `**${order.displayName ?? "Player"}**${order.steamId ? ` (\`${order.steamId}\`)` : ""}\nRefunded ${formatMoney(charge.amount_refunded, charge.currency)} of ${formatMoney(charge.amount, charge.currency)}\nOrder \`${order.id}\`${order.steamId ? `\nRemove the rank in #vip-manager if needed: \`!vip remove ${order.steamId}\`` : ""}`,
    0x95a5a6
  );
}

export async function POST(req: Request) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripeKey || !webhookSecret) {
    return NextResponse.json({ error: "Stripe webhook not configured" }, { status: 501 });
  }

  const stripe = new Stripe(stripeKey);
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const rawBody = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      await handlePaid(stripe, event.data.object);
      break;
    case "checkout.session.async_payment_failed":
    case "checkout.session.expired":
      await handleUnpaid(event.data.object);
      break;
    case "charge.refunded":
      await handleRefund(event.data.object);
      break;
  }

  return NextResponse.json({ received: true });
}
