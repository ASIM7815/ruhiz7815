import { db } from "@/lib/db";

/**
 * Reputation Calculation Formula:
 * 
 * REPUTATION = 
 *   (Projects Created × 50) +
 *   (Resources Uploaded × 20) +
 *   (Skill Endorsements × 10) +
 *   (Study Groups Created × 30) +
 *   (Followers × 5) +
 *   (Project Members × 15) +
 *   (Days Active Streak × 2) +
 *   (Achievement Points)
 */

export async function calculateUserReputation(userId: string): Promise<number> {
  try {
    // Get all relevant data
    const [
      projectsCount,
      resourcesCount,
      skillEndorsements,
      studyGroupsCount,
      followersCount,
      projectMembersCount,
      user,
    ] = await Promise.all([
      // Projects created
      db.project.count({
        where: { ownerId: userId },
      }),

      // Resources uploaded
      db.resource.count({
        where: { authorId: userId },
      }),

      // Skill endorsements received
      db.skillEndorsement.count({
        where: { receiverId: userId },
      }),

      // Study groups where user is a member
      db.studyGroupMember.count({
        where: { userId, role: "LEADER" },
      }),

      // Followers count
      db.follow.count({
        where: { followingId: userId },
      }),

      // Total members in user's projects
      db.projectMember.count({
        where: {
          project: { ownerId: userId },
        },
      }),

      // User data (for streak and achievement points)
      db.user.findUnique({
        where: { id: userId },
        select: {
          currentStreak: true,
          achievementPoints: true,
        },
      }),
    ]);

    if (!user) return 0;

    const reputation =
      projectsCount * 50 +
      resourcesCount * 20 +
      skillEndorsements * 10 +
      studyGroupsCount * 30 +
      followersCount * 5 +
      projectMembersCount * 15 +
      user.currentStreak * 2 +
      user.achievementPoints;

    return reputation;
  } catch (error) {
    console.error("Error calculating reputation:", error);
    return 0;
  }
}

/**
 * Calculate user level based on reputation
 */
export function calculateLevel(reputation: number): number {
  if (reputation < 500) return Math.floor(reputation / 50) + 1; // Level 1-10
  if (reputation < 2000) return 10 + Math.floor((reputation - 500) / 100); // Level 11-25
  if (reputation < 5000) return 25 + Math.floor((reputation - 2000) / 120); // Level 26-50
  if (reputation < 10000) return 50 + Math.floor((reputation - 5000) / 200); // Level 51-75
  return Math.min(100, 75 + Math.floor((reputation - 10000) / 400)); // Level 76-100
}

/**
 * Get level title based on level number
 */
export function getLevelTitle(level: number): string {
  if (level <= 10) return "Beginner";
  if (level <= 25) return "Builder";
  if (level <= 50) return "Expert";
  if (level <= 75) return "Master";
  return "Legend";
}

/**
 * Update user reputation and level
 */
export async function updateUserReputation(userId: string): Promise<void> {
  try {
    const reputation = await calculateUserReputation(userId);
    const level = calculateLevel(reputation);

    await db.user.update({
      where: { id: userId },
      data: {
        reputation,
        level,
      },
    });
  } catch (error) {
    console.error("Error updating user reputation:", error);
  }
}

/**
 * Get reputation breakdown for display
 */
export async function getReputationBreakdown(userId: string) {
  const [
    projectsCount,
    resourcesCount,
    skillEndorsements,
    studyGroupsCount,
    followersCount,
    projectMembersCount,
    user,
  ] = await Promise.all([
    db.project.count({ where: { ownerId: userId } }),
    db.resource.count({ where: { authorId: userId } }),
    db.skillEndorsement.count({ where: { receiverId: userId } }),
    db.studyGroupMember.count({ where: { userId, role: "LEADER" } }),
    db.follow.count({ where: { followingId: userId } }),
    db.projectMember.count({ where: { project: { ownerId: userId } } }),
    db.user.findUnique({
      where: { id: userId },
      select: { currentStreak: true, achievementPoints: true },
    }),
  ]);

  return {
    projects: { count: projectsCount, points: projectsCount * 50 },
    resources: { count: resourcesCount, points: resourcesCount * 20 },
    endorsements: { count: skillEndorsements, points: skillEndorsements * 10 },
    groups: { count: studyGroupsCount, points: studyGroupsCount * 30 },
    followers: { count: followersCount, points: followersCount * 5 },
    members: { count: projectMembersCount, points: projectMembersCount * 15 },
    streak: { count: user?.currentStreak || 0, points: (user?.currentStreak || 0) * 2 },
    achievements: { points: user?.achievementPoints || 0 },
  };
}
