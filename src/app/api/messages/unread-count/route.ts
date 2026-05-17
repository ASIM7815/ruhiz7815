import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { supabaseAdmin } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/messages/unread-count — get total unread message count
export async function GET() {
  const { user, error } = await requireAuth();
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = user.id;

  // Get conversation IDs where user is a participant
  const { data: participations } = await supabaseAdmin
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", userId);

  if (!participations || participations.length === 0) {
    return NextResponse.json({ unreadCount: 0 });
  }

  const conversationIds = participations.map((p) => p.conversation_id);

  // Count unread messages across all conversations
  const { count } = await supabaseAdmin
    .from("direct_messages")
    .select("id", { count: "exact", head: true })
    .in("conversation_id", conversationIds)
    .neq("sender_id", userId)
    .eq("is_read", false);

  return NextResponse.json({ unreadCount: count ?? 0 });
}
