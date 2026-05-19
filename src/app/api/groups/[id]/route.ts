
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { supabaseAdmin } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/groups/[id] — get group details
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error, status } = await requireAuth();
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Verify user is a participant
  const { data: participant } = await supabaseAdmin
    .from("group_participants")
    .select("role, can_share_media")
    .eq("conversation_id", id)
    .eq("user_id", user.id)
    .single();

  if (!participant) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  const { data: conv, error: convError } = await supabaseAdmin
    .from("group_conversations")
    .select("*")
    .eq("id", id)
    .single();

  if (convError || !conv) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  return NextResponse.json({
    ...conv,
    myRole: participant.role,
    canShareMedia: participant.can_share_media,
  });
}

// PATCH /api/groups/[id] — update group settings (admin only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error, status } = await requireAuth();
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Verify admin
  const { data: participant } = await supabaseAdmin
    .from("group_participants")
    .select("role")
    .eq("conversation_id", id)
    .eq("user_id", user.id)
    .single();

  if (!participant || participant.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const body = await req.json();
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.name) updates.name = String(body.name).slice(0, 100);
  if (body.image_url) updates.image_url = body.image_url;

  const { error: dbError } = await supabaseAdmin
    .from("group_conversations")
    .update(updates)
    .eq("id", id);

  if (dbError) {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
