
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { supabaseAdmin } from "@/lib/supabase-server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/groups/[id]/members — list members for participants
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuth();
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Get current user's role
  const { data: myParticipant } = await supabaseAdmin
    .from("group_participants")
    .select("role")
    .eq("conversation_id", id)
    .eq("user_id", user.id)
    .single();

  if (!myParticipant) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  // Get all participants
  const { data: participants, error: dbError } = await supabaseAdmin
    .from("group_participants")
    .select("*")
    .eq("conversation_id", id)
    .order("joined_at", { ascending: true });

  if (dbError) {
    return NextResponse.json({ error: "Failed to load members" }, { status: 500 });
  }

  // Fetch user details so group messages can show useful sender names.
  const userIds = (participants || []).map((p) => p.user_id);
  const users = await db.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, image: true, uid: true, university: true },
  });
  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

  const members = (participants || []).map((p) => ({
    ...p,
    user: userMap[p.user_id] || { id: p.user_id, name: "Unknown", image: null, uid: null },
  }));

  return NextResponse.json({
    count: members.length,
    myRole: myParticipant.role,
    members,
  });
}

// POST /api/groups/[id]/members — add member (admin only)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuth();
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

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

  const { userId } = await req.json();
  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  // Check if already a member
  const { data: existing } = await supabaseAdmin
    .from("group_participants")
    .select("id")
    .eq("conversation_id", id)
    .eq("user_id", userId)
    .single();

  if (existing) {
    return NextResponse.json({ error: "Already a member" }, { status: 409 });
  }

  const { error: dbError } = await supabaseAdmin
    .from("group_participants")
    .insert({
      conversation_id: id,
      user_id: userId,
      role: "MEMBER",
    });

  if (dbError) {
    return NextResponse.json({ error: "Failed to add member" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
