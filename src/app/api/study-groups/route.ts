
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getCurrentUser } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import {
  validateString,
  validateNumber,
} from "@/lib/validation";
import {
  handleApiError,
  successResponse,
  ValidationError,
  logApiRequest,
} from "@/lib/api-errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const memberFilter = searchParams.get("member");

  // ?member=me — return groups the current user belongs to (with role + pending requests)
  if (memberFilter === "me") {
    const { user, error } = await requireAuth();
    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const memberships = await db.studyGroupMember.findMany({
      where: { userId: user.id },
      include: {
        group: {
          include: {
            _count: { select: { members: true } },
            members: {
              take: 3,
              include: { user: { select: { image: true, name: true } } },
            },
          },
        },
      },
      orderBy: { joinedAt: "desc" },
    });

    const groups = await Promise.all(
      memberships.map(async (m) => {
        let pendingRequests: {
          id: string;
          userId: string;
          status: string;
          createdAt: string;
          user: { id: string; name: string; image: string | null; uid: string | null; university: string | null };
        }[] = [];

        if (m.role === "LEADER") {
          const reqs = await db.studyGroupJoinRequest.findMany({
            where: { groupId: m.groupId, status: "PENDING" },
            include: {
              user: { select: { id: true, name: true, image: true, uid: true, university: true } },
            },
            orderBy: { createdAt: "asc" },
          });
          pendingRequests = reqs.map((r) => ({
            id: r.id,
            userId: r.userId,
            status: r.status,
            createdAt: r.createdAt.toISOString(),
            user: r.user,
          }));
        }

        return {
          id: m.group.id,
          name: m.group.name,
          subject: m.group.subject,
          description: m.group.description,
          maxMembers: m.group.maxMembers,
          memberCount: m.group._count.members,
          avatars: m.group.members.map((mem) => mem.user.image || ""),
          userRole: m.role as "LEADER" | "MEMBER",
          pendingRequests,
        };
      })
    );

    return NextResponse.json({ groups });
  }

  // Default: browse all groups. Include viewer status if authenticated.
  const viewer = await getCurrentUser();

  const groups = await db.studyGroup.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { members: true } },
      members: {
        take: 3,
        include: { user: { select: { image: true, name: true } } },
      },
    },
  });

  // Build viewer status map with two batch queries
  const statusMap: Record<string, "LEADER" | "MEMBER" | "PENDING"> = {};
  if (viewer) {
    const [memberships, pendingReqs] = await Promise.all([
      db.studyGroupMember.findMany({
        where: { userId: viewer.id },
        select: { groupId: true, role: true },
      }),
      db.studyGroupJoinRequest.findMany({
        where: { userId: viewer.id, status: "PENDING" },
        select: { groupId: true },
      }),
    ]);
    for (const m of memberships) {
      statusMap[m.groupId] = m.role === "LEADER" ? "LEADER" : "MEMBER";
    }
    for (const r of pendingReqs) {
      if (!statusMap[r.groupId]) statusMap[r.groupId] = "PENDING";
    }
  }

  return NextResponse.json({
    groups: groups.map((g) => ({
      id: g.id,
      name: g.name,
      subject: g.subject,
      description: g.description,
      maxMembers: g.maxMembers,
      memberCount: g._count.members,
      createdAt: g.createdAt.toISOString(),
      avatars: g.members.map((m) => m.user.image || ""),
      viewerStatus: statusMap[g.id] ?? "NONE",
    })),
  });
}

export async function POST(req: NextRequest) {
  try {
    const { user, error } = await requireAuth();
    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    logApiRequest("POST", "/api/study-groups", user.id);

    const body = await req.json().catch(() => null);
    if (!body) {
      throw new ValidationError("Invalid request body");
    }

    // Validate name
    const { value: name, error: nameError } = validateString(
      body.name,
      "Name",
      { required: true, minLength: 3, maxLength: 100 }
    );
    if (nameError) return nameError;

    // Validate subject
    const { value: subject, error: subjectError } = validateString(
      body.subject,
      "Subject",
      { required: true, minLength: 2, maxLength: 100 }
    );
    if (subjectError) return subjectError;

    // Validate description (optional)
    const { value: description, error: descError } = validateString(
      body.description,
      "Description",
      { required: false, maxLength: 500 }
    );
    if (descError) return descError;

    // Validate maxMembers
    const { value: maxMembers, error: maxError } = validateNumber(
      body.maxMembers,
      "Max members",
      { required: false, min: 2, max: 100, integer: true }
    );
    if (maxError) return maxError;

    const group = await db.studyGroup.create({
      data: {
        name: name!,
        subject: subject!,
        description,
        maxMembers: maxMembers || 10,
        members: {
          create: { userId: user.id, role: "LEADER" },
        },
      },
    });

    return successResponse({ id: group.id }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
