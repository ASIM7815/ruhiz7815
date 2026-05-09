
import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getConversationPeer, getIceServers, isCallKind } from "../utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
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

  const { error, peer } = await getConversationPeer(
    conversationId,
    session.user.id
  );

  if (error || !peer || peer.id !== callerId) {
    return Response.json({ error: "Invalid call invite" }, { status: 403 });
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
