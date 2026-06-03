"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  BookOpen,
  FolderKanban,
  Home,
  LogOut,
  MessageSquare,
  MoreHorizontal,
  Rocket,
  Settings,
  ShoppingBag,
  UserCircle,
  Users,
} from "lucide-react";
import { signOut, useSupabaseUser } from "@/hooks/use-supabase-user";
import { useCurrentUser } from "@/hooks/use-current-user";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const primaryItems = [
  { title: "Profile", href: "/profile", icon: UserCircle },
  { title: "Projects", href: "/projects", icon: FolderKanban },
  { title: "Knowledge", href: "/knowledge", icon: BookOpen },
  { title: "Messages", href: "/messages", icon: MessageSquare },
];

const moreItems = [
  { title: "Study Groups", href: "/study-groups", icon: Users },
  { title: "Marketplace", href: "/marketplace", icon: ShoppingBag },
  // { title: "Startup Hub", href: "/startups", icon: Rocket }, // Hidden - code preserved
  { title: "Notifications", href: "/notifications", icon: Bell },
  { title: "Home", href: "/dashboard", icon: Home },
  { title: "Settings", href: "/settings", icon: Settings },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileNav() {
  const pathname = usePathname();
  const { user: supabaseUser } = useSupabaseUser();
  const { user: dbUser } = useCurrentUser();
  
  // Use database user data if available (for real-time sync), fallback to Supabase
  const userName = dbUser?.name || supabaseUser?.user_metadata?.full_name || "Student";
  const userEmail = dbUser?.email || supabaseUser?.email || "";
  const userImage = dbUser?.image || supabaseUser?.user_metadata?.avatar_url || undefined;
  const userInitials =
    userName
      .split(" ")
      .map((name: string) => name[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";
  const moreActive = moreItems.some((item) => isActive(pathname, item.href));

  return (
    <div className="lg:hidden">
      <nav className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 px-2 pt-1.5 backdrop-blur-xl pb-[calc(env(safe-area-inset-bottom)+0.4rem)]">
        <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
          {primaryItems.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[11px] font-medium text-muted-foreground transition-colors",
                  active && "bg-primary/10 text-primary"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="max-w-full truncate">{item.title}</span>
              </Link>
            );
          })}

          <Sheet>
            <SheetTrigger
              render={
                <button
                  className={cn(
                    "flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[11px] font-medium text-muted-foreground transition-colors",
                    moreActive && "bg-primary/10 text-primary"
                  )}
                />
              }
            >
              <MoreHorizontal className="h-5 w-5" />
              <span>More</span>
            </SheetTrigger>
            <SheetContent
              side="bottom"
              className="max-h-[86dvh] overflow-y-auto rounded-t-2xl border-t p-0 pb-[calc(env(safe-area-inset-bottom)+1rem)]"
            >
              <SheetHeader className="border-b p-4">
                <SheetTitle className="flex items-center gap-2">
                  <Image
                    src="/logo.png"
                    alt="RUHIZ"
                    width={28}
                    height={28}
                    className="h-7 w-7 rounded-md object-cover"
                  />
                  RUHIZ
                </SheetTitle>
              </SheetHeader>

              <div className="p-4">
                <div className="mb-4 flex items-center gap-3 rounded-xl border bg-card/70 p-3">
                  <Avatar className="h-11 w-11">
                    <AvatarImage src={userImage} />
                    <AvatarFallback>{userInitials}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{userName}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {userEmail}
                    </p>
                  </div>
                </div>

                <div className="grid gap-2">
                  {moreItems.map((item) => {
                    const active = isActive(pathname, item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "flex min-h-12 items-center gap-3 rounded-xl border bg-card/50 px-3 text-sm font-medium transition-colors",
                          active
                            ? "border-primary/30 bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        <item.icon className="h-5 w-5" />
                        <span>{item.title}</span>
                      </Link>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  className="mt-4 min-h-11 w-full justify-start gap-3"
                  onClick={() => signOut()}
                >
                  <LogOut className="h-5 w-5" />
                  Logout
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </div>
  );
}
