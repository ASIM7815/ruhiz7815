
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { supabaseAdmin } from "@/lib/supabase-server";
import { db } from "@/lib/db";
import { createNotification } from "@/lib/services/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PATCH /api/groups/[id]/members/[userId] — change role or media permissions (admin only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const { user, error } = await requireAuth();
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, userId } = await params;

  // Verify admin
  const { data: myParticipant } = await supabaseAdmin
    .from("group_participants")
    .select("role")
    .eq("conversation_id", id)
    .eq("user_id", user.id)
    .single();

  if (!myParticipant || myParticipant.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const body = await req.json();
  const updates: Record<string, unknown> = {};

  if (body.role && ["ADMIN", "MEMBER"].includes(body.role)) {
    updates.role = body.role;
  }
  if (typeof body.canShareMedia === "boolean") {
    updates.can_share_media = body.canShareMedia;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No updates" }, { status: 400 });
  }

  const { data: conversation } = await supabaseAdmin
    .from("group_conversations")
    .select("type, entity_id, name")
    .eq("id", id)
    .single();

  const { error: dbError } = await supabaseAdmin
    .from("group_participants")
    .update(updates)
    .eq("conversation_id", id)
    .eq("user_id", userId);

  if (dbError) {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }

  if (conversation?.type === "PROJECT" && updates.role) {
    await db.projectMember
      .update({
        where: { projectId_userId: { projectId: conversation.entity_id, userId } },
        data: { role: updates.role === "ADMIN" ? "ADMIN" : "MEMBER" },
      })
      .catch(() => null);

    await createNotification({
      userId,
      type: "PROJECT_ROLE_CHANGED",
      title: "Project role updated",
      message: `Your role in "${conversation.name}" is now ${updates.role}.`,
      link: `/projects/${conversation.entity_id}/workspace`,
      actorId: user.id,
      entityType: "PROJECT",
      entityId: conversation.entity_id,
    });
  }

  return NextResponse.json({ success: true });
}

// DELETE /api/groups/[id]/members/[userId] — remove member (admin only)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const { user, error } = await requireAuth();
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, userId } = await params;

  // Verify admin  
  const { data: myParticipant } = await supabaseAdmin
    .from("group_participants")
    .select("role")
    .eq("conversation_id", id)
    .eq("user_id", user.id)
    .single();

  if (!myParticipant || myParticipant.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  // Cannot remove yourself as admin
  if (userId === user.id) {
    return NextResponse.json({ error: "Cannot remove yourself" }, { status: 400 });
  }

  const { data: conversation } = await supabaseAdmin
    .from("group_conversations")
    .select("type, entity_id, name")
    .eq("id", id)
    .single();

  const { error: dbError } = await supabaseAdmin
    .from("group_participants")
    .delete()
    .eq("conversation_id", id)
    .eq("user_id", userId);

  if (dbError) {
    return NextResponse.json({ error: "Failed to remove" }, { status: 500 });
  }

  if (conversation?.type === "PROJECT") {
    await db.projectMember
      .update({
        where: { projectId_userId: { projectId: conversation.entity_id, userId } },
        data: { status: "REMOVED", removedAt: new Date() },
      })
      .catch(() => null);

    await createNotification({
      userId,
      type: "PROJECT_MEMBER_REMOVED",
      title: "Removed from project",
      message: `You were removed from "${conversation.name}".`,
      link: `/projects/${conversation.entity_id}`,
      actorId: user.id,
      entityType: "PROJECT",
      entityId: conversation.entity_id,
    });
  }

  return NextResponse.json({ success: true });
}
