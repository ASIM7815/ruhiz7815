
import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/api-middleware";
import { supabaseAdmin } from "@/lib/supabase-server";
import { handleApiError, successResponse, AuthorizationError } from "@/lib/api-errors";
import { messageRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_MESSAGE_LENGTH = 5000;

// POST /api/messages/send — send a plaintext message
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    await messageRateLimit(user.id);

    const { conversationId, content } = await req.json();

    if (!conversationId || typeof conversationId !== "string") {
      return Response.json({ error: "conversationId is required" }, { status: 400 });
    }

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return Response.json({ error: "Message content is required" }, { status: 400 });
    }

    if (content.length > MAX_MESSAGE_LENGTH) {
      return Response.json(
        { error: `Message too long (max ${MAX_MESSAGE_LENGTH} characters)` },
        { status: 400 }
      );
    }

    // Verify user is a participant
    const { data: participant } = await supabaseAdmin
      .from("conversation_participants")
      .select("id")
      .eq("conversation_id", conversationId)
      .eq("user_id", user.id)
      .single();

    if (!participant) {
      throw new AuthorizationError("Not a participant in this conversation");
    }

    // Create message
    const { data: message, error: msgErr } = await supabaseAdmin
      .from("direct_messages")
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: content.trim(),
      })
      .select("id, content, sender_id, is_read, created_at")
      .single();

    if (msgErr || !message) {
      throw new Error("Failed to send message");
    }

    // Update conversation timestamp
    await supabaseAdmin
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId);

    // TODO: Create notification for recipients

    return successResponse(
      {
        id: message.id,
        content: message.content,
        senderId: message.sender_id,
        isRead: message.is_read,
        createdAt: message.created_at,
      },
      201
    );
  } catch (error) {
    return handleApiError(error);
  }
}
