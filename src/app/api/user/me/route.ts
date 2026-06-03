
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { isValidUsername, normalizeUsername } from "@/lib/profile-identity";

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
          followers: true,
          following: true,
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
    username: user.username,
    name: user.name,
    email: user.email,
    image: user.image,
    coverImage: user.coverImage,
    headline: user.headline,
    bio: user.bio,
    university: user.university,
    role: user.role,
    reputation: user.reputation,
    collegeVerified: user.collegeVerified,
    onboardingComplete: user.onboardingComplete,
    createdAt: user.createdAt.toISOString(),
    skills: user.skills.map((s) => s.skill),
    interests: user.interests.map((i) => i.interest),
    stats: {
      followers: user._count.followers,
      following: user._count.following,
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
  const {
    username,
    name,
    headline,
    bio,
    university,
    role,
    onboardingComplete,
    skills,
    interests,
    image,
    coverImage,
  } = body;

  // Validate
  if (name !== undefined && (!name || typeof name !== "string")) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (headline !== undefined && typeof headline === "string" && headline.length > 120) {
    return NextResponse.json({ error: "Headline must be 120 characters or less" }, { status: 400 });
  }
  if (bio !== undefined && typeof bio === "string" && bio.length > 500) {
    return NextResponse.json({ error: "Bio must be 500 characters or less" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (username !== undefined) {
    const normalizedUsername = normalizeUsername(String(username));
    if (!isValidUsername(normalizedUsername)) {
      return NextResponse.json(
        { error: "Username must start with a letter and use 3-30 letters, numbers, or underscores" },
        { status: 400 }
      );
    }

    const existingUsername = await db.user.findFirst({
      where: {
        username: normalizedUsername,
        NOT: { id: authUser.id },
      },
      select: { id: true },
    });

    if (existingUsername) {
      return NextResponse.json({ error: "Username is already taken" }, { status: 409 });
    }

    data.username = normalizedUsername;
  }
  if (name !== undefined) data.name = name;
  if (headline !== undefined) data.headline = headline?.trim() || null;
  if (bio !== undefined) data.bio = bio;
  if (university !== undefined) data.university = university;
  if (role !== undefined && ["MEMBER", "LEADER", "BOTH"].includes(role)) data.role = role;
  if (onboardingComplete !== undefined) data.onboardingComplete = onboardingComplete;
  if (image !== undefined) data.image = image;
  if (coverImage !== undefined) data.coverImage = coverImage;

  const user = await db.user.update({
    where: { id: authUser.id },
    data,
  });

  // Update skills if provided
  if (Array.isArray(skills)) {
    const cleanSkills = Array.from(
      new Set(skills.map((skill) => String(skill).trim()).filter(Boolean))
    ).slice(0, 20);

    await db.userSkill.deleteMany({ where: { userId: authUser.id } });
    if (cleanSkills.length > 0) {
      await db.userSkill.createMany({
        data: cleanSkills.map((skill) => ({ userId: authUser.id, skill })),
      });
    }
  }

  // Update interests if provided
  if (Array.isArray(interests)) {
    const cleanInterests = Array.from(
      new Set(interests.map((interest) => String(interest).trim()).filter(Boolean))
    ).slice(0, 20);

    await db.userInterest.deleteMany({ where: { userId: authUser.id } });
    if (cleanInterests.length > 0) {
      await db.userInterest.createMany({
        data: cleanInterests.map((interest) => ({ userId: authUser.id, interest })),
      });
    }
  }

  return NextResponse.json({
    id: user.id,
    uid: user.uid,
    username: user.username,
    name: user.name,
    email: user.email,
    image: user.image,
    coverImage: user.coverImage,
    headline: user.headline,
    bio: user.bio,
    university: user.university,
    role: user.role,
    onboardingComplete: user.onboardingComplete,
  });
}
