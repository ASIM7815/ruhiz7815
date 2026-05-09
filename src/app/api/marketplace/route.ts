
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const category = searchParams.get("category");
  const cursor = searchParams.get("cursor");
  const sellerFilter = searchParams.get("seller");
  const take = 12;

  const where: Record<string, unknown> = { sold: false };
  if (category) where.category = category;

  if (sellerFilter === "me") {
    const { user, error, status } = await requireAuth();
    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    where.sellerId = user.id;
    delete where.sold; // Show all own listings including sold
  }

  const listings = await db.listing.findMany({
    where,
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: { createdAt: "desc" },
    include: {
      seller: { select: { id: true, name: true, image: true, university: true, uid: true } },
    },
  });

  const hasMore = listings.length > take;
  const items = hasMore ? listings.slice(0, take) : listings;

  return NextResponse.json({
    listings: items.map((l) => ({
      id: l.id,
      title: l.title,
      description: l.description,
      price: l.price,
      category: l.category,
      condition: l.condition,
      imageUrl: l.imageUrl,
      sold: l.sold,
      createdAt: l.createdAt,
      seller: l.seller,
    })),
    nextCursor: hasMore ? items[items.length - 1].id : null,
  });
}

export async function POST(req: NextRequest) {
  const { user, error, status } = await requireAuth();
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { title, description, price, category, condition, imageUrl } = body;

  if (!title || price == null || !category) {
    return NextResponse.json({ error: "Title, price, and category are required" }, { status: 400 });
  }

  if (!["BOOK", "GADGET", "SERVICE"].includes(category)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  const listing = await db.listing.create({
    data: {
      title,
      description: description || null,
      price: parseFloat(price),
      category,
      condition: condition || null,
      imageUrl: imageUrl || null,
      sellerId: user.id,
    },
  });

  return NextResponse.json({ id: listing.id }, { status: 201 });
}
