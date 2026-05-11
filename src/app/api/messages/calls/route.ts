
import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { supabaseAdmin } from "@/lib/supabase-server";
import { getConversationPeer, getIceServers, isCallKind } from "./utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error || !user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { conversationId, kind } = await req.json();

  if (!conversationId || typeof conversationId !== "string") {
    return Response.json(
      { error: "conversationId is required" },
      { status: 400 }
    );
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

  if (peerError || !peer) {
    return Response.json({ error: peerError ?? "Peer not found" }, { status: 403 });
  }

  const callId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 30_000).toISOString();
  const { error: sessionError } = await supabaseAdmin
    .from("call_sessions")
    .insert({
      callee_id: peer.id,
      caller_id: user.id,
      conversation_id: conversationId,
      expires_at: expiresAt,
      id: callId,
      kind,
      status: "ringing",
    });

  if (sessionError) {
    return Response.json(
      { error: "Failed to create call session" },
      { status: 500 }
    );
  }

  return Response.json({
    callId,
    caller: {
      id: user.id,
      image: user.image ?? null,
      name: user.name ?? "Unknown",
    },
    conversationId,
    expiresAt,
    iceServers: getIceServers(),
    kind,
    peer,
  });
}
