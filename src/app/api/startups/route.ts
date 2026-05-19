
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const stage = searchParams.get("stage");
  const founderFilter = searchParams.get("founder");

  const where: Record<string, unknown> = {};
  if (stage) where.stage = stage;

  if (founderFilter === "me") {
    const { user, error, status } = await requireAuth();
    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    where.founderId = user.id;
  }

  const startups = await db.startup.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      founder: { select: { id: true, name: true, image: true, university: true, uid: true } },
      members: {
        include: {
          user: { select: { id: true, name: true, image: true } },
        },
      },
    },
  });

  return NextResponse.json({
    startups: startups.map((s) => ({
      id: s.id,
      name: s.name,
      problem: s.problem,
      solution: s.solution,
      stage: s.stage,
      lookingFor: s.lookingFor,
      createdAt: s.createdAt.toISOString(),
      founder: s.founder,
      members: s.members.map((m) => ({
        id: m.user.id,
        name: m.user.name,
        image: m.user.image,
        role: m.role,
      })),
    })),
  });
}

export async function POST(req: NextRequest) {
  const { user, error, status } = await requireAuth();
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, problem, solution, stage, lookingFor } = body;

  if (!name || !problem || !solution) {
    return NextResponse.json({ error: "Name, problem, and solution are required" }, { status: 400 });
  }

  const startup = await db.startup.create({
    data: {
      name,
      problem,
      solution,
      stage: stage || "IDEA",
      lookingFor: lookingFor || null,
      founderId: user.id,
      members: {
        create: {
          userId: user.id,
          role: "FOUNDER",
        },
      },
    },
  });

  return NextResponse.json({ id: startup.id }, { status: 201 });
}
