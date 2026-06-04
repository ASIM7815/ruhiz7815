import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/api-middleware";
import { handleApiError, successResponse } from "@/lib/api-errors";
import { generalRateLimit } from "@/lib/rate-limit";
import { getUnreadCount } from "@/lib/notifications/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/notifications/unread-count - Get unread notification count
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    await generalRateLimit(user.id);

    const count = await getUnreadCount(user.id);

    return successResponse({ count });
  } catch (error) {
    return handleApiError(error);
  }
}
