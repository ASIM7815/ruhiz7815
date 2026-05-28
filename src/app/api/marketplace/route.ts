
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { deleteFromGCS, uploadToGCS } from "@/lib/gcs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_CATEGORIES = ["BOOK", "GADGET", "SERVICE"] as const;
const VALID_CONDITIONS = ["NEW", "LIKE_NEW", "GOOD", "FAIR"] as const;
const MARKETPLACE_IMAGE_LIMIT = 5 * 1024 * 1024;
const MARKETPLACE_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

const EXT_MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

type RawListingInput = {
  title: unknown;
  description: unknown;
  price: unknown;
  category: unknown;
  condition: unknown;
  imageUrl: unknown;
};

type ListingInput = {
  title: string;
  description: string | null;
  price: number;
  category: (typeof VALID_CATEGORIES)[number];
  condition: (typeof VALID_CONDITIONS)[number] | null;
  imageUrl: string | null;
};

function cleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function cleanOptionalString(value: unknown): string | null {
  const cleaned = cleanString(value);
  return cleaned ? cleaned : null;
}

function parsePrice(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const cleaned = cleanString(value);
  if (!cleaned) return null;

  const price = Number(cleaned);
  return Number.isFinite(price) ? price : null;
}

function normalizeListingInput(raw: RawListingInput): ListingInput | NextResponse {
  const title = cleanString(raw.title);
  const description = cleanOptionalString(raw.description);
  const price = parsePrice(raw.price);
  const category = cleanString(raw.category).toUpperCase();
  const condition = cleanOptionalString(raw.condition)?.toUpperCase() ?? null;
  const imageUrl = cleanOptionalString(raw.imageUrl);

  if (!title || price == null || !category) {
    return NextResponse.json({ error: "Title, price, and category are required" }, { status: 400 });
  }

  if (price < 0) {
    return NextResponse.json({ error: "Price cannot be negative" }, { status: 400 });
  }

  if (!VALID_CATEGORIES.includes(category as (typeof VALID_CATEGORIES)[number])) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  if (condition && !VALID_CONDITIONS.includes(condition as (typeof VALID_CONDITIONS)[number])) {
    return NextResponse.json({ error: "Invalid condition" }, { status: 400 });
  }

  return {
    title,
    description,
    price,
    category: category as (typeof VALID_CATEGORIES)[number],
    condition: condition as (typeof VALID_CONDITIONS)[number] | null,
    imageUrl,
  };
}

function resolveImageMime(file: File): string {
  if (file.type) return file.type;
  const ext = path.extname(file.name).toLowerCase();
  return EXT_MIME[ext] ?? "application/octet-stream";
}

function getImageFile(value: FormDataEntryValue | null): File | null {
  return value instanceof File && value.size > 0 ? value : null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const category = searchParams.get("category");
  const cursor = searchParams.get("cursor");
  const sellerFilter = searchParams.get("seller");
  const take = 12;

  const where: Record<string, unknown> = { sold: false };
  if (category) where.category = category;

  if (sellerFilter === "me") {
    const { user, error } = await requireAuth();
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
      createdAt: l.createdAt.toISOString(),
      seller: l.seller,
    })),
    nextCursor: hasMore ? items[items.length - 1].id : null,
  });
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentType = req.headers.get("content-type") ?? "";
  let raw: RawListingInput;
  let imageFile: File | null = null;

  if (contentType.toLowerCase().includes("multipart/form-data")) {
    const formData = await req.formData();
    raw = {
      title: formData.get("title"),
      description: formData.get("description"),
      price: formData.get("price"),
      category: formData.get("category"),
      condition: formData.get("condition"),
      imageUrl: formData.get("imageUrl"),
    };
    imageFile = getImageFile(formData.get("image"));
  } else {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    raw = {
      title: body.title,
      description: body.description,
      price: body.price,
      category: body.category,
      condition: body.condition,
      imageUrl: body.imageUrl,
    };
  }

  const input = normalizeListingInput(raw);
  if (input instanceof NextResponse) {
    return input;
  }

  if (!imageFile && !input.imageUrl) {
    return NextResponse.json({ error: "Product image is required" }, { status: 400 });
  }

  let uploadedImageUrl: string | null = null;

  if (imageFile) {
    const mimeType = resolveImageMime(imageFile);

    if (!MARKETPLACE_IMAGE_TYPES.includes(mimeType)) {
      return NextResponse.json(
        { error: `File type "${mimeType}" not allowed for marketplace images` },
        { status: 400 }
      );
    }

    if (imageFile.size > MARKETPLACE_IMAGE_LIMIT) {
      return NextResponse.json({ error: "File too large. Maximum 5MB allowed" }, { status: 400 });
    }

    try {
      const buffer = Buffer.from(await imageFile.arrayBuffer());
      uploadedImageUrl = await uploadToGCS(buffer, imageFile.name, mimeType, "MARKETPLACE", user.id);
      input.imageUrl = uploadedImageUrl;
    } catch (uploadError) {
      console.error("[Marketplace] Error uploading image to Cloudflare R2:", uploadError);
      return NextResponse.json(
        { error: "Image upload failed. Check Cloudflare R2 configuration." },
        { status: 500 }
      );
    }
  }

  try {
    const listing = await db.listing.create({
      data: {
        title: input.title,
        description: input.description,
        price: input.price,
        category: input.category,
        condition: input.condition,
        imageUrl: input.imageUrl,
        sellerId: user.id,
      },
      include: {
        seller: { select: { id: true, name: true, image: true, university: true, uid: true } },
      },
    });

    return NextResponse.json(
      {
        id: listing.id,
        listing: {
          id: listing.id,
          title: listing.title,
          description: listing.description,
          price: listing.price,
          category: listing.category,
          condition: listing.condition,
          imageUrl: listing.imageUrl,
          sold: listing.sold,
          createdAt: listing.createdAt.toISOString(),
          seller: listing.seller,
        },
      },
      { status: 201 }
    );
  } catch (createError) {
    if (uploadedImageUrl) {
      await deleteFromGCS(uploadedImageUrl);
    }
    console.error("[Marketplace] Error creating listing:", createError);
    return NextResponse.json({ error: "Failed to create listing" }, { status: 500 });
  }
}
