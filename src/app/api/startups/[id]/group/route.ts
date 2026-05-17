import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { getStartupGroup } from "@/lib/services/startup-groups";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error, status } = await requireAuth();
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const group = await getStartupGroup(id, user.id);

    if (!group) {
      return NextResponse.json(
        { error: "Group not found or you are not a member" },
        { status: 404 }
      );
    }

    return NextResponse.json(group);
  } catch (error) {
    console.error("Error getting startup group:", error);
    return NextResponse.json(
      { error: "Failed to get group" },
      { status: 500 }
    );
  }
}
