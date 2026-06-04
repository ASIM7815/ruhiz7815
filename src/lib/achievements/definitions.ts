import { AchievementCategory } from "@prisma/client";

export interface AchievementDefinition {
  key: string;
  name: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  points: number;
  requirement: {
    type: string;
    threshold: number;
    [key: string]: any;
  };
}

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  // ── Projects ────────────────────────────────────────────────────────
  {
    key: "FIRST_PROJECT",
    name: "First Project",
    description: "Create your first project",
    icon: "🚀",
    category: "PROJECTS",
    points: 10,
    requirement: {
      type: "project_created",
      threshold: 1,
    },
  },
  {
    key: "TEAM_PLAYER",
    name: "Team Player",
    description: "Join 5 different projects",
    icon: "🤝",
    category: "PROJECTS",
    points: 25,
    requirement: {
      type: "projects_joined",
      threshold: 5,
    },
  },
  {
    key: "PROJECT_LEADER",
    name: "Project Leader",
    description: "Complete 3 projects as owner",
    icon: "👑",
    category: "PROJECTS",
    points: 50,
    requirement: {
      type: "projects_completed_as_owner",
      threshold: 3,
    },
  },

  // ── Social ──────────────────────────────────────────────────────────
  {
    key: "COMMUNICATOR",
    name: "Communicator",
    description: "Send 100 messages",
    icon: "💬",
    category: "SOCIAL",
    points: 20,
    requirement: {
      type: "messages_sent",
      threshold: 100,
    },
  },
  {
    key: "NETWORKING",
    name: "Networking Pro",
    description: "Connect with 20 users",
    icon: "🌐",
    category: "SOCIAL",
    points: 30,
    requirement: {
      type: "connections",
      threshold: 20,
    },
  },
  {
    key: "POPULAR",
    name: "Popular",
    description: "Get 50 followers",
    icon: "⭐",
    category: "SOCIAL",
    points: 40,
    requirement: {
      type: "followers",
      threshold: 50,
    },
  },

  // ── Skills ──────────────────────────────────────────────────────────
  {
    key: "ENDORSED",
    name: "Endorsed",
    description: "Receive 10 endorsements",
    icon: "✨",
    category: "SKILLS",
    points: 25,
    requirement: {
      type: "endorsements_received",
      threshold: 10,
    },
  },
  {
    key: "MENTOR",
    name: "Mentor",
    description: "Give 25 endorsements to others",
    icon: "🎓",
    category: "SKILLS",
    points: 30,
    requirement: {
      type: "endorsements_given",
      threshold: 25,
    },
  },
  {
    key: "SKILL_MASTER",
    name: "Skill Master",
    description: "Get endorsed for 5 different skills",
    icon: "🏆",
    category: "SKILLS",
    points: 50,
    requirement: {
      type: "unique_skills_endorsed",
      threshold: 5,
    },
  },

  // ── Community ───────────────────────────────────────────────────────
  {
    key: "CONTRIBUTOR",
    name: "Contributor",
    description: "Share 10 resources",
    icon: "📚",
    category: "COMMUNITY",
    points: 20,
    requirement: {
      type: "resources_shared",
      threshold: 10,
    },
  },
  {
    key: "HELPFUL",
    name: "Helpful",
    description: "Answer 20 questions in study groups",
    icon: "💡",
    category: "COMMUNITY",
    points: 35,
    requirement: {
      type: "study_group_messages",
      threshold: 20,
    },
  },
  {
    key: "MARKETPLACE_SELLER",
    name: "Marketplace Seller",
    description: "Complete 5 marketplace transactions",
    icon: "🛒",
    category: "COMMUNITY",
    points: 25,
    requirement: {
      type: "marketplace_sales",
      threshold: 5,
    },
  },

  // ── Milestones ──────────────────────────────────────────────────────
  {
    key: "EARLY_BIRD",
    name: "Early Bird",
    description: "Complete your profile within 24 hours of signup",
    icon: "🐦",
    category: "MILESTONE",
    points: 15,
    requirement: {
      type: "profile_completed_fast",
      threshold: 24, // hours
    },
  },
  {
    key: "ONE_MONTH",
    name: "One Month Strong",
    description: "Active for 30 days",
    icon: "📅",
    category: "MILESTONE",
    points: 20,
    requirement: {
      type: "days_active",
      threshold: 30,
    },
  },
  {
    key: "REPUTATION_HERO",
    name: "Reputation Hero",
    description: "Reach 500 reputation points",
    icon: "🌟",
    category: "MILESTONE",
    points: 100,
    requirement: {
      type: "reputation",
      threshold: 500,
    },
  },
];

// ── Get achievement by key ────────────────────────────────────────────

export function getAchievementDefinition(key: string): AchievementDefinition | undefined {
  return ACHIEVEMENT_DEFINITIONS.find((a) => a.key === key);
}

// ── Get achievements by category ──────────────────────────────────────

export function getAchievementsByCategory(
  category: AchievementCategory
): AchievementDefinition[] {
  return ACHIEVEMENT_DEFINITIONS.filter((a) => a.category === category);
}
