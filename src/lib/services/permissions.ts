type PermissionUser = {
  id: string;
  role?: string | null;
  platformRole?: string | null;
  marketplaceRole?: string | null;
  marketplaceStatus?: string | null;
};

export function isProjectAdminRole(role?: string | null) {
  return role === "ADMIN" || role === "LEADER";
}

export function isPlatformAdmin(user?: PermissionUser | null) {
  return user?.platformRole === "ADMIN" || user?.platformRole === "MODERATOR";
}

export function canAccessMarketplace(user?: PermissionUser | null) {
  if (!user) return false;
  if (isPlatformAdmin(user)) return true;
  return (
    user.marketplaceStatus === "ACTIVE" &&
    ["BUYER", "SELLER", "VERIFIED_SELLER"].includes(user.marketplaceRole || "")
  );
}

export function canCreateMarketplaceListing(user?: PermissionUser | null) {
  if (!user) return false;
  if (isPlatformAdmin(user)) return true;
  return (
    user.marketplaceStatus === "ACTIVE" &&
    ["SELLER", "VERIFIED_SELLER"].includes(user.marketplaceRole || "")
  );
}
