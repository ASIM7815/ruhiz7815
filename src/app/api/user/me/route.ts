
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { user: authUser, error, status } = await requireAuth();
  if (error || !authUser) {
    return NextResponse.json({ error }, { status });
  }

  const user = await db.user.findUnique({
    where: { id: authUser.id },
    include: {
      skills: true,
      interests: true,
      _count: {
        select: {
          ownedProjects: true,
          resources: true,
          studyGroupMembers: true,
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: user.id,
    uid: user.uid,
    name: user.name,
    email: user.email,
    image: user.image,
    bio: user.bio,
    university: user.university,
    role: user.role,
    reputation: user.reputation,
    onboardingComplete: user.onboardingComplete,
    createdAt: user.createdAt,
    skills: user.skills.map((s) => s.skill),
    interests: user.interests.map((i) => i.interest),
    stats: {
      projects: user._count.ownedProjects,
      resources: user._count.resources,
      studyGroups: user._count.studyGroupMembers,
    },
  });
}

export async function PATCH(req: NextRequest) {
  const { user: authUser, error, status: authStatus } = await requireAuth();
  if (error || !authUser) {
    return NextResponse.json({ error }, { status: authStatus });
  }

  const body = await req.json();
  const { name, bio, university, role, onboardingComplete, skills, interests } = body;

  // Validate
  if (name !== undefined && (!name || typeof name !== "string")) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (bio !== undefined && typeof bio === "string" && bio.length > 500) {
    return NextResponse.json({ error: "Bio must be 500 characters or less" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name;
  if (bio !== undefined) data.bio = bio;
  if (university !== undefined) data.university = university;
  if (role !== undefined && ["MEMBER", "LEADER", "BOTH"].includes(role)) data.role = role;
  if (onboardingComplete !== undefined) data.onboardingComplete = onboardingComplete;

  const user = await db.user.update({
    where: { id: authUser.id },
    data,
  });

  // Update skills if provided
  if (Array.isArray(skills)) {
    await db.userSkill.deleteMany({ where: { userId: authUser.id } });
    if (skills.length > 0) {
      await db.userSkill.createMany({
        data: skills.map((skill: string) => ({ userId: authUser.id, skill })),
      });
    }
  }

  // Update interests if provided
  if (Array.isArray(interests)) {
    await db.userInterest.deleteMany({ where: { userId: authUser.id } });
    if (interests.length > 0) {
      await db.userInterest.createMany({
        data: interests.map((interest: string) => ({ userId: authUser.id, interest })),
      });
    }
  }

  return NextResponse.json({
    id: user.id,
    uid: user.uid,
    name: user.name,
    email: user.email,
    image: user.image,
    bio: user.bio,
    university: user.university,
    role: user.role,
    onboardingComplete: user.onboardingComplete,
  });
}
