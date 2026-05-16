
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { supabaseAdmin } from "@/lib/supabase-server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/groups/[id]/leave — leave group
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuth();
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

  const { data: conversation } = await supabaseAdmin
    .from("group_conversations")
    .select("type, entity_id")
    .eq("id", id)
    .single();

  if (conversation?.type === "PROJECT") {
    const project = await db.project.findUnique({
      where: { id: conversation.entity_id },
      select: { ownerId: true },
    });

    if (project?.ownerId === user.id) {
      return NextResponse.json({ error: "Project creator cannot leave the project group" }, { status: 400 });
    }
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

  if (conversation?.type === "PROJECT") {
    await db.projectMember
      .update({
        where: { projectId_userId: { projectId: conversation.entity_id, userId: user.id } },
        data: { status: "LEFT", removedAt: new Date() },
      })
      .catch(() => null);
  }

  return NextResponse.json({ success: true });
}
