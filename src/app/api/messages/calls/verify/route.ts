
import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { supabaseAdmin } from "@/lib/supabase-server";
import { getConversationPeer, getIceServers, isCallKind } from "../utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error || !user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { callerId, callId, conversationId, kind } = await req.json();

  if (!callId || typeof callId !== "string") {
    return Response.json({ error: "callId is required" }, { status: 400 });
  }

  if (!conversationId || typeof conversationId !== "string") {
    return Response.json(
      { error: "conversationId is required" },
      { status: 400 }
    );
  }

  if (!callerId || typeof callerId !== "string") {
    return Response.json({ error: "callerId is required" }, { status: 400 });
  }

  if (!isCallKind(kind)) {
    return Response.json(
      { error: "kind must be audio or video" },
      { status: 400 }
    );
  }

  const { error: peerError, peer } = await getConversationPeer(
    conversationId,
    user.id
  );

  if (peerError || !peer || peer.id !== callerId) {
    return Response.json({ error: "Invalid call invite" }, { status: 403 });
  }

  const { data: session, error: sessionError } = await supabaseAdmin
    .from("call_sessions")
    .select("id, caller_id, callee_id, conversation_id, kind, status, expires_at")
    .eq("id", callId)
    .single();

  if (
    sessionError ||
    !session ||
    session.caller_id !== callerId ||
    session.callee_id !== user.id ||
    session.conversation_id !== conversationId ||
    session.kind !== kind ||
    session.status !== "ringing" ||
    new Date(session.expires_at).getTime() < Date.now()
  ) {
    return Response.json({ error: "Invalid or expired call invite" }, { status: 403 });
  }

  const caller = await db.user.findUnique({
    where: { id: callerId },
    select: { id: true, image: true, name: true, uid: true },
  });

  if (!caller) {
    return Response.json({ error: "Caller not found" }, { status: 404 });
  }

  return Response.json({
    callId,
    caller,
    conversationId,
    iceServers: getIceServers(),
    kind,
  });
}
