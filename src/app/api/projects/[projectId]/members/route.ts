import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { isProjectAdminRole } from "@/lib/services/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/projects/[projectId]/members — list project members
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { user, error } = await requireAuth();
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;

  // Verify user is a member or owner
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      ownerId: true,
      members: {
        where: { userId: user.id, status: "ACTIVE" },
        select: { role: true },
      },
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const isMember = project.ownerId === user.id || project.members.length > 0;
  if (!isMember) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const members = await db.projectMember.findMany({
    where: { projectId, status: "ACTIVE" },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          image: true,
          uid: true,
          university: true,
          bio: true,
        },
      },
    },
    orderBy: [{ role: "desc" }, { joinedAt: "asc" }],
  });

  return NextResponse.json({
    members: members.map((m) => ({
      id: m.id,
      userId: m.user.id,
      name: m.user.name,
      image: m.user.image,
      uid: m.user.uid,
      university: m.user.university,
      bio: m.user.bio,
      role: m.role,
      joinedAt: m.joinedAt.toISOString(),
    })),
  });
}

// POST /api/projects/[projectId]/members — direct invite/add a user
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { user, error } = await requireAuth();
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;
  const body = await req.json().catch(() => ({}));
  const { uid } = body;

  if (!uid || typeof uid !== "string") {
    return NextResponse.json({ error: "User UID is required" }, { status: 400 });
  }

  // Verify ownership or admin role
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      members: {
        where: { userId: user.id, status: "ACTIVE" },
        select: { role: true },
      },
    },
  });

  const isAdmin = project && (project.ownerId === user.id || isProjectAdminRole(project.members[0]?.role));
  if (!project || !isAdmin) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  // Find the target user by UID
  const targetUser = await db.user.findUnique({
    where: { uid },
  });

  if (!targetUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Check if they are already a member
  const existingMember = await db.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: targetUser.id } },
  });

  if (existingMember?.status === "ACTIVE") {
    return NextResponse.json({ error: "User is already a member" }, { status: 409 });
  }

  // Add the user to the project
  if (existingMember) {
    await db.projectMember.update({
      where: { id: existingMember.id },
      data: { status: "ACTIVE", role: "MEMBER" },
    });
  } else {
    await db.projectMember.create({
      data: {
        projectId,
        userId: targetUser.id,
        role: "MEMBER",
        status: "ACTIVE",
      },
    });
  }

  // Also add them to the Supabase group if they aren't already
  const { supabase } = await import("@/lib/supabase-client");
  
  // Find conversation id
  const { data: convData } = await supabase
    .from("group_conversations")
    .select("id")
    .eq("entity_id", projectId)
    .single();

  if (convData) {
    // Check if already in Supabase group
    const { data: existingGroupMember } = await supabase
      .from("group_members")
      .select("id")
      .eq("conversation_id", convData.id)
      .eq("user_id", targetUser.id)
      .single();

    if (!existingGroupMember) {
      await supabase.from("group_members").insert({
        conversation_id: convData.id,
        user_id: targetUser.id,
        role: "MEMBER",
        can_share_media: true,
      });
      
      // Also send a system message
      await supabase.from("group_messages").insert({
        conversation_id: convData.id,
        sender_id: user.id, // we don't have a system user, so use the admin
        content: `${targetUser.name} was added to the group.`,
        message_type: "SYSTEM",
      });
    }
  }

  // Create notification for the user
  const { createNotification } = await import("@/lib/services/notifications");
  await createNotification({
    userId: targetUser.id,
    type: "PROJECT_JOIN_REQUEST_APPROVED", // Reusing this for simplicity
    title: "Added to project",
    message: `You were added to the project "${project.title}".`,
    link: `/projects/${projectId}/workspace`,
    actorId: user.id,
    entityType: "PROJECT",
    entityId: projectId,
  });

  return NextResponse.json({ success: true, message: "User added successfully" });
}
