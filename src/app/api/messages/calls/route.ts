
import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getConversationPeer, getIceServers, isCallKind } from "./utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
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

  const { error, peer } = await getConversationPeer(
    conversationId,
    session.user.id
  );

  if (error || !peer) {
    return Response.json({ error: error ?? "Peer not found" }, { status: 403 });
  }

  return Response.json({
    callId: crypto.randomUUID(),
    caller: {
      id: session.user.id,
      image: session.user.image ?? null,
      name: session.user.name ?? "Unknown",
    },
    conversationId,
    expiresAt: new Date(Date.now() + 30_000).toISOString(),
    iceServers: getIceServers(),
    kind,
    peer,
  });
}
