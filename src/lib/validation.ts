/**
 * Validation utilities for user input
 */

export const VALIDATION_RULES = {
  // User
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 100,
  BIO_MAX_LENGTH: 500,
  
  // Project
  PROJECT_TITLE_MIN_LENGTH: 3,
  PROJECT_TITLE_MAX_LENGTH: 100,
  PROJECT_DESCRIPTION_MIN_LENGTH: 10,
  PROJECT_DESCRIPTION_MAX_LENGTH: 2000,
  PROJECT_PROBLEM_MIN_LENGTH: 10,
  PROJECT_PROBLEM_MAX_LENGTH: 1000,
  PROJECT_MAX_MEMBERS_MIN: 2,
  PROJECT_MAX_MEMBERS_MAX: 20,
  PROJECT_MAX_SKILLS: 10,
  
  // Join Request
  JOIN_REQUEST_MESSAGE_MAX_LENGTH: 500,
  
  // Report
  REPORT_REASON_MIN_LENGTH: 5,
  REPORT_REASON_MAX_LENGTH: 200,
  REPORT_DETAILS_MAX_LENGTH: 1000,
  
  // Marketplace
  LISTING_TITLE_MIN_LENGTH: 3,
  LISTING_TITLE_MAX_LENGTH: 100,
  LISTING_DESCRIPTION_MAX_LENGTH: 2000,
  LISTING_PRICE_MIN: 0,
  LISTING_PRICE_MAX: 999999,
  
  // Message
  MESSAGE_CONTENT_MIN_LENGTH: 1,
  MESSAGE_CONTENT_MAX_LENGTH: 5000,
} as const;

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Sanitize string input
 */
export function sanitizeString(input: string, maxLength?: number): string {
  let sanitized = input.trim();
  if (maxLength) {
    sanitized = sanitized.slice(0, maxLength);
  }
  return sanitized;
}

/**
 * Validate project title
 */
export function validateProjectTitle(title: string): { valid: boolean; error?: string } {
  const sanitized = sanitizeString(title);
  
  if (sanitized.length < VALIDATION_RULES.PROJECT_TITLE_MIN_LENGTH) {
    return {
      valid: false,
      error: `Title must be at least ${VALIDATION_RULES.PROJECT_TITLE_MIN_LENGTH} characters`,
    };
  }
  
  if (sanitized.length > VALIDATION_RULES.PROJECT_TITLE_MAX_LENGTH) {
    return {
      valid: false,
      error: `Title must be at most ${VALIDATION_RULES.PROJECT_TITLE_MAX_LENGTH} characters`,
    };
  }
  
  return { valid: true };
}

/**
 * Validate project description
 */
export function validateProjectDescription(description: string): { valid: boolean; error?: string } {
  const sanitized = sanitizeString(description);
  
  if (sanitized.length < VALIDATION_RULES.PROJECT_DESCRIPTION_MIN_LENGTH) {
    return {
      valid: false,
      error: `Description must be at least ${VALIDATION_RULES.PROJECT_DESCRIPTION_MIN_LENGTH} characters`,
    };
  }
  
  if (sanitized.length > VALIDATION_RULES.PROJECT_DESCRIPTION_MAX_LENGTH) {
    return {
      valid: false,
      error: `Description must be at most ${VALIDATION_RULES.PROJECT_DESCRIPTION_MAX_LENGTH} characters`,
    };
  }
  
  return { valid: true };
}

/**
 * Validate listing price
 */
export function validatePrice(price: number): { valid: boolean; error?: string } {
  if (price < VALIDATION_RULES.LISTING_PRICE_MIN) {
    return {
      valid: false,
      error: `Price must be at least ${VALIDATION_RULES.LISTING_PRICE_MIN}`,
    };
  }
  
  if (price > VALIDATION_RULES.LISTING_PRICE_MAX) {
    return {
      valid: false,
      error: `Price must be at most ${VALIDATION_RULES.LISTING_PRICE_MAX}`,
    };
  }
  
  return { valid: true };
}

/**
 * Validate array of skills
 */
export function validateSkills(skills: unknown): { valid: boolean; error?: string; skills?: string[] } {
  if (!Array.isArray(skills)) {
    return { valid: false, error: "Skills must be an array" };
  }
  
  const validSkills = skills
    .map((skill) => sanitizeString(String(skill)))
    .filter((skill) => skill.length > 0)
    .slice(0, VALIDATION_RULES.PROJECT_MAX_SKILLS);
  
  return { valid: true, skills: validSkills };
}

/**
 * Validate report reason
 */
export function validateReportReason(reason: string): { valid: boolean; error?: string } {
  const sanitized = sanitizeString(reason);
  
  if (sanitized.length < VALIDATION_RULES.REPORT_REASON_MIN_LENGTH) {
    return {
      valid: false,
      error: `Reason must be at least ${VALIDATION_RULES.REPORT_REASON_MIN_LENGTH} characters`,
    };
  }
  
  if (sanitized.length > VALIDATION_RULES.REPORT_REASON_MAX_LENGTH) {
    return {
      valid: false,
      error: `Reason must be at most ${VALIDATION_RULES.REPORT_REASON_MAX_LENGTH} characters`,
    };
  }
  
  return { valid: true };
}

/**
 * Validate enum value
 */
export function validateEnum<T extends string>(
  value: string,
  allowedValues: readonly T[],
  fieldName = "Value"
): { valid: boolean; error?: string; value?: T } {
  if (!allowedValues.includes(value as T)) {
    return {
      valid: false,
      error: `${fieldName} must be one of: ${allowedValues.join(", ")}`,
    };
  }
  
  return { valid: true, value: value as T };
}

/**
 * Common enum validations
 */
export const ENUMS = {
  PROJECT_STATUS: ["DRAFT", "OPEN", "IN_PROGRESS", "COMPLETED", "ARCHIVED"] as const,
  PROJECT_VISIBILITY: ["PUBLIC", "PRIVATE", "UNLISTED"] as const,
  MEMBER_ROLE: ["ADMIN", "MEMBER"] as const,
  MEMBER_STATUS: ["ACTIVE", "REMOVED", "LEFT"] as const,
  JOIN_REQUEST_STATUS: ["PENDING", "ACCEPTED", "REJECTED", "CANCELLED", "EXPIRED"] as const,
  PLATFORM_ROLE: ["USER", "MODERATOR", "ADMIN"] as const,
  MARKETPLACE_ROLE: ["NONE", "BUYER", "SELLER", "VERIFIED_SELLER"] as const,
  MARKETPLACE_STATUS: ["DISABLED", "PENDING_REVIEW", "ACTIVE", "SUSPENDED"] as const,
  LISTING_STATUS: ["DRAFT", "ACTIVE", "SOLD", "HIDDEN", "REMOVED", "UNDER_REVIEW"] as const,
  LISTING_CATEGORY: ["BOOK", "GADGET", "SERVICE"] as const,
  LISTING_CONDITION: ["NEW", "LIKE_NEW", "GOOD", "FAIR"] as const,
  REPORT_STATUS: ["OPEN", "IN_REVIEW", "RESOLVED", "DISMISSED"] as const,
  REPORT_TARGET_TYPE: [
    "USER",
    "PROJECT",
    "GROUP",
    "MESSAGE",
    "LISTING",
    "RESOURCE",
    "STARTUP",
    "STUDY_GROUP",
  ] as const,
} as const;
