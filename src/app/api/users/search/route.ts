import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { profileLookupToken, profilePathFor } from "@/lib/profile-identity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const userSelect = {
  id: true,
  uid: true,
  username: true,
  name: true,
  image: true,
  headline: true,
  bio: true,
  university: true,
  role: true,
  reputation: true,
  collegeVerified: true,
  skills: { select: { skill: true } },
  interests: { select: { interest: true } },
  _count: {
    select: {
      followers: true,
      ownedProjects: true,
      resources: true,
      studyGroupMembers: true,
    },
  },
} as const;

export async function GET(req: NextRequest) {
  const rawQuery =
    req.nextUrl.searchParams.get("q") ||
    req.nextUrl.searchParams.get("uid") ||
    req.nextUrl.searchParams.get("username") ||
    "";
  const token = profileLookupToken(rawQuery);

  if (!token) {
    return NextResponse.json({ error: "Search query is required" }, { status: 400 });
  }

  const exactUser = await db.user.findFirst({
    where: {
      OR: [{ id: rawQuery }, { uid: token }, { username: token }],
    },
    select: userSelect,
  });

  const user =
    exactUser ||
    (await db.user.findFirst({
      where: {
        OR: [
          { name: { contains: token, mode: "insensitive" } },
          { university: { contains: token, mode: "insensitive" } },
          { skills: { some: { skill: { contains: token, mode: "insensitive" } } } },
          { interests: { some: { interest: { contains: token, mode: "insensitive" } } } },
        ],
      },
      orderBy: [{ username: "asc" }, { createdAt: "desc" }],
      select: userSelect,
    }));

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: user.id,
    uid: user.uid,
    username: user.username,
    name: user.name,
    image: user.image,
    headline: user.headline,
    bio: user.bio,
    university: user.university,
    role: user.role,
    reputation: user.reputation,
    collegeVerified: user.collegeVerified,
    profilePath: profilePathFor(user),
    skills: user.skills.map((s) => s.skill),
    interests: user.interests.map((i) => i.interest),
    stats: {
      followers: user._count.followers,
      projects: user._count.ownedProjects,
      resources: user._count.resources,
      studyGroups: user._count.studyGroupMembers,
    },
  });
}
