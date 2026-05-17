import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/resources/[id]/reviews - List reviews for a resource
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const reviews = await db.review.findMany({
    where: { resourceId: id },
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
    },
  });

  return NextResponse.json({
    reviews: reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt.toISOString(),
      user: r.user,
    })),
  });
}

// POST /api/resources/[id]/reviews - Create a review
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuth();
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { rating, comment } = body;

  // Validate rating
  if (!rating || typeof rating !== "number" || rating < 1 || rating > 5) {
    return NextResponse.json(
      { error: "Rating must be between 1 and 5" },
      { status: 400 }
    );
  }

  // Check if resource exists
  const resource = await db.resource.findUnique({
    where: { id },
    select: { authorId: true },
  });

  if (!resource) {
    return NextResponse.json({ error: "Resource not found" }, { status: 404 });
  }

  // Can't review own resource
  if (resource.authorId === user.id) {
    return NextResponse.json(
      { error: "Cannot review your own resource" },
      { status: 400 }
    );
  }

  // Check if user already reviewed
  const existing = await db.review.findUnique({
    where: {
      resourceId_userId: {
        resourceId: id,
        userId: user.id,
      },
    },
  });

  if (existing) {
    return NextResponse.json(
      { error: "You have already reviewed this resource" },
      { status: 400 }
    );
  }

  // Create review
  const review = await db.review.create({
    data: {
      resourceId: id,
      userId: user.id,
      rating,
      comment: comment || null,
    },
  });

  // Update resource average rating
  const allReviews = await db.review.findMany({
    where: { resourceId: id },
    select: { rating: true },
  });

  const avgRating =
    allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

  await db.resource.update({
    where: { id },
    data: { rating: avgRating },
  });

  return NextResponse.json({ id: review.id }, { status: 201 });
}
