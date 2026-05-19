
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { supabaseAdmin as supabase } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error, status } = await requireAuth();
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const listing = await db.listing.findUnique({
    where: { id },
    include: { seller: { select: { id: true, name: true } } },
  });

  if (!listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  if (listing.sellerId === user.id) {
    return NextResponse.json({ error: "Cannot buy your own listing" }, { status: 400 });
  }

  const buyerId = user.id;
  const sellerId = listing.sellerId;

  // Check for existing conversation between buyer and seller
  const { data: existingConvs } = await supabase
    .from("conversations")
    .select("id, participant1_id, participant2_id")
    .or(
      `and(participant1_id.eq.${buyerId},participant2_id.eq.${sellerId}),and(participant1_id.eq.${sellerId},participant2_id.eq.${buyerId})`
    );

  let conversationId: string;

  if (existingConvs && existingConvs.length > 0) {
    conversationId = existingConvs[0].id;
  } else {
    // Create new conversation
    const { data: newConv, error } = await supabase
      .from("conversations")
      .insert({
        participant1_id: buyerId,
        participant2_id: sellerId,
      })
      .select("id")
      .single();

    if (error || !newConv) {
      return NextResponse.json({ error: "Failed to create conversation" }, { status: 500 });
    }
    conversationId = newConv.id;
  }

  // Send auto-message about the listing
  await supabase.from("direct_messages").insert({
    conversation_id: conversationId,
    sender_id: buyerId,
    content: `Hi! I'm interested in your listing: "${listing.title}" (₹${listing.price}). Is it still available?`,
  });

  return NextResponse.json({ conversationId });
}
