import { db } from "@/lib/db";
import { ACHIEVEMENT_DEFINITIONS } from "./definitions";
import { notifyAchievement } from "@/lib/notifications/service";

// ── Seed Achievements ─────────────────────────────────────────────────

export async function seedAchievements() {
  const existingKeys = await db.achievement.findMany({
    select: { key: true },
  });

  const existingSet = new Set(existingKeys.map((a) => a.key));

  const toCreate = ACHIEVEMENT_DEFINITIONS.filter(
    (def) => !existingSet.has(def.key)
  );

  if (toCreate.length === 0) {
    console.log("[Achievements] All achievements already seeded");
    return;
  }

  const created = await db.achievement.createMany({
    data: toCreate.map((def) => ({
      key: def.key,
      name: def.name,
      description: def.description,
      icon: def.icon,
      category: def.category,
      points: def.points,
      requirement: def.requirement,
    })),
  });

  console.log(`[Achievements] Seeded ${created.count} achievements`);
}

// ── Check and Unlock Achievement ──────────────────────────────────────

export async function checkAndUnlockAchievement(
  userId: string,
  achievementKey: string
) {
  // Check if user already has this achievement
  const existing = await db.userAchievement.findFirst({
    where: {
      userId,
      achievement: { key: achievementKey },
    },
  });

  if (existing) {
    return null; // Already unlocked
  }

  // Get achievement
  const achievement = await db.achievement.findUnique({
    where: { key: achievementKey },
  });

  if (!achievement) {
    console.error(`[Achievements] Achievement not found: ${achievementKey}`);
    return null;
  }

  // Check if user meets requirements
  const meetsRequirement = await checkRequirement(userId, achievement.requirement);

  if (!meetsRequirement) {
    return null; // Doesn't meet requirement yet
  }

  // Unlock achievement
  const userAchievement = await db.userAchievement.create({
    data: {
      userId,
      achievementId: achievement.id,
    },
    include: {
      achievement: true,
    },
  });

  // Update user points
  await db.user.update({
    where: { id: userId },
    data: {
      achievementPoints: { increment: achievement.points },
    },
  });

  // Send notification
  await notifyAchievement(
    userId,
    achievement.name,
    achievement.points,
    achievement.id
  );

  console.log(
    `[Achievements] User ${userId} unlocked "${achievement.name}" (+${achievement.points}pts)`
  );

  return userAchievement;
}

// ── Check if user meets requirement ───────────────────────────────────

async function checkRequirement(
  userId: string,
  requirement: any
): Promise<boolean> {
  const { type, threshold } = requirement;

  switch (type) {
    case "project_created": {
      const count = await db.project.count({
        where: { ownerId: userId },
      });
      return count >= threshold;
    }

    case "projects_joined": {
      const count = await db.projectMember.count({
        where: { userId, role: "MEMBER" },
      });
      return count >= threshold;
    }

    case "projects_completed_as_owner": {
      const count = await db.project.count({
        where: { ownerId: userId, status: "COMPLETED" },
      });
      return count >= threshold;
    }

    case "messages_sent": {
      const count = await db.message.count({
        where: { senderId: userId },
      });
      return count >= threshold;
    }

    case "connections": {
      const count = await db.follow.count({
        where: { followerId: userId },
      });
      return count >= threshold;
    }

    case "followers": {
      const count = await db.follow.count({
        where: { followingId: userId },
      });
      return count >= threshold;
    }

    case "endorsements_received": {
      const count = await db.endorsement.count({
        where: { receiverId: userId },
      });
      return count >= threshold;
    }

    case "endorsements_given": {
      const count = await db.endorsement.count({
        where: { giverId: userId },
      });
      return count >= threshold;
    }

    case "unique_skills_endorsed": {
      const endorsements = await db.endorsement.findMany({
        where: { receiverId: userId },
        select: { label: true },
        distinct: ["label"],
      });
      return endorsements.length >= threshold;
    }

    case "resources_shared": {
      const count = await db.resource.count({
        where: { authorId: userId },
      });
      return count >= threshold;
    }

    case "marketplace_sales": {
      const count = await db.listing.count({
        where: { sellerId: userId, sold: true },
      });
      return count >= threshold;
    }

    case "profile_completed_fast": {
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { createdAt: true, onboardingComplete: true },
      });

      if (!user || !user.onboardingComplete) return false;

      const hoursSinceCreation =
        (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60);
      return hoursSinceCreation <= threshold;
    }

    case "days_active": {
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { createdAt: true },
      });

      if (!user) return false;

      const daysSinceCreation =
        (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceCreation >= threshold;
    }

    case "reputation": {
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { reputation: true },
      });
      return (user?.reputation || 0) >= threshold;
    }

    default:
      console.warn(`[Achievements] Unknown requirement type: ${type}`);
      return false;
  }
}

// ── Check multiple achievements ───────────────────────────────────────

export async function checkAchievementsForEvent(
  userId: string,
  eventType: string
) {
  // Map events to relevant achievements
  const achievementsByEvent: Record<string, string[]> = {
    project_created: ["FIRST_PROJECT"],
    project_joined: ["TEAM_PLAYER"],
    project_completed: ["PROJECT_LEADER"],
    message_sent: ["COMMUNICATOR"],
    user_followed: ["NETWORKING"],
    follower_gained: ["POPULAR"],
    endorsement_received: ["ENDORSED", "SKILL_MASTER"],
    endorsement_given: ["MENTOR"],
    resource_shared: ["CONTRIBUTOR"],
    marketplace_sale: ["MARKETPLACE_SELLER"],
    profile_completed: ["EARLY_BIRD"],
  };

  const achievementsToCheck = achievementsByEvent[eventType] || [];

  const results = [];
  for (const key of achievementsToCheck) {
    const result = await checkAndUnlockAchievement(userId, key);
    if (result) results.push(result);
  }

  // Also check milestone achievements periodically
  if (eventType === "periodic_check") {
    const milestones = ["ONE_MONTH", "REPUTATION_HERO"];
    for (const key of milestones) {
      const result = await checkAndUnlockAchievement(userId, key);
      if (result) results.push(result);
    }
  }

  return results;
}

// ── Get User Achievements ─────────────────────────────────────────────

export async function getUserAchievements(userId: string) {
  return db.userAchievement.findMany({
    where: { userId },
    include: {
      achievement: true,
    },
    orderBy: {
      unlockedAt: "desc",
    },
  });
}

// ── Get Achievement Progress ──────────────────────────────────────────

export async function getAchievementProgress(userId: string) {
  const allAchievements = await db.achievement.findMany();
  const userAchievements = await getUserAchievements(userId);

  const unlockedKeys = new Set(
    userAchievements.map((ua) => ua.achievement.key)
  );

  const progress = await Promise.all(
    allAchievements.map(async (achievement) => {
      const unlocked = unlockedKeys.has(achievement.key);
      const userAchievement = userAchievements.find(
        (ua) => ua.achievement.key === achievement.key
      );

      // Get current progress towards requirement
      let currentValue = 0;
      if (!unlocked) {
        currentValue = await getCurrentProgress(userId, achievement.requirement);
      }

      return {
        achievement,
        unlocked,
        unlockedAt: userAchievement?.unlockedAt,
        currentValue,
        targetValue: (achievement.requirement as any)?.threshold || 0,
        progress: unlocked
          ? 100
          : Math.min(
              100,
              (currentValue / ((achievement.requirement as any)?.threshold || 1)) * 100
            ),
      };
    })
  );

  return progress;
}

// ── Get current progress value ────────────────────────────────────────

async function getCurrentProgress(
  userId: string,
  requirement: any
): Promise<number> {
  const { type } = requirement;

  switch (type) {
    case "project_created":
      return db.project.count({ where: { ownerId: userId } });
    case "projects_joined":
      return db.projectMember.count({ where: { userId, role: "MEMBER" } });
    case "messages_sent":
      return db.message.count({ where: { senderId: userId } });
    case "endorsements_received":
      return db.endorsement.count({ where: { receiverId: userId } });
    case "endorsements_given":
      return db.endorsement.count({ where: { giverId: userId } });
    default:
      return 0;
  }
}
