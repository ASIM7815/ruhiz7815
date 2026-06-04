import { z } from "zod";

// ── User Schemas ──────────────────────────────────────────────────────

export const UpdateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  bio: z.string().max(500).optional(),
  avatar: z.string().url().optional(),
  location: z.string().max(100).optional(),
  website: z.string().url().optional(),
  github: z.string().max(100).optional(),
  linkedin: z.string().max(100).optional(),
  twitter: z.string().max(100).optional(),
});

export const UserSearchSchema = z.object({
  q: z.string().min(1).max(100),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  offset: z.coerce.number().int().min(0).default(0),
  role: z.enum(["STUDENT", "ADMIN"]).optional(),
});

// ── Project Schemas ───────────────────────────────────────────────────

export const CreateProjectSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().min(10).max(2000),
  category: z.string().min(2).max(50),
  tags: z.array(z.string().max(30)).max(10).optional(),
  requirements: z.string().max(5000).optional(),
  teamSize: z.number().int().min(1).max(50).optional(),
  duration: z.string().max(100).optional(),
  difficulty: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]).optional(),
  isPublic: z.boolean().default(true),
});

export const UpdateProjectSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  description: z.string().min(10).max(2000).optional(),
  category: z.string().min(2).max(50).optional(),
  tags: z.array(z.string().max(30)).max(10).optional(),
  requirements: z.string().max(5000).optional(),
  teamSize: z.number().int().min(1).max(50).optional(),
  duration: z.string().max(100).optional(),
  difficulty: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]).optional(),
  status: z.enum(["PLANNING", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
  isPublic: z.boolean().optional(),
});

export const ProjectMemberActionSchema = z.object({
  action: z.enum(["accept", "reject", "remove"]),
});

// ── Message Schemas ───────────────────────────────────────────────────

export const CreateMessageSchema = z.object({
  recipientId: z.string().cuid().optional(),
  conversationId: z.string().cuid().optional(),
  content: z.string().min(1).max(10000),
  type: z.enum(["TEXT", "IMAGE", "FILE", "SYSTEM"]).default("TEXT"),
  metadata: z.record(z.string(), z.any()).optional(),
}).refine(
  (data) => data.recipientId || data.conversationId,
  {
    message: "Either recipientId or conversationId must be provided",
  }
);

export const CreateConversationSchema = z.object({
  participantIds: z.array(z.string().cuid()).min(1).max(50),
  name: z.string().min(1).max(100).optional(),
  type: z.enum(["DIRECT", "GROUP"]).default("DIRECT"),
});

export const UpdateConversationSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  lastReadAt: z.string().datetime().optional(),
});

// ── Study Group Schemas ───────────────────────────────────────────────

export const CreateStudyGroupSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().min(10).max(1000),
  subject: z.string().min(2).max(100),
  tags: z.array(z.string().max(30)).max(10).optional(),
  maxMembers: z.number().int().min(2).max(100).default(10),
  isPublic: z.boolean().default(true),
  meetingSchedule: z.string().max(200).optional(),
});

export const UpdateStudyGroupSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  description: z.string().min(10).max(1000).optional(),
  subject: z.string().min(2).max(100).optional(),
  tags: z.array(z.string().max(30)).max(10).optional(),
  maxMembers: z.number().int().min(2).max(100).optional(),
  isPublic: z.boolean().optional(),
  meetingSchedule: z.string().max(200).optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]).optional(),
});

// ── Resource Schemas ──────────────────────────────────────────────────

export const CreateResourceSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(10).max(2000),
  type: z.enum(["ARTICLE", "VIDEO", "BOOK", "COURSE", "TOOL", "OTHER"]),
  url: z.string().url().max(2048),
  tags: z.array(z.string().max(30)).max(10).optional(),
  category: z.string().min(2).max(50),
  difficulty: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]).optional(),
});

export const UpdateResourceSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().min(10).max(2000).optional(),
  type: z.enum(["ARTICLE", "VIDEO", "BOOK", "COURSE", "TOOL", "OTHER"]).optional(),
  url: z.string().url().max(2048).optional(),
  tags: z.array(z.string().max(30)).max(10).optional(),
  category: z.string().min(2).max(50).optional(),
  difficulty: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]).optional(),
});

// ── Marketplace Schemas ───────────────────────────────────────────────

export const CreateMarketplaceListingSchema = z.object({
  title: z.string().min(5).max(100),
  description: z.string().min(20).max(2000),
  type: z.enum(["SERVICE", "PRODUCT", "GIG"]),
  category: z.string().min(2).max(50),
  price: z.number().min(0).max(1000000).optional(),
  currency: z.enum(["USD", "EUR", "GBP"]).default("USD"),
  tags: z.array(z.string().max(30)).max(10).optional(),
  images: z.array(z.string().url()).max(10).optional(),
});

export const UpdateMarketplaceListingSchema = z.object({
  title: z.string().min(5).max(100).optional(),
  description: z.string().min(20).max(2000).optional(),
  type: z.enum(["SERVICE", "PRODUCT", "GIG"]).optional(),
  category: z.string().min(2).max(50).optional(),
  price: z.number().min(0).max(1000000).optional(),
  currency: z.enum(["USD", "EUR", "GBP"]).optional(),
  tags: z.array(z.string().max(30)).max(10).optional(),
  images: z.array(z.string().url()).max(10).optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "SOLD"]).optional(),
});

// ── Endorsement Schemas ───────────────────────────────────────────────

export const CreateEndorsementSchema = z.object({
  skill: z.string().min(2).max(50),
  message: z.string().min(10).max(500).optional(),
});

// ── Upload Schemas ────────────────────────────────────────────────────

export const UploadFileSchema = z.object({
  fileName: z.string().min(1).max(255),
  fileSize: z.number().int().min(1).max(10 * 1024 * 1024), // 10MB max
  fileType: z.string().min(1).max(100),
  category: z.enum(["avatar", "project", "message", "resource"]),
});

// ── Notification Schemas ──────────────────────────────────────────────

export const UpdateNotificationSchema = z.object({
  read: z.boolean(),
});

// ── Pagination Schemas ────────────────────────────────────────────────

export const PaginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  cursor: z.string().cuid().optional(),
});

// ── Query Schemas ─────────────────────────────────────────────────────

export const SearchQuerySchema = z.object({
  q: z.string().min(1).max(200),
  category: z.string().max(50).optional(),
  tags: z.string().max(200).optional(), // Comma-separated
  sort: z.enum(["recent", "popular", "relevant"]).default("relevant"),
  ...PaginationSchema.shape,
});

// ── Call Schemas ──────────────────────────────────────────────────────

export const CreateCallSchema = z.object({
  recipientId: z.string().cuid(),
  type: z.enum(["AUDIO", "VIDEO"]),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const UpdateCallSchema = z.object({
  status: z.enum(["RINGING", "ACTIVE", "ENDED", "MISSED", "DECLINED"]),
  endedAt: z.string().datetime().optional(),
});

// ── Achievement Schemas ───────────────────────────────────────────────

export const CreateAchievementSchema = z.object({
  key: z.string().min(2).max(50),
  name: z.string().min(3).max(100),
  description: z.string().min(10).max(500),
  icon: z.string().max(50),
  category: z.enum(["SOCIAL", "PROJECTS", "SKILLS", "COMMUNITY"]),
  points: z.number().int().min(1).max(1000),
  requirement: z.record(z.string(), z.any()),
});

// ── Type Exports ──────────────────────────────────────────────────────

export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
export type UserSearchInput = z.infer<typeof UserSearchSchema>;
export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;
export type UpdateProjectInput = z.infer<typeof UpdateProjectSchema>;
export type CreateMessageInput = z.infer<typeof CreateMessageSchema>;
export type CreateConversationInput = z.infer<typeof CreateConversationSchema>;
export type CreateStudyGroupInput = z.infer<typeof CreateStudyGroupSchema>;
export type UpdateStudyGroupInput = z.infer<typeof UpdateStudyGroupSchema>;
export type CreateResourceInput = z.infer<typeof CreateResourceSchema>;
export type UpdateResourceInput = z.infer<typeof UpdateResourceSchema>;
export type CreateEndorsementInput = z.infer<typeof CreateEndorsementSchema>;
export type CreateCallInput = z.infer<typeof CreateCallSchema>;
export type UpdateCallInput = z.infer<typeof UpdateCallSchema>;
