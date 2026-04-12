import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { publicKey } = body;

  if (!publicKey || typeof publicKey !== "object") {
    return NextResponse.json(
      { error: "Invalid public key" },
      { status: 400 }
    );
  }

  await db.user.update({
    where: { id: session.user.id },
    data: { publicKey: JSON.stringify(publicKey) },
  });

  return NextResponse.json({ ok: true });
}
