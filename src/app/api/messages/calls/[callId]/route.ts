import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ callId: string }> }
) {
  const { user, error } = await requireAuth();
  if (error || !user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { callId } = await params;
  return Response.json({
    callId,
    status: "ephemeral",
  });
}
