import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { profileLookupToken, profilePathFor } from "@/lib/profile-identity";
import { getActivityHeatmap } from "@/lib/activity/tracker";
import { getLevelTitle } from "@/lib/reputation/calculator";

export type ProfileCompletionItem = {
  label: string;
  done: boolean;
};

export type ProfileActivityItem = {
  id: string;
  type: string;
  title: string;
  message: string | null;
  href: string | null;
  createdAt: Date;
};

function profileWhere(identifier: string) {
  const token = profileLookupToken(identifier);
  const matches: Prisma.UserWhereInput[] = [{ id: identifier }, { id: token }];

  if (/^\d{5}$/.test(token)) {
    matches.push({ uid: token });
  }

  if (/^[a-z][a-z0-9_]{2,29}$/.test(token)) {
    matches.push({ username: token });
  }

  return { OR: matches };
}

function completionItems(profile: {
  image: string | null;
  bio: string | null;
  skills: { skill: string }[];
  interests: { interest: string }[];
  ownedProjects: unknown[];
  githubUsername: string | null;
  linkedinUrl: string | null;
}) {
  return [
    { label: "Photo", done: Boolean(profile.image) },
    { label: "Bio", done: Boolean(profile.bio?.trim()) },
    { label: "Skills", done: profile.skills.length > 0 },
    { label: "Interests", done: profile.interests.length > 0 },
    { label: "Projects", done: profile.ownedProjects.length > 0 },
    { label: "Social Links", done: Boolean(profile.githubUsername || profile.linkedinUrl) },
  ];
}

function completionScore(items: ProfileCompletionItem[]) {
  if (items.length === 0) return 0;
  return Math.round((items.filter((item) => item.done).length / items.length) * 100);
}

export async function getStudentProfile(identifier: string, viewerId?: string | null) {
  const user = await db.user.findFirst({
    where: profileWhere(identifier),
    include: {
      skills: { orderBy: { skill: "asc" } },
      interests: { orderBy: { interest: "asc" } },
      ownedProjects: {
        orderBy: { createdAt: "desc" },
        take: 6,
        include: {
          skills: { select: { skill: true } },
          _count: { select: { members: true } },
        },
      },
      resources: {
        orderBy: { createdAt: "desc" },
        take: 6,
      },
      studyGroupMembers: {
        orderBy: { joinedAt: "desc" },
        take: 6,
        include: {
          group: {
            include: {
              _count: { select: { members: true } },
            },
          },
        },
      },
      userAchievements: {
        orderBy: { unlockedAt: "desc" },
        take: 8,
        include: {
          achievement: true,
        },
      },
      activities: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      endorsementsReceived: {
        select: { label: true },
        take: 200,
      },
      featuredItems: {
        where: { isPinned: true },
        orderBy: { displayOrder: "asc" },
        take: 4,
      },
      _count: {
        select: {
          followers: true,
          following: true,
          ownedProjects: true,
          resources: true,
          studyGroupMembers: true,
        },
      },
    },
  });

  if (!user) return null;

  const [downloadStats, follow, skillEndorsements, heatmapData] = await Promise.all([
    db.resource.aggregate({
      where: { authorId: user.id },
      _sum: { downloads: true },
    }),
    viewerId
      ? db.follow.findUnique({
          where: {
            followerId_followingId: {
              followerId: viewerId,
              followingId: user.id,
            },
          },
          select: { id: true },
        })
      : Promise.resolve(null),
    // Get skill endorsement counts
    db.skillEndorsement.groupBy({
      by: ['skillName'],
      where: { receiverId: user.id },
      _count: { skillName: true },
    }),
    // Get activity heatmap
    getActivityHeatmap(user.id),
  ]);

  const completion = completionItems(user);
  const endorsementCounts = Array.from(
    user.endorsementsReceived.reduce((counts, endorsement) => {
      counts.set(endorsement.label, (counts.get(endorsement.label) || 0) + 1);
      return counts;
    }, new Map<string, number>())
  )
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const derivedActivity: ProfileActivityItem[] = [
    ...user.ownedProjects.map((project) => ({
      id: `project-${project.id}`,
      type: "PROJECT",
      title: `Created project ${project.title}`,
      message: project.description,
      href: `/projects/${project.id}`,
      createdAt: project.createdAt,
    })),
    ...user.resources.map((resource) => ({
      id: `resource-${resource.id}`,
      type: "RESOURCE",
      title: `Shared ${resource.title}`,
      message: resource.description,
      href: "/knowledge",
      createdAt: resource.createdAt,
    })),
    ...user.studyGroupMembers.map((membership) => ({
      id: `group-${membership.id}`,
      type: "GROUP",
      title: `Joined ${membership.group.name}`,
      message: membership.group.subject,
      href: "/study-groups",
      createdAt: membership.joinedAt,
    })),
    ...user.activities.map((activity) => ({
      id: activity.id,
      type: activity.type,
      title: activity.title,
      message: activity.message,
      href: null,
      createdAt: activity.createdAt,
    })),
  ]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 10);

  // Map skills with endorsement counts
  const skillsWithEndorsements = user.skills.map((skill) => ({
    skill: skill.skill,
    endorsements: skillEndorsements.find(e => e.skillName === skill.skill)?._count.skillName || 0,
  })).sort((a, b) => b.endorsements - a.endorsements);

  return {
    id: user.id,
    uid: user.uid,
    username: user.username,
    name: user.name,
    email: user.email,
    image: user.image,
    coverImage: user.coverImage,
    headline: user.headline,
    bio: user.bio,
    university: user.university,
    role: user.role,
    reputation: user.reputation,
    level: user.level,
    currentStreak: user.currentStreak,
    longestStreak: user.longestStreak,
    verified: user.verified,
    customBadges: user.customBadges,
    githubUsername: user.githubUsername,
    linkedinUrl: user.linkedinUrl,
    twitterUsername: user.twitterUsername,
    portfolioUrl: user.portfolioUrl,
    collegeVerified: user.collegeVerified,
    createdAt: user.createdAt,
    profilePath: profilePathFor(user),
    isFollowing: Boolean(follow),
    skills: skillsWithEndorsements,
    interests: user.interests.map((interest) => interest.interest),
    completion: {
      score: completionScore(completion),
      items: completion,
    },
    stats: {
      followers: user._count.followers,
      following: user._count.following,
      projects: user._count.ownedProjects,
      resources: user._count.resources,
      studyGroups: user._count.studyGroupMembers,
      downloads: downloadStats._sum.downloads || 0,
    },
    projects: user.ownedProjects.map((project) => ({
      id: project.id,
      title: project.title,
      description: project.description,
      status: project.status,
      timeline: project.timeline,
      maxMembers: project.maxMembers,
      memberCount: project._count.members,
      createdAt: project.createdAt,
      skills: project.skills.map((skill) => skill.skill),
    })),
    resources: user.resources.map((resource) => ({
      id: resource.id,
      title: resource.title,
      description: resource.description,
      type: resource.type,
      downloads: resource.downloads,
      createdAt: resource.createdAt,
    })),
    studyGroups: user.studyGroupMembers.map((membership) => ({
      id: membership.group.id,
      name: membership.group.name,
      subject: membership.group.subject,
      role: membership.role,
      memberCount: membership.group._count.members,
      joinedAt: membership.joinedAt,
    })),
    achievements: user.userAchievements.map((ua: any) => ({
      id: ua.id,
      title: ua.achievement.name,
      description: ua.achievement.description,
      icon: ua.achievement.icon,
      type: ua.achievement.category,
      unlockedAt: ua.unlockedAt,
    })),
    endorsements: endorsementCounts,
    activity: derivedActivity,
    featuredItems: user.featuredItems.map((item) => ({
      id: item.id,
      type: item.type,
      title: item.title,
      description: item.description,
      url: item.url,
      icon: item.icon,
    })),
    heatmapData,
  };
}

export type StudentProfile = NonNullable<Awaited<ReturnType<typeof getStudentProfile>>>;
