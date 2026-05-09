
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { supabaseAdmin } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/groups/[id]/leave — leave group
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error, status } = await requireAuth();
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Check membership
  const { data: participant } = await supabaseAdmin
    .from("group_participants")
    .select("role")
    .eq("conversation_id", id)
    .eq("user_id", user.id)
    .single();

  if (!participant) {
    return NextResponse.json({ error: "Not a member" }, { status: 400 });
  }

  // If user is the only admin, they can't leave without assigning another admin
  if (participant.role === "ADMIN") {
    const { count } = await supabaseAdmin
      .from("group_participants")
      .select("id", { count: "exact", head: true })
      .eq("conversation_id", id)
      .eq("role", "ADMIN");

    if ((count || 0) <= 1) {
      // Check if there are other members to promote
      const { data: otherMembers } = await supabaseAdmin
        .from("group_participants")
        .select("user_id")
        .eq("conversation_id", id)
        .neq("user_id", user.id)
        .limit(1);

      if (otherMembers && otherMembers.length > 0) {
        // Promote the first other member to admin
        await supabaseAdmin
          .from("group_participants")
          .update({ role: "ADMIN" })
          .eq("conversation_id", id)
          .eq("user_id", otherMembers[0].user_id);
      }
    }
  }

  const { error: dbError } = await supabaseAdmin
    .from("group_participants")
    .delete()
    .eq("conversation_id", id)
    .eq("user_id", user.id);

  if (dbError) {
    return NextResponse.json({ error: "Failed to leave" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
