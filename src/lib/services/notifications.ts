import { db } from "@/lib/db";

type NotificationInput = {
  userId: string;
  type: string;
  title: string;
  message: string;
  link?: string | null;
  actorId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
};

export async function createNotification(input: NotificationInput) {
  try {
    return await db.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        message: input.message,
        link: input.link || null,
        actorId: input.actorId || null,
        entityType: input.entityType || null,
        entityId: input.entityId || null,
      },
    });
  } catch (error) {
    console.error("[notifications] Failed to create notification", error);
    return null;
  }
}

export async function createNotifications(inputs: NotificationInput[]) {
  if (inputs.length === 0) return;

  try {
    await db.notification.createMany({
      data: inputs.map((input) => ({
        userId: input.userId,
        type: input.type,
        title: input.title,
        message: input.message,
        link: input.link || null,
        actorId: input.actorId || null,
        entityType: input.entityType || null,
        entityId: input.entityId || null,
      })),
    });
  } catch (error) {
    console.error("[notifications] Failed to create notifications", error);
  }
}
