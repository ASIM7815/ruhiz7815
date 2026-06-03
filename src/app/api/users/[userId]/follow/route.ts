import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function followerState(followerId: string, followingId: string) {
  const [follow, followers] = await Promise.all([
    db.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
      select: { id: true },
    }),
    db.follow.count({ where: { followingId } }),
  ]);

  return {
    isFollowing: Boolean(follow),
    followers,
  };
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { user, error, status } = await requireAuth();
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status });
  }

  const { userId } = await params;
  if (user.id === userId) {
    return NextResponse.json({ error: "You cannot follow yourself" }, { status: 400 });
  }

  const target = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true },
  });

  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const existing = await db.follow.findUnique({
    where: {
      followerId_followingId: {
        followerId: user.id,
        followingId: userId,
      },
    },
    select: { id: true },
  });

  if (!existing) {
    await db.follow.create({
      data: {
        followerId: user.id,
        followingId: userId,
      },
    });

    await db.notification.create({
      data: {
        userId,
        type: "NEW_FOLLOWER",
        title: "New follower",
        message: `${user.name} started following you.`,
      },
    });
  }

  return NextResponse.json(await followerState(user.id, userId));
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { user, error, status } = await requireAuth();
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status });
  }

  const { userId } = await params;
  await db.follow.deleteMany({
    where: {
      followerId: user.id,
      followingId: userId,
    },
  });

  return NextResponse.json(await followerState(user.id, userId));
}
