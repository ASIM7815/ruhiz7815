import {
  LayoutDashboard,
  FolderKanban,
  BookOpen,
  ShoppingBag,
  Rocket,
  Users,
  MessageSquare,
  Bell,
  Settings,
  UserCircle,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
}

export const marketingNav = [
  { title: "Features", href: "/#features" },
  { title: "How It Works", href: "/#how-it-works" },
  { title: "About", href: "/about" },
];

export const platformNav: NavItem[] = [
  { title: "Profile", href: "/profile", icon: UserCircle },
  { title: "Projects", href: "/projects", icon: FolderKanban },
  { title: "Knowledge Hub", href: "/knowledge", icon: BookOpen },
  { title: "Study Groups", href: "/study-groups", icon: Users },
  { title: "Marketplace", href: "/marketplace", icon: ShoppingBag },
  // { title: "Startups", href: "/startups", icon: Rocket }, // Hidden - code preserved
];

export const platformSecondaryNav: NavItem[] = [
  { title: "Messages", href: "/messages", icon: MessageSquare },
  { title: "Notifications", href: "/notifications", icon: Bell },
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Settings", href: "/settings", icon: Settings },
];
