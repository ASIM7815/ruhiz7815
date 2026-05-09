
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { supabaseAdmin as supabase } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; requestId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, requestId } = await params;
  const { status } = await req.json();

  if (!["ACCEPTED", "REJECTED"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  // Verify leader
  const membership = await db.studyGroupMember.findUnique({
    where: { groupId_userId: { groupId: id, userId: session.user.id } },
  });
  if (!membership || membership.role !== "LEADER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const joinReq = await db.studyGroupJoinRequest.findUnique({
    where: { id: requestId },
  });
  if (!joinReq || joinReq.groupId !== id) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  await db.studyGroupJoinRequest.update({
    where: { id: requestId },
    data: { status },
  });

  if (status === "ACCEPTED") {
    // Add member
    await db.studyGroupMember.create({
      data: { groupId: id, userId: joinReq.userId },
    });

    // Auto-create or add to Supabase group
    const group = await db.studyGroup.findUnique({ where: { id } });
    if (group) {
      // Check if group conversation exists
      const { data: existingConv } = await supabase
        .from("group_conversations")
        .select("id")
        .eq("source_type", "study_group")
        .eq("source_id", id)
        .single();

      let convId: string;

      if (existingConv) {
        convId = existingConv.id;
      } else {
        // Create group conversation
        const { data: newConv } = await supabase
          .from("group_conversations")
          .insert({
            name: group.name,
            created_by: session.user.id,
            source_type: "study_group",
            source_id: id,
          })
          .select("id")
          .single();

        if (!newConv) {
          return NextResponse.json({ error: "Failed to create group chat" }, { status: 500 });
        }
        convId = newConv.id;

        // Add leader as admin
        await supabase.from("group_participants").insert({
          conversation_id: convId,
          user_id: session.user.id,
          role: "admin",
        });
      }

      // Add accepted user
      await supabase.from("group_participants").insert({
        conversation_id: convId,
        user_id: joinReq.userId,
        role: "member",
      });
    }
  }

  return NextResponse.json({ success: true });
}
