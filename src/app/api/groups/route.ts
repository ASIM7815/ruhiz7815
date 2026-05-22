
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { supabaseAdmin } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/groups — list user's group conversations
export async function GET() {
  const { user, error } = await requireAuth();
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get all groups where user is a participant
  const { data: participations, error: pErr } = await supabaseAdmin
    .from("group_participants")
    .select("conversation_id, role")
    .eq("user_id", user.id);

  if (pErr || !participations?.length) {
    return NextResponse.json([]);
  }

  const convIds = participations.map((p) => p.conversation_id);
  const roleMap = Object.fromEntries(
    participations.map((p) => [p.conversation_id, p.role])
  );

  // Get conversation details
  const { data: conversations, error: cErr } = await supabaseAdmin
    .from("group_conversations")
    .select("*")
    .in("id", convIds)
    .order("updated_at", { ascending: false });

  if (cErr) {
    return NextResponse.json({ error: "Failed to load groups" }, { status: 500 });
  }

  // Get last message + participant count for each conversation
  const results = await Promise.all(
    (conversations || []).map(async (conv) => {
      const { data: lastMsg } = await supabaseAdmin
        .from("group_messages")
        .select("content, sender_id, created_at, message_type")
        .eq("conversation_id", conv.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      const { count } = await supabaseAdmin
        .from("group_participants")
        .select("id", { count: "exact", head: true })
        .eq("conversation_id", conv.id);

      const sourceType = conv.type ?? conv.source_type ?? null;
      const sourceId = conv.entity_id ?? conv.source_id ?? null;
      const memberCount = count || 0;
      const lastMessageText = lastMsg?.content ?? null;
      const lastMessageAt = lastMsg?.created_at ?? null;

      return {
        ...conv,
        source_type: sourceType,
        source_id: sourceId,
        role: roleMap[conv.id],
        member_count: memberCount,
        memberCount,
        last_message: lastMessageText,
        last_message_at: lastMessageAt,
        lastMessage: lastMsg || null,
      };
    })
  );

  return NextResponse.json(results);
}
