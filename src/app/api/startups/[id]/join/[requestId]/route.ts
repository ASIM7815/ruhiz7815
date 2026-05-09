
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

  // Verify founder
  const startup = await db.startup.findUnique({ where: { id } });
  if (!startup || startup.founderId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const joinReq = await db.startupJoinRequest.findUnique({ where: { id: requestId } });
  if (!joinReq || joinReq.startupId !== id) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  await db.startupJoinRequest.update({
    where: { id: requestId },
    data: { status },
  });

  if (status === "ACCEPTED") {
    await db.startupMember.create({
      data: { startupId: id, userId: joinReq.userId, role: "MEMBER" },
    });

    // Auto-create or add to Supabase group
    const { data: existingConv } = await supabase
      .from("group_conversations")
      .select("id")
      .eq("source_type", "startup")
      .eq("source_id", id)
      .single();

    let convId: string;

    if (existingConv) {
      convId = existingConv.id;
    } else {
      const { data: newConv } = await supabase
        .from("group_conversations")
        .insert({
          name: startup.name,
          created_by: session.user.id,
          source_type: "startup",
          source_id: id,
        })
        .select("id")
        .single();

      if (!newConv) {
        return NextResponse.json({ error: "Failed to create group chat" }, { status: 500 });
      }
      convId = newConv.id;

      await supabase.from("group_participants").insert({
        conversation_id: convId,
        user_id: session.user.id,
        role: "admin",
      });
    }

    await supabase.from("group_participants").insert({
      conversation_id: convId,
      user_id: joinReq.userId,
      role: "member",
    });
  }

  return NextResponse.json({ success: true });
}
