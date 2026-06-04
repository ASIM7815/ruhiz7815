import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/api-middleware";
import { handleApiError, successResponse } from "@/lib/api-errors";
import { generalRateLimit } from "@/lib/rate-limit";
import { getNotifications, markAllAsRead } from "@/lib/notifications/service";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const QuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  unreadOnly: z.coerce.boolean().default(false),
});

// GET /api/notifications - List notifications
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    await generalRateLimit(user.id);

    const { searchParams } = new URL(req.url);
    const query = QuerySchema.parse({
      limit: searchParams.get("limit"),
      offset: searchParams.get("offset"),
      unreadOnly: searchParams.get("unreadOnly"),
    });

    const notifications = await getNotifications(user.id, query);

    return successResponse({ notifications });
  } catch (error) {
    return handleApiError(error);
  }
}

// PATCH /api/notifications - Mark all as read
export async function PATCH(req: NextRequest) {
  try {
    const user = await requireAuth();
    await generalRateLimit(user.id);

    const count = await markAllAsRead(user.id);

    return successResponse({ markedAsRead: count });
  } catch (error) {
    return handleApiError(error);
  }
}
