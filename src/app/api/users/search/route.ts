import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const uid = req.nextUrl.searchParams.get("uid");

  if (!uid || !/^\d{5}$/.test(uid)) {
    return NextResponse.json({ error: "Please provide a valid 5-digit UID" }, { status: 400 });
  }

  const user = await db.user.findUnique({
    where: { uid },
    select: {
      id: true,
      uid: true,
      name: true,
      image: true,
      bio: true,
      university: true,
      role: true,
      reputation: true,
      skills: { select: { skill: true } },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: user.id,
    uid: user.uid,
    name: user.name,
    image: user.image,
    bio: user.bio,
    university: user.university,
    role: user.role,
    reputation: user.reputation,
    skills: user.skills.map((s) => s.skill),
  });
}
