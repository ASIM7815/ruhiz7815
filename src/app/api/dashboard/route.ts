
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { supabaseAdmin } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  // Fetch counts in parallel
  const [
    projectCount,
    resourceCount,
    studyGroupCount,
    recentProjects,
    recentResources,
  ] = await Promise.all([
    db.projectMember.count({ where: { userId } }),
    db.resource.count({ where: { authorId: userId } }),
    db.studyGroupMember.count({ where: { userId } }),
    db.project.findMany({
      where: { members: { some: { userId } } },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: { id: true, title: true, status: true, updatedAt: true },
    }),
    db.resource.findMany({
      where: { authorId: userId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, title: true, type: true, downloads: true, createdAt: true },
    }),
  ]);

  // Get messages from Supabase (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: sentMessages } = await supabaseAdmin
    .from("direct_messages")
    .select("id, created_at")
    .eq("sender_id", userId)
    .gte("created_at", sevenDaysAgo.toISOString());

  const { data: receivedMessages } = await supabaseAdmin
    .from("direct_messages")
    .select("id, created_at")
    .neq("sender_id", userId)
    .gte("created_at", sevenDaysAgo.toISOString());

  // Get group message count
  const { data: groupMsgs } = await supabaseAdmin
    .from("group_messages")
    .select("id, created_at")
    .eq("sender_id", userId)
    .gte("created_at", sevenDaysAgo.toISOString());

  const totalMessagesSent = (sentMessages?.length || 0) + (groupMsgs?.length || 0);

  // Build weekly activity data (last 7 days)
  const weeklyActivity = [];
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const sent = (sentMessages || []).filter(
      (m) => new Date(m.created_at) >= dayStart && new Date(m.created_at) <= dayEnd
    ).length;
    const received = (receivedMessages || []).filter(
      (m) => new Date(m.created_at) >= dayStart && new Date(m.created_at) <= dayEnd
    ).length;
    const groupSent = (groupMsgs || []).filter(
      (m) => new Date(m.created_at) >= dayStart && new Date(m.created_at) <= dayEnd
    ).length;

    weeklyActivity.push({
      day: weekDays[date.getDay()],
      date: date.toISOString().split("T")[0],
      sent: sent + groupSent,
      received,
    });
  }

  // Category breakdown
  const categoryBreakdown = [
    { name: "Projects", value: projectCount * 10 + 5 },
    { name: "Messages", value: totalMessagesSent },
    { name: "Resources", value: resourceCount * 8 },
    { name: "Study Groups", value: studyGroupCount * 6 },
  ];

  // Productivity score (0-100)
  const activityScore = Math.min(
    100,
    Math.round(
      projectCount * 15 +
        totalMessagesSent * 2 +
        resourceCount * 10 +
        studyGroupCount * 8
    )
  );

  // Recent activity feed
  const activity: { user: string; action: string; target: string; time: string; type: string }[] = [];

  recentProjects.forEach((p) => {
    activity.push({
      user: session.user?.name || "You",
      action: p.status === "OPEN" ? "created project" : "updated",
      target: p.title,
      time: p.updatedAt.toISOString(),
      type: "project",
    });
  });

  recentResources.forEach((r) => {
    activity.push({
      user: session.user?.name || "You",
      action: "uploaded",
      target: r.title,
      time: r.createdAt.toISOString(),
      type: "resource",
    });
  });

  activity.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  return NextResponse.json({
    stats: {
      projects: projectCount,
      messagesSent: totalMessagesSent,
      resources: resourceCount,
      studyGroups: studyGroupCount,
    },
    weeklyActivity,
    categoryBreakdown,
    productivityScore: activityScore,
    recentActivity: activity.slice(0, 8),
  });
}
