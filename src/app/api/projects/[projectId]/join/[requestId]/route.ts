
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { supabaseAdmin } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PATCH /api/projects/[projectId]/join/[requestId] — accept or reject
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; requestId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId, requestId } = await params;

  // Verify ownership
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { id: true, ownerId: true, title: true },
  });

  if (!project || project.ownerId !== session.user.id) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const body = await req.json();
  const action = body.action; // "accept" or "reject"

  if (!["accept", "reject"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const joinRequest = await db.joinRequest.findUnique({
    where: { id: requestId },
    select: { id: true, projectId: true, userId: true, status: true },
  });

  if (!joinRequest || joinRequest.projectId !== projectId) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  if (joinRequest.status !== "PENDING") {
    return NextResponse.json({ error: "Request already processed" }, { status: 400 });
  }

  if (action === "reject") {
    await db.joinRequest.update({
      where: { id: requestId },
      data: { status: "REJECTED" },
    });
    return NextResponse.json({ success: true, status: "REJECTED" });
  }

  // Accept: add as member + handle group creation
  await db.$transaction([
    db.joinRequest.update({
      where: { id: requestId },
      data: { status: "ACCEPTED" },
    }),
    db.projectMember.create({
      data: { projectId, userId: joinRequest.userId, role: "MEMBER" },
    }),
  ]);

  // Check if a group already exists for this project
  const { data: existingGroup } = await supabaseAdmin
    .from("group_conversations")
    .select("id")
    .eq("entity_id", projectId)
    .eq("type", "PROJECT")
    .single();

  if (existingGroup) {
    // Add to existing group
    await supabaseAdmin.from("group_participants").insert({
      conversation_id: existingGroup.id,
      user_id: joinRequest.userId,
      role: "MEMBER",
    });
  } else {
    // Create new group conversation
    const { data: newGroup } = await supabaseAdmin
      .from("group_conversations")
      .insert({
        name: project.title,
        type: "PROJECT",
        entity_id: projectId,
        created_by: session.user.id,
      })
      .select("id")
      .single();

    if (newGroup) {
      // Add owner as admin and accepted user as member
      await supabaseAdmin.from("group_participants").insert([
        { conversation_id: newGroup.id, user_id: session.user.id, role: "ADMIN" },
        { conversation_id: newGroup.id, user_id: joinRequest.userId, role: "MEMBER" },
      ]);
    }
  }

  return NextResponse.json({ success: true, status: "ACCEPTED" });
}
