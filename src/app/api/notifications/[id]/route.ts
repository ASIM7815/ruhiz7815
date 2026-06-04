import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/api-middleware";
import { handleApiError, successResponse } from "@/lib/api-errors";
import { generalRateLimit } from "@/lib/rate-limit";
import { markAsRead, deleteNotification } from "@/lib/notifications/service";
import { validateId } from "@/lib/validation/middleware";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PATCH /api/notifications/[id] - Mark notification as read
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    await generalRateLimit(user.id);

    const { id } = await params;
    validateId(id, "Notification ID");

    const success = await markAsRead(id, user.id);

    if (!success) {
      return successResponse({ error: "Notification not found" }, 404);
    }

    return successResponse({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/notifications/[id] - Delete notification
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    await generalRateLimit(user.id);

    const { id } = await params;
    validateId(id, "Notification ID");

    const success = await deleteNotification(id, user.id);

    if (!success) {
      return successResponse({ error: "Notification not found" }, 404);
    }

    return successResponse({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
