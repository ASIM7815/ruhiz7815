
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { supabaseAdmin } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function findExistingConversationId(userId: string, targetUserId: string) {
  const { data: myParts } = await supabaseAdmin
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", userId);

  if (!myParts || myParts.length === 0) {
    return null;
  }

  const myConversationIds = myParts.map((part) => part.conversation_id);
  const { data: shared } = await supabaseAdmin
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", targetUserId)
    .in("conversation_id", myConversationIds)
    .limit(1);

  return shared?.[0]?.conversation_id ?? null;
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuth();
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

  let conversationId = await findExistingConversationId(buyerId, sellerId);

  if (!conversationId) {
    const { data: newConv, error: conversationError } = await supabaseAdmin
      .from("conversations")
      .insert({})
      .select("id")
      .single();

    if (conversationError || !newConv) {
      return NextResponse.json({ error: "Failed to create conversation" }, { status: 500 });
    }

    conversationId = newConv.id;

    const { error: participantsError } = await supabaseAdmin
      .from("conversation_participants")
      .insert([
        { conversation_id: conversationId, user_id: buyerId },
        { conversation_id: conversationId, user_id: sellerId },
      ]);

    if (participantsError) {
      await supabaseAdmin.from("conversations").delete().eq("id", conversationId);
      return NextResponse.json({ error: "Failed to add conversation participants" }, { status: 500 });
    }
  }

  const { error: messageError } = await supabaseAdmin
    .from("direct_messages")
    .insert({
      conversation_id: conversationId,
      sender_id: buyerId,
      content: `Hi! I'm interested in your listing: "${listing.title}" (₹${listing.price}). Is it still available?`,
    });

  if (messageError) {
    return NextResponse.json({ error: "Failed to send message to seller" }, { status: 500 });
  }

  await supabaseAdmin
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);

  return NextResponse.json({ conversationId });
}
