import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { getStudyGroupGroup } from "@/lib/services/study-group-groups";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/study-groups/[id]/group - Get Supabase group for study group
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuth();
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const group = await getStudyGroupGroup(id, user.id);
    
    if (!group) {
      return NextResponse.json(
        { error: "Not a member of this study group" },
        { status: 403 }
      );
    }

    return NextResponse.json(group);
  } catch (err) {
    console.error("[study-group-group] Error:", err);
    return NextResponse.json(
      { error: "Failed to get group" },
      { status: 500 }
    );
  }
}
