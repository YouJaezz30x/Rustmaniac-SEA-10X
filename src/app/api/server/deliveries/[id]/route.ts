import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isGameServer } from "@/lib/server-auth";
import { completeOrderIfDelivered } from "@/lib/fulfillment";
import { notifyDiscord } from "@/lib/discord";

type Params = { params: Promise<{ id: string }> };

const schema = z.object({
  ok: z.boolean(),
  result: z.string().max(500),
});

/** The plugin reports back after running `vip give` for a delivery. */
export async function POST(req: Request, { params }: Params) {
  if (!isGameServer(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { id } = await params;
  const delivery = await prisma.delivery.findUnique({ where: { id } });
  if (!delivery) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (delivery.status === "DELIVERED") return NextResponse.json({ ok: true });

  const attempts = delivery.attempts + 1;
  const status = parsed.data.ok ? "DELIVERED" : attempts >= 5 ? "FAILED" : "PENDING";
  await prisma.delivery.update({
    where: { id },
    data: {
      status,
      attempts,
      result: parsed.data.result,
      deliveredAt: parsed.data.ok ? new Date() : null,
    },
  });

  if (status === "DELIVERED") await completeOrderIfDelivered(delivery.orderId);
  if (status === "FAILED") {
    await notifyDiscord(
      "⚠️ VIP delivery failed",
      `Steam \`${delivery.steamId}\` · ${delivery.tier}\n${parsed.data.result}\nOrder \`${delivery.orderId}\` — retry it from the website admin.`,
      0xe06666
    );
  }
  return NextResponse.json({ ok: true, status });
}
