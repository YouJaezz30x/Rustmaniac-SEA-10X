import { prisma } from "./prisma";
import { DURATION_DAYS, durationLabel, type DurationKey } from "./brand";
import { formatMoney } from "./pricing";
import { notifyDiscord } from "./discord";

/** Queues one in-game grant per VIP line item. Safe to call twice for the same order. */
export async function queueDeliveries(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { vipPackage: true } }, deliveries: true },
  });
  if (!order || order.deliveries.length > 0) return order;

  const steamId = order.steamId;
  const vipItems = order.items.filter((i) => i.kind === "vip" && i.vipPackage);
  if (steamId && vipItems.length > 0) {
    await prisma.delivery.createMany({
      data: vipItems.flatMap((item) =>
        Array.from({ length: item.quantity }, () => ({
          orderId: order.id,
          steamId,
          tier: item.vipPackage!.grantTier,
          days: DURATION_DAYS[(item.duration ?? "ONE_MONTH") as DurationKey] ?? null,
        }))
      ),
    });
  }

  const lines = order.items
    .map((i) => `• ${i.name}${i.duration ? ` (${durationLabel(i.duration)})` : ""} × ${i.quantity}`)
    .join("\n");
  await notifyDiscord(
    "🛒 New store purchase",
    `**${order.displayName ?? "Player"}**${steamId ? ` (\`${steamId}\`)` : ""}\n${lines}\nTotal **${formatMoney(order.totalCents, order.currency)}**\nOrder \`${order.id}\``
  );
  return order;
}

/** Marks the order FULFILLED once every delivery has been granted in game. */
export async function completeOrderIfDelivered(orderId: string) {
  const pending = await prisma.delivery.count({
    where: { orderId, status: { not: "DELIVERED" } },
  });
  if (pending > 0) return;
  await prisma.order.updateMany({
    where: { id: orderId, status: "PAID" },
    data: { status: "FULFILLED", fulfilledAt: new Date() },
  });
}
