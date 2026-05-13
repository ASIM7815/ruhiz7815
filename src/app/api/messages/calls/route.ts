
import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { getConversationPeer, getIceServers, isCallKind } from "./utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { user, error, status } = await requireAuth();
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

  if (error || !peer) {
    return Response.json({ error: error ?? "Peer not found" }, { status: 403 });
  }

  return Response.json({
    callId: crypto.randomUUID(),
    caller: {
      id: user.id,
      image: user.image ?? null,
      name: user.name ?? "Unknown",
    },
    conversationId,
    expiresAt: new Date(Date.now() + 30_000).toISOString(),
    iceServers: getIceServers(),
    kind,
    peer,
  });
}
