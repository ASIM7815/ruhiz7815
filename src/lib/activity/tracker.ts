import { db } from "@/lib/db";
import { ActivityType } from "@prisma/client";

/**
 * Track user activity for daily heatmap and streak calculation
 */
export async function trackActivity(
  userId: string,
  activityType: ActivityType,
  metadata?: any
): Promise<void> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Update or create daily activity record
    const existing = await db.dailyActivity.findUnique({
      where: {
        userId_date: {
          userId,
          date: today,
        },
      },
    });

    if (existing) {
      // Update existing record
      const activityTypes = existing.activityTypes as any || {};
      activityTypes[activityType] = (activityTypes[activityType] || 0) + 1;

      await db.dailyActivity.update({
        where: { id: existing.id },
        data: {
          activityCount: existing.activityCount + 1,
          activityTypes,
        },
      });
    } else {
      // Create new record
      await db.dailyActivity.create({
        data: {
          userId,
          date: today,
          activityCount: 1,
          activityTypes: { [activityType]: 1 },
        },
      });
    }

    // Update user streak
    await updateUserStreak(userId);

    // Increment total contributions
    await db.user.update({
      where: { id: userId },
      data: {
        totalContributions: { increment: 1 },
        lastActivityDate: new Date(),
      },
    });
  } catch (error) {
    console.error("Error tracking activity:", error);
  }
}

/**
 * Update user's activity streak
 */
async function updateUserStreak(userId: string): Promise<void> {
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        currentStreak: true,
        longestStreak: true,
        lastActivityDate: true,
      },
    });

    if (!user) return;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const lastActivity = user.lastActivityDate
      ? new Date(user.lastActivityDate.getFullYear(), user.lastActivityDate.getMonth(), user.lastActivityDate.getDate())
      : null;

    let newStreak = user.currentStreak;

    if (!lastActivity) {
      // First activity ever
      newStreak = 1;
    } else {
      const daysSinceLastActivity = Math.floor(
        (today.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceLastActivity === 0) {
        // Same day, no change
        return;
      } else if (daysSinceLastActivity === 1) {
        // Consecutive day, increment streak
        newStreak = user.currentStreak + 1;
      } else {
        // Streak broken, reset to 1
        newStreak = 1;
      }
    }

    // Update user
    await db.user.update({
      where: { id: userId },
      data: {
        currentStreak: newStreak,
        longestStreak: Math.max(newStreak, user.longestStreak),
      },
    });
  } catch (error) {
    console.error("Error updating user streak:", error);
  }
}

/**
 * Get activity heatmap data for the past 6 months
 */
export async function getActivityHeatmap(userId: string) {
  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const activities = await db.dailyActivity.findMany({
      where: {
        userId,
        date: {
          gte: sixMonthsAgo,
        },
      },
      orderBy: {
        date: "asc",
      },
    });

    // Convert to heatmap format
    const heatmapData = activities.map((activity) => ({
      date: activity.date.toISOString().split("T")[0],
      count: activity.activityCount,
      level: getActivityLevel(activity.activityCount),
    }));

    return heatmapData;
  } catch (error) {
    console.error("Error getting activity heatmap:", error);
    return [];
  }
}

/**
 * Get activity level for heatmap coloring (0-4)
 */
function getActivityLevel(count: number): number {
  if (count === 0) return 0;
  if (count <= 2) return 1;
  if (count <= 5) return 2;
  if (count <= 10) return 3;
  return 4;
}

/**
 * Create activity feed entry
 */
export async function createActivity(
  userId: string,
  type: ActivityType,
  title: string,
  message?: string,
  metadata?: any
): Promise<void> {
  try {
    await db.activity.create({
      data: {
        userId,
        type,
        title,
        message,
        metadata,
      },
    });

    // Also track for daily activity
    await trackActivity(userId, type, metadata);
  } catch (error) {
    console.error("Error creating activity:", error);
  }
}
