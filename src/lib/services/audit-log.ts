import { db } from "@/lib/db";

type AuditLogInput = {
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
};

/**
 * Create an audit log entry
 * Used to track admin and moderator actions
 */
export async function createAuditLog(input: AuditLogInput) {
  try {
    return await db.auditLog.create({
      data: {
        actorId: input.actorId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      },
    });
  } catch (error) {
    console.error("[audit-log] Failed to create audit log", error);
    return null;
  }
}

/**
 * Get audit logs for a specific entity
 */
export async function getAuditLogs(entityType: string, entityId: string) {
  return await db.auditLog.findMany({
    where: {
      entityType,
      entityId,
    },
    include: {
      actor: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 50,
  });
}

/**
 * Get recent audit logs for admin dashboard
 */
export async function getRecentAuditLogs(limit = 20) {
  return await db.auditLog.findMany({
    include: {
      actor: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
  });
}

/**
 * Common audit log actions
 */
export const AUDIT_ACTIONS = {
  // User actions
  USER_CREATED: "USER_CREATED",
  USER_UPDATED: "USER_UPDATED",
  USER_SUSPENDED: "USER_SUSPENDED",
  USER_UNSUSPENDED: "USER_UNSUSPENDED",
  USER_DELETED: "USER_DELETED",

  // Project actions
  PROJECT_ARCHIVED: "PROJECT_ARCHIVED",
  PROJECT_RESTORED: "PROJECT_RESTORED",
  PROJECT_DELETED: "PROJECT_DELETED",
  PROJECT_STATUS_CHANGED: "PROJECT_STATUS_CHANGED",

  // Member actions
  MEMBER_ADDED: "MEMBER_ADDED",
  MEMBER_REMOVED: "MEMBER_REMOVED",
  MEMBER_ROLE_CHANGED: "MEMBER_ROLE_CHANGED",

  // Marketplace actions
  LISTING_HIDDEN: "LISTING_HIDDEN",
  LISTING_REMOVED: "LISTING_REMOVED",
  LISTING_APPROVED: "LISTING_APPROVED",
  SELLER_APPROVED: "SELLER_APPROVED",
  SELLER_SUSPENDED: "SELLER_SUSPENDED",

  // Report actions
  REPORT_REVIEWED: "REPORT_REVIEWED",
  REPORT_RESOLVED: "REPORT_RESOLVED",
  REPORT_DISMISSED: "REPORT_DISMISSED",

  // Group actions
  GROUP_DELETED: "GROUP_DELETED",
  GROUP_ARCHIVED: "GROUP_ARCHIVED",
  MESSAGE_DELETED: "MESSAGE_DELETED",
} as const;
