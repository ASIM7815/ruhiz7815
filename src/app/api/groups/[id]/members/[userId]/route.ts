
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { supabaseAdmin } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PATCH /api/groups/[id]/members/[userId] — change role or media permissions (admin only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const { user, error, status } = await requireAuth();
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

  const { error: dbError } = await supabaseAdmin
    .from("group_participants")
    .update(updates)
    .eq("conversation_id", id)
    .eq("user_id", userId);

  if (dbError) {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// DELETE /api/groups/[id]/members/[userId] — remove member (admin only)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const { user, error, status } = await requireAuth();
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

  const { error: dbError } = await supabaseAdmin
    .from("group_participants")
    .delete()
    .eq("conversation_id", id)
    .eq("user_id", userId);

  if (dbError) {
    return NextResponse.json({ error: "Failed to remove" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
