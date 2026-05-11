import { db } from "@/lib/db";
import { supabaseAdmin } from "@/lib/supabase-server";

type ParticipantRow = {
  user_id: string;
};

export type CallKind = "audio" | "video";
export type CallLogStatus =
  | "cancelled"
  | "ended"
  | "failed"
  | "missed"
  | "rejected";
export type CallSessionStatus =
  | "accepted"
  | "busy"
  | "cancelled"
  | "ended"
  | "failed"
  | "missed"
  | "rejected";

export const terminalCallSessionStatuses = new Set<CallSessionStatus>([
  "busy",
  "cancelled",
  "ended",
  "failed",
  "missed",
  "rejected",
]);

export function isCallKind(value: unknown): value is CallKind {
  return value === "audio" || value === "video";
}

export function isCallSessionStatus(
  value: unknown
): value is CallSessionStatus {
  return (
    value === "accepted" ||
    value === "busy" ||
    value === "cancelled" ||
    value === "ended" ||
    value === "failed" ||
    value === "missed" ||
    value === "rejected"
  );
}

export async function getConversationPeer(
  conversationId: string,
  userId: string
) {
  const { data: participants, error } = await supabaseAdmin
    .from("conversation_participants")
    .select("user_id")
    .eq("conversation_id", conversationId);

  if (error || !participants) {
    return { error: "Conversation not found" as const, peer: null };
  }

  const participantRows = participants as ParticipantRow[];
  const isParticipant = participantRows.some((row) => row.user_id === userId);

  if (!isParticipant) {
    return { error: "Not a participant" as const, peer: null };
  }

  const peerId = participantRows.find((row) => row.user_id !== userId)?.user_id;

  if (!peerId) {
    return { error: "Peer not found" as const, peer: null };
  }

  const peer = await db.user.findUnique({
    where: { id: peerId },
    select: { id: true, image: true, name: true, uid: true },
  });

  if (!peer) {
    return { error: "Peer not found" as const, peer: null };
  }

  return { error: null, peer };
}

export function getIceServers() {
  const stunUrls =
    process.env.STUN_URLS?.split(",")
      .map((url) => url.trim())
      .filter(Boolean) ?? [];

  const iceServers: RTCIceServer[] = [
    {
      urls:
        stunUrls.length > 0
          ? stunUrls
          : ["stun:stun.l.google.com:19302", "stun:global.stun.twilio.com:3478"],
    },
  ];

  const turnUrls = process.env.TURN_URLS?.split(",")
    .map((url) => url.trim())
    .filter(Boolean);
  const turnUsername = process.env.TURN_USERNAME;
  const turnCredential = process.env.TURN_CREDENTIAL;

  if (turnUrls?.length && turnUsername && turnCredential) {
    iceServers.push({
      credential: turnCredential,
      urls: turnUrls,
      username: turnUsername,
    });
  }

  return iceServers;
}

export function formatCallLogContent(
  kind: CallKind,
  status: CallLogStatus,
  durationSeconds = 0
) {
  const label = kind === "video" ? "Video" : "Audio";
  const duration = formatDuration(durationSeconds);

  if (status === "ended") return `${label} call ended · ${duration}`;
  if (status === "missed") return `Missed ${kind} call`;
  if (status === "rejected") return `${label} call declined`;
  if (status === "cancelled") return `${label} call cancelled`;
  return `${label} call failed`;
}

function formatDuration(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safeSeconds / 60);
  const secs = safeSeconds % 60;

  if (mins === 0) return `${secs}s`;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
