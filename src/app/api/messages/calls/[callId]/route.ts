import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { supabaseAdmin } from "@/lib/supabase-server";
import {
  isCallSessionStatus,
  terminalCallSessionStatuses,
} from "../utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ callId: string }> }
) {
  const { user, error, status: authStatus } = await requireAuth();
  if (error || !user) {
    return Response.json({ error }, { status: authStatus });
  }

  const { callId } = await params;
  const { durationSeconds = 0, failureReason, status } = await req.json();

  if (!callId || typeof callId !== "string") {
    return Response.json({ error: "callId is required" }, { status: 400 });
  }

  if (!isCallSessionStatus(status)) {
    return Response.json({ error: "Invalid call status" }, { status: 400 });
  }

  const { data: session, error: sessionError } = await supabaseAdmin
    .from("call_sessions")
    .select("id, caller_id, callee_id, status")
    .eq("id", callId)
    .single();

  if (sessionError || !session) {
    return Response.json({ error: "Call not found" }, { status: 404 });
  }

  const isCaller = session.caller_id === user.id;
  const isCallee = session.callee_id === user.id;

  if (!isCaller && !isCallee) {
    return Response.json({ error: "Not a call participant" }, { status: 403 });
  }

  if (terminalCallSessionStatuses.has(session.status)) {
    return Response.json({ ok: true, status: session.status });
  }

  if (
    (status === "accepted" || status === "busy" || status === "rejected") &&
    !isCallee
  ) {
    return Response.json({ error: "Only the callee can update this status" }, { status: 403 });
  }

  if ((status === "cancelled" || status === "missed") && !isCaller) {
    return Response.json({ error: "Only the caller can update this status" }, { status: 403 });
  }

  const update: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === "accepted") {
    update.accepted_at = new Date().toISOString();
  }

  if (terminalCallSessionStatuses.has(status)) {
    update.duration_seconds = Math.max(0, Math.floor(Number(durationSeconds) || 0));
    update.ended_at = new Date().toISOString();
    update.ended_by = user.id;
  }

  if (typeof failureReason === "string" && failureReason.length > 0) {
    update.failure_reason = failureReason.slice(0, 500);
  }

  const { data: updated, error: updateError } = await supabaseAdmin
    .from("call_sessions")
    .update(update)
    .eq("id", callId)
    .select("id, status")
    .single();

  if (updateError || !updated) {
    return Response.json({ error: "Failed to update call" }, { status: 500 });
  }

  return Response.json({ ok: true, status: updated.status });
}
