import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { requireCsrf, sanitizeText } from "@/lib/security";

type Params = { params: Promise<{ resource: string }> };

async function guard(req: Request) {
  const session = await requireAdmin();
  if (!session) return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  if (req.method !== "GET" && !(await requireCsrf(req.headers.get("x-csrf-token")))) {
    return { error: NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 }) };
  }
  return { session };
}

export async function GET(_req: Request, { params }: Params) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { resource } = await params;
  switch (resource) {
    case "packages":
      return NextResponse.json(await prisma.vipPackage.findMany({ orderBy: { sortOrder: "asc" } }));
    case "plugins":
      return NextResponse.json(await prisma.plugin.findMany({ orderBy: { sortOrder: "asc" } }));
    case "staff":
      return NextResponse.json(await prisma.staff.findMany({ orderBy: { sortOrder: "asc" } }));
    case "rules":
      return NextResponse.json(await prisma.rule.findMany({ orderBy: { sortOrder: "asc" } }));
    case "announcements":
      return NextResponse.json(
        await prisma.announcement.findMany({ orderBy: { createdAt: "desc" } })
      );
    case "orders":
      return NextResponse.json(
        await prisma.order.findMany({
          include: { items: true },
          orderBy: { createdAt: "desc" },
          take: 50,
        })
      );
    case "reviews":
      return NextResponse.json(await prisma.review.findMany({ orderBy: { createdAt: "desc" } }));
    default:
      return NextResponse.json({ error: "Unknown resource" }, { status: 404 });
  }
}

export async function POST(req: Request, { params }: Params) {
  const g = await guard(req);
  if (g.error) return g.error;

  const { resource } = await params;
  const body = await req.json().catch(() => null);

  switch (resource) {
    case "packages": {
      const schema = z.object({
        slug: z.string().min(2).max(64),
        name: z.string().min(2).max(64),
        tier: z.string().min(2).max(32),
        description: z.string().min(2).max(1000),
        features: z.array(z.string()).default([]),
        priceMonth: z.number().int().min(0),
        priceThree: z.number().int().min(0),
        pricePerm: z.number().int().min(0),
        active: z.boolean().optional(),
        sortOrder: z.number().int().optional(),
      });
      const parsed = schema.safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
      const created = await prisma.vipPackage.create({
        data: {
          ...parsed.data,
          description: sanitizeText(parsed.data.description),
          features: JSON.stringify(parsed.data.features),
        },
      });
      return NextResponse.json(created);
    }
    case "plugins": {
      const schema = z.object({
        slug: z.string().min(2).max(64),
        name: z.string().min(2).max(64),
        description: z.string().min(2).max(1000),
        priceCents: z.number().int().min(0),
        version: z.string().optional(),
        active: z.boolean().optional(),
        sortOrder: z.number().int().optional(),
      });
      const parsed = schema.safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
      const created = await prisma.plugin.create({
        data: {
          ...parsed.data,
          description: sanitizeText(parsed.data.description),
        },
      });
      return NextResponse.json(created);
    }
    case "staff": {
      const schema = z.object({
        name: z.string().min(2).max(64),
        role: z.string().min(2).max(64),
        steamId: z.string().optional(),
        avatarUrl: z.string().url().optional().or(z.literal("")),
        sortOrder: z.number().int().optional(),
        active: z.boolean().optional(),
      });
      const parsed = schema.safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
      const created = await prisma.staff.create({
        data: {
          ...parsed.data,
          name: sanitizeText(parsed.data.name, 64),
          avatarUrl: parsed.data.avatarUrl || null,
        },
      });
      return NextResponse.json(created);
    }
    case "rules": {
      const schema = z.object({
        category: z.string().min(2).max(64),
        title: z.string().min(2).max(120),
        body: z.string().min(2).max(2000),
        sortOrder: z.number().int().optional(),
        active: z.boolean().optional(),
      });
      const parsed = schema.safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
      const created = await prisma.rule.create({
        data: {
          ...parsed.data,
          title: sanitizeText(parsed.data.title, 120),
          body: sanitizeText(parsed.data.body),
        },
      });
      return NextResponse.json(created);
    }
    case "announcements": {
      const schema = z.object({
        title: z.string().min(2).max(120),
        body: z.string().min(2).max(2000),
        pinned: z.boolean().optional(),
        active: z.boolean().optional(),
      });
      const parsed = schema.safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
      const created = await prisma.announcement.create({
        data: {
          ...parsed.data,
          title: sanitizeText(parsed.data.title, 120),
          body: sanitizeText(parsed.data.body),
        },
      });
      return NextResponse.json(created);
    }
    case "orders": {
      const schema = z.object({
        id: z.string(),
        status: z.enum(["PENDING", "PAID", "FULFILLED", "CANCELLED", "REFUNDED"]),
      });
      const parsed = schema.safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
      const updated = await prisma.order.update({
        where: { id: parsed.data.id },
        data: {
          status: parsed.data.status,
          fulfilledAt: parsed.data.status === "FULFILLED" ? new Date() : undefined,
        },
      });
      return NextResponse.json(updated);
    }
    case "reviews": {
      const schema = z.object({
        id: z.string(),
        approved: z.boolean(),
      });
      const parsed = schema.safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
      const updated = await prisma.review.update({
        where: { id: parsed.data.id },
        data: { approved: parsed.data.approved },
      });
      return NextResponse.json(updated);
    }
    default:
      return NextResponse.json({ error: "Unknown resource" }, { status: 404 });
  }
}

export async function PATCH(req: Request, { params }: Params) {
  const g = await guard(req);
  if (g.error) return g.error;

  const { resource } = await params;
  const body = await req.json().catch(() => null);
  const id = body?.id as string | undefined;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  switch (resource) {
    case "packages": {
      const { id: ignoredId, features, ...rest } = body;
      void ignoredId;
      const updated = await prisma.vipPackage.update({
        where: { id },
        data: {
          ...rest,
          features: Array.isArray(features) ? JSON.stringify(features) : features,
        },
      });
      return NextResponse.json(updated);
    }
    case "plugins":
      return NextResponse.json(
        await prisma.plugin.update({ where: { id }, data: { ...body, id: undefined } })
      );
    case "staff":
      return NextResponse.json(
        await prisma.staff.update({ where: { id }, data: { ...body, id: undefined } })
      );
    case "rules":
      return NextResponse.json(
        await prisma.rule.update({ where: { id }, data: { ...body, id: undefined } })
      );
    case "announcements":
      return NextResponse.json(
        await prisma.announcement.update({ where: { id }, data: { ...body, id: undefined } })
      );
    default:
      return NextResponse.json({ error: "Unknown resource" }, { status: 404 });
  }
}

export async function DELETE(req: Request, { params }: Params) {
  const g = await guard(req);
  if (g.error) return g.error;

  const { resource } = await params;
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  switch (resource) {
    case "packages":
      await prisma.vipPackage.delete({ where: { id } });
      break;
    case "plugins":
      await prisma.plugin.delete({ where: { id } });
      break;
    case "staff":
      await prisma.staff.delete({ where: { id } });
      break;
    case "rules":
      await prisma.rule.delete({ where: { id } });
      break;
    case "announcements":
      await prisma.announcement.delete({ where: { id } });
      break;
    default:
      return NextResponse.json({ error: "Unknown resource" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
