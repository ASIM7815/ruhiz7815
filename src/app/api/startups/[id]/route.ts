import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const startup = await db.startup.findUnique({
    where: { id },
    include: {
      founder: {
        select: {
          id: true,
          name: true,
          image: true,
          university: true,
        },
      },
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
      },
    },
  });

  if (!startup) {
    return NextResponse.json({ error: "Startup not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: startup.id,
    name: startup.name,
    problem: startup.problem,
    solution: startup.solution,
    stage: startup.stage,
    lookingFor: startup.lookingFor,
    createdAt: startup.createdAt.toISOString(),
    founder: startup.founder,
    members: startup.members.map((m) => ({
      id: m.user.id,
      name: m.user.name,
      image: m.user.image,
      role: m.role,
    })),
  });
}
