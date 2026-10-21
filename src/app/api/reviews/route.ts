import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { rateLimit, requireCsrf, sanitizeText } from "@/lib/security";

export async function GET() {
  const reviews = await prisma.review.findMany({
    where: { approved: true },
    orderBy: { createdAt: "desc" },
    take: 40,
  });
  return NextResponse.json(reviews);
}

const schema = z.object({
  author: z.string().min(2).max(64),
  rating: z.number().int().min(1).max(5),
  body: z.string().min(10).max(1000),
});

export async function POST(req: Request) {
  const session = await requireUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limited = await rateLimit(`review:${session.user.id}`, 5, 3600_000);
  if (!limited.ok) {
    return NextResponse.json({ error: "Too many reviews" }, { status: 429 });
  }
  if (!(await requireCsrf(req.headers.get("x-csrf-token")))) {
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const review = await prisma.review.create({
    data: {
      userId: session.user.id,
      author: sanitizeText(parsed.data.author, 64),
      rating: parsed.data.rating,
      body: sanitizeText(parsed.data.body),
      approved: false,
    },
  });

  return NextResponse.json(review);
}
