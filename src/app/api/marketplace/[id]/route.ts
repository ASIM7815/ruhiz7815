
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { deleteFromGCS, extractGCSPath } from "@/lib/gcs";
import { canCreateMarketplaceListing, canAccessMarketplace, isPlatformAdmin } from "@/lib/services/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET: Get listing details
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuth();
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canAccessMarketplace(user)) {
    return NextResponse.json({ error: "Marketplace access denied" }, { status: 403 });
  }

  const { id } = await params;

  const listing = await db.listing.findUnique({
    where: { id },
    include: {
      seller: {
        select: {
          id: true,
          name: true,
          image: true,
          university: true,
          uid: true,
        },
      },
    },
  });

  if (!listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: listing.id,
    title: listing.title,
    description: listing.description,
    price: listing.price,
    category: listing.category,
    condition: listing.condition,
    imageUrl: listing.imageUrl,
    sold: listing.sold,
    status: listing.status,
    createdAt: listing.createdAt.toISOString(),
    seller: listing.seller,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuth();
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const listing = await db.listing.findUnique({ where: { id } });

  if (!listing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (listing.sellerId !== user.id && !isPlatformAdmin(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (listing.sellerId === user.id && !canCreateMarketplaceListing(user)) {
    return NextResponse.json({ error: "Seller access is not enabled" }, { status: 403 });
  }

  const body = await req.json();
  const sold = body.sold;
  const listingStatus = typeof body.status === "string" ? body.status : undefined;

  const updated = await db.listing.update({
    where: { id },
    data: {
      ...(sold !== undefined ? { sold: !!sold, status: sold ? "SOLD" : listing.status } : {}),
      ...(listingStatus && isPlatformAdmin(user) ? { status: listingStatus } : {}),
    },
  });

  return NextResponse.json({ id: updated.id, sold: updated.sold });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuth();
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const listing = await db.listing.findUnique({ where: { id } });

  if (!listing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (listing.sellerId !== user.id && !isPlatformAdmin(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Delete image from GCS if present
  if (listing.imageUrl) {
    const gcsPath = extractGCSPath(listing.imageUrl);
    if (gcsPath) await deleteFromGCS(gcsPath);
  }

  await db.listing.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
