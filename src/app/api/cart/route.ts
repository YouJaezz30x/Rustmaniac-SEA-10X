import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { requireCsrf } from "@/lib/security";
import { vipPriceCents } from "@/lib/pricing";
import type { DurationKey } from "@/lib/brand";

export async function GET() {
  const session = await requireUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = await prisma.cartItem.findMany({
    where: { userId: session.user.id },
    include: { vipPackage: true, plugin: true },
    orderBy: { createdAt: "desc" },
  });

  const mapped = items.map((item) => {
    let unitCents = 0;
    let name = "";
    if (item.kind === "vip" && item.vipPackage && item.duration) {
      unitCents = vipPriceCents(item.vipPackage, item.duration as DurationKey);
      name = item.vipPackage.name;
    } else if (item.kind === "plugin" && item.plugin) {
      unitCents = item.plugin.priceCents;
      name = item.plugin.name;
    }
    return { ...item, unitCents, name, lineCents: unitCents * item.quantity };
  });

  const totalCents = mapped.reduce((s, i) => s + i.lineCents, 0);
  return NextResponse.json({ items: mapped, totalCents });
}

const addSchema = z.object({
  kind: z.enum(["vip", "plugin"]),
  vipPackageId: z.string().optional(),
  pluginId: z.string().optional(),
  duration: z.enum(["ONE_MONTH", "THREE_MONTHS", "PERMANENT"]).optional(),
  quantity: z.number().int().min(1).max(10).default(1),
});

export async function POST(req: Request) {
  const session = await requireUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await requireCsrf(req.headers.get("x-csrf-token")))) {
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
  }

  const parsed = addSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const data = parsed.data;
  if (data.kind === "vip") {
    if (!data.vipPackageId || !data.duration) {
      return NextResponse.json({ error: "VIP requires package and duration" }, { status: 400 });
    }
    const pkg = await prisma.vipPackage.findFirst({
      where: { id: data.vipPackageId, active: true },
    });
    if (!pkg) return NextResponse.json({ error: "Package not found" }, { status: 404 });
  } else {
    if (!data.pluginId) {
      return NextResponse.json({ error: "Plugin id required" }, { status: 400 });
    }
    const plugin = await prisma.plugin.findFirst({
      where: { id: data.pluginId, active: true },
    });
    if (!plugin) return NextResponse.json({ error: "Plugin not found" }, { status: 404 });
  }

  const item = await prisma.cartItem.create({
    data: {
      userId: session.user.id,
      kind: data.kind,
      vipPackageId: data.vipPackageId,
      pluginId: data.pluginId,
      duration: data.duration,
      quantity: data.quantity,
    },
  });

  return NextResponse.json({ item });
}

export async function DELETE(req: Request) {
  const session = await requireUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await requireCsrf(req.headers.get("x-csrf-token")))) {
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await prisma.cartItem.deleteMany({ where: { id, userId: session.user.id } });
  return NextResponse.json({ ok: true });
}
