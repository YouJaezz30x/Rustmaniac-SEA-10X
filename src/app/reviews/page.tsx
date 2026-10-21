import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { ReviewsClient } from "@/components/reviews-client";

export const metadata: Metadata = { title: "Reviews" };
export const dynamic = "force-dynamic";

export default async function ReviewsPage() {
  const reviews = await prisma.review.findMany({
    where: { approved: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="page">
      <h1 className="page__title">Player reviews</h1>
      <p className="page__lead">What SEA raiders say about the wipe, VIP kits, and plugins.</p>
      <ReviewsClient initial={reviews} />
    </div>
  );
}
