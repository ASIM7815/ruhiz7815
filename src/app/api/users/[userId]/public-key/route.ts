import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId } = await params;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { publicKey: true },
  });

  if (!user || !user.publicKey) {
    return NextResponse.json(
      { error: "User has not set up encryption keys" },
      { status: 404 }
    );
  }

  return NextResponse.json({ publicKey: JSON.parse(user.publicKey) });
}
