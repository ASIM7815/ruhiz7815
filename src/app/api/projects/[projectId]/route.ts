import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;

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

  return NextResponse.json({
    id: project.id,
    title: project.title,
    problem: project.problem,
    description: project.description,
    status: project.status,
    timeline: project.timeline,
    maxMembers: project.maxMembers,
    createdAt: project.createdAt,
    skills: project.skills.map((s) => s.skill),
    owner: project.owner,
    members: project.members.map((m) => ({
      id: m.user.id,
      name: m.user.name,
      image: m.user.image,
      uid: m.user.uid,
      role: m.role,
    })),
    tasks: project.tasks,
  });
}
