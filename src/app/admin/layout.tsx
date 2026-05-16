import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth-helpers";
import { isPlatformAdmin } from "@/lib/services/permissions";
import Link from "next/link";
import { Shield, Users, FolderKanban, MessageSquare, ShoppingBag, Flag, Settings } from "lucide-react";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, error } = await requireAuth();

  if (error || !user || !isPlatformAdmin(user)) {
    redirect("/dashboard");
  }

  const navItems = [
    { href: "/admin", label: "Dashboard", icon: Shield },
    { href: "/admin/users", label: "Users", icon: Users },
    { href: "/admin/projects", label: "Projects", icon: FolderKanban },
    { href: "/admin/groups", label: "Groups", icon: MessageSquare },
    { href: "/admin/marketplace", label: "Marketplace", icon: ShoppingBag },
    { href: "/admin/reports", label: "Reports", icon: Flag },
    { href: "/admin/settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 border-r bg-muted/40">
        <div className="flex h-16 items-center border-b px-6">
          <Shield className="mr-2 h-5 w-5" />
          <span className="font-semibold">Admin Panel</span>
        </div>
        <nav className="space-y-1 p-4">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
