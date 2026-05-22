
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth-helpers";
import { getProjectGroupConversationId } from "@/lib/project-group-chat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const viewer = await getCurrentUser();

  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      owner: { select: { id: true, name: true, image: true, university: true, uid: true, reputation: true } },
      skills: { select: { skill: true } },
      members: {
        include: {
          user: { select: { id: true, name: true, image: true, uid: true } },
        },
      },
      tasks: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  let viewerStatus: "none" | "pending" | "member" | "owner" = "none";
  let groupConversationId: string | null = null;

  if (viewer) {
    if (project.owner.id === viewer.id) {
      viewerStatus = "owner";
    } else if (project.members.some((member) => member.user.id === viewer.id)) {
      viewerStatus = "member";
    } else {
      const request = await db.joinRequest.findUnique({
        where: { projectId_userId: { projectId, userId: viewer.id } },
        select: { status: true },
      });

      if (request?.status === "PENDING") {
        viewerStatus = "pending";
      }
    }

    if (viewerStatus === "owner" || viewerStatus === "member") {
      groupConversationId = await getProjectGroupConversationId(projectId).catch(() => null);
    }
  }

  return NextResponse.json({
    id: project.id,
    title: project.title,
    problem: project.problem,
    description: project.description,
    status: project.status,
    timeline: project.timeline,
    maxMembers: project.maxMembers,
    createdAt: project.createdAt.toISOString(),
    skills: project.skills.map((s) => s.skill),
    owner: project.owner,
    viewerStatus,
    groupConversationId,
    members: project.members.map((m) => ({
      id: m.user.id,
      name: m.user.name,
      image: m.user.image,
      uid: m.user.uid,
      role: m.role,
    })),
    tasks: project.tasks.map((t) => ({
      ...t,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    })),
  });
}
