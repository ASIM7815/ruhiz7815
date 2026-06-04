import { db } from "@/lib/db";
import { NotificationType } from "@prisma/client";

// ── Notification Templates ────────────────────────────────────────────

const templates = {
  PROJECT_JOIN_REQUEST: (data: { projectTitle: string; userName: string }) => ({
    title: "New Join Request",
    message: `${data.userName} wants to join your project "${data.projectTitle}"`,
  }),
  PROJECT_ACCEPTED: (data: { projectTitle: string }) => ({
    title: "Join Request Accepted",
    message: `Your request to join "${data.projectTitle}" has been accepted!`,
  }),
  PROJECT_REJECTED: (data: { projectTitle: string }) => ({
    title: "Join Request Declined",
    message: `Your request to join "${data.projectTitle}" was declined`,
  }),
  MESSAGE_RECEIVED: (data: { senderName: string; preview: string }) => ({
    title: "New Message",
    message: `${data.senderName}: ${data.preview}`,
  }),
  CALL_MISSED: (data: { callerName: string; callType: string }) => ({
    title: "Missed Call",
    message: `You missed a ${data.callType} call from ${data.callerName}`,
  }),
  CALL_RECEIVED: (data: { callerName: string; callType: string }) => ({
    title: "Incoming Call",
    message: `${data.callerName} is calling you (${data.callType})`,
  }),
  ENDORSEMENT_GIVEN: (data: { giverName: string; skill: string }) => ({
    title: "New Endorsement",
    message: `${data.giverName} endorsed you for ${data.skill}`,
  }),
  ACHIEVEMENT_UNLOCKED: (data: { achievementName: string; points: number }) => ({
    title: "Achievement Unlocked!",
    message: `You earned "${data.achievementName}" (+${data.points} points)`,
  }),
  GROUP_INVITATION: (data: { groupName: string; inviterName: string }) => ({
    title: "Group Invitation",
    message: `${data.inviterName} invited you to join "${data.groupName}"`,
  }),
  TEAM_INVITE: (data: { teamName: string; inviterName: string }) => ({
    title: "Team Invitation",
    message: `${data.inviterName} invited you to join "${data.teamName}"`,
  }),
  PROJECT_UPDATE: (data: { projectTitle: string; updateType: string }) => ({
    title: "Project Update",
    message: `"${data.projectTitle}": ${data.updateType}`,
  }),
  REPUTATION: (data: { change: number; reason: string }) => ({
    title: data.change > 0 ? "Reputation Gained" : "Reputation Lost",
    message: `${data.change > 0 ? "+" : ""}${data.change} points: ${data.reason}`,
  }),
  GENERAL: (data: { title: string; message: string }) => ({
    title: data.title,
    message: data.message,
  }),
};

// ── Create Notification ───────────────────────────────────────────────

export async function createNotification(
  userId: string,
  type: NotificationType,
  data: Record<string, any>
) {
  // Generate title and message from template
  const template = templates[type as keyof typeof templates];
  if (!template) {
    throw new Error(`Unknown notification type: ${type}`);
  }

  const { title, message } = template(data as any);

  // Create notification
  const notification = await db.notification.create({
    data: {
      userId,
      type,
      title,
      message,
      data,
    },
  });

  // TODO: Send real-time notification via Supabase Realtime
  // TODO: Send push notification if user has enabled them
  // TODO: Send email notification if important and user preferences allow

  return notification;
}

// ── Batch Create Notifications ────────────────────────────────────────

export async function createBulkNotifications(
  userIds: string[],
  type: NotificationType,
  data: Record<string, any>
) {
  const template = templates[type as keyof typeof templates];
  if (!template) {
    throw new Error(`Unknown notification type: ${type}`);
  }

  const { title, message } = template(data as any);

  const notifications = await db.notification.createMany({
    data: userIds.map((userId) => ({
      userId,
      type,
      title,
      message,
      data,
    })),
  });

  return notifications;
}

// ── Mark as Read ──────────────────────────────────────────────────────

export async function markAsRead(notificationId: string, userId: string) {
  const notification = await db.notification.updateMany({
    where: {
      id: notificationId,
      userId, // Ensure user owns this notification
    },
    data: {
      read: true,
    },
  });

  return notification.count > 0;
}

// ── Mark All as Read ──────────────────────────────────────────────────

export async function markAllAsRead(userId: string) {
  const result = await db.notification.updateMany({
    where: {
      userId,
      read: false,
    },
    data: {
      read: true,
    },
  });

  return result.count;
}

// ── Get Unread Count ──────────────────────────────────────────────────

export async function getUnreadCount(userId: string) {
  const count = await db.notification.count({
    where: {
      userId,
      read: false,
    },
  });

  return count;
}

// ── Get Notifications ─────────────────────────────────────────────────

export async function getNotifications(
  userId: string,
  options: {
    limit?: number;
    offset?: number;
    unreadOnly?: boolean;
    types?: NotificationType[];
  } = {}
) {
  const { limit = 20, offset = 0, unreadOnly = false, types } = options;

  const where: any = { userId };

  if (unreadOnly) {
    where.read = false;
  }

  if (types && types.length > 0) {
    where.type = { in: types };
  }

  const notifications = await db.notification.findMany({
    where,
    take: limit,
    skip: offset,
    orderBy: {
      createdAt: "desc",
    },
  });

  return notifications;
}

// ── Delete Notification ───────────────────────────────────────────────

export async function deleteNotification(notificationId: string, userId: string) {
  const result = await db.notification.deleteMany({
    where: {
      id: notificationId,
      userId, // Ensure user owns this notification
    },
  });

  return result.count > 0;
}

// ── Delete Old Notifications ──────────────────────────────────────────

export async function deleteOldNotifications(userId: string, daysOld: number = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const result = await db.notification.deleteMany({
    where: {
      userId,
      read: true,
      createdAt: {
        lt: cutoffDate,
      },
    },
  });

  return result.count;
}

// ── Helper: Notify Project Owner ──────────────────────────────────────

export async function notifyProjectJoinRequest(
  projectId: string,
  requesterName: string
) {
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { ownerId: true, title: true },
  });

  if (!project) return null;

  return createNotification(project.ownerId, "PROJECT_JOIN_REQUEST", {
    projectTitle: project.title,
    userName: requesterName,
    projectId,
  });
}

// ── Helper: Notify User of Acceptance ─────────────────────────────────

export async function notifyProjectAcceptance(
  userId: string,
  projectTitle: string,
  projectId: string
) {
  return createNotification(userId, "PROJECT_ACCEPTED", {
    projectTitle,
    projectId,
  });
}

// ── Helper: Notify Message Recipients ────────────────────────────────

export async function notifyMessageReceived(
  recipientIds: string[],
  senderName: string,
  messagePreview: string,
  conversationId: string
) {
  return createBulkNotifications(recipientIds, "MESSAGE_RECEIVED", {
    senderName,
    preview: messagePreview.substring(0, 100),
    conversationId,
  });
}

// ── Helper: Notify Missed Call ────────────────────────────────────────

export async function notifyMissedCall(
  userId: string,
  callerName: string,
  callType: "AUDIO" | "VIDEO",
  callId: string
) {
  return createNotification(userId, "CALL_MISSED", {
    callerName,
    callType,
    callId,
  });
}

// ── Helper: Notify Endorsement ────────────────────────────────────────

export async function notifyEndorsement(
  userId: string,
  giverName: string,
  skill: string,
  endorsementId: string
) {
  return createNotification(userId, "ENDORSEMENT_GIVEN", {
    giverName,
    skill,
    endorsementId,
  });
}

// ── Helper: Notify Achievement ────────────────────────────────────────

export async function notifyAchievement(
  userId: string,
  achievementName: string,
  achievementPoints: number,
  achievementId: string
) {
  return createNotification(userId, "ACHIEVEMENT_UNLOCKED", {
    achievementName,
    points: achievementPoints,
    achievementId,
  });
}
