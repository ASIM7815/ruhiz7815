export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 30;
export const USERNAME_PATTERN = /^[a-z][a-z0-9_]{2,29}$/;

const RESERVED_USERNAMES = new Set([
  "api",
  "auth",
  "dashboard",
  "login",
  "register",
  "settings",
  "profile",
  "projects",
  "knowledge",
  "messages",
  "notifications",
  "study",
  "study-groups",
  "marketplace",
  "startups",
  "admin",
  "support",
  "ruhiz",
]);

export function normalizeUsername(value: string) {
  return value
    .trim()
    .replace(/^@+/, "")
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, USERNAME_MAX_LENGTH);
}

export function isReservedUsername(username: string) {
  return RESERVED_USERNAMES.has(username);
}

export function isValidUsername(username: string) {
  return USERNAME_PATTERN.test(username) && !isReservedUsername(username);
}

export function profileLookupToken(value: string) {
  return decodeURIComponent(value).trim().replace(/^[@#]+/, "").toLowerCase();
}

export function profilePathFor(user: { username?: string | null; uid?: string | null; id: string }) {
  // If username exists, use @username format for better shareability
  if (user.username) {
    return `/@${user.username}`;
  }
  // Otherwise fall back to /u/{uid or id}
  return `/u/${user.uid || user.id}`;
}

export function usernameSeedFromName(nameOrEmail: string) {
  const base = normalizeUsername(nameOrEmail.split("@")[0] || "student");
  if (isValidUsername(base)) return base;

  const withPrefix = normalizeUsername(`student_${base}`);
  if (isValidUsername(withPrefix)) return withPrefix;

  return "student";
}
