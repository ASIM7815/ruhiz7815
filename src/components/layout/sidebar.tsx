"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import {
  ChevronLeft,
  ChevronRight,
  LogOut,
  Search,
  Bell,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { platformNav, platformSecondaryNav } from "@/config/nav";
import Image from "next/image";

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { data: session } = useSession();
  const userName = session?.user?.name ?? "";
  const userEmail = session?.user?.email ?? "";
  const userImage = session?.user?.image ?? undefined;
  const userInitials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const NavItems = ({ mobile = false }: { mobile?: boolean }) => (
    <TooltipProvider delay={0}>
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="flex items-center gap-2 px-4 py-5 border-b">
          <Image src="/logo.png" alt="RUHIZ" width={36} height={36} className="h-9 w-9 shrink-0 rounded-lg object-cover" />
          {(!collapsed || mobile) && (
            <span className="font-heading text-xl font-bold tracking-tight">
              RUHIZ
            </span>
          )}
        </div>

        {/* Main nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          <p
            className={cn(
              "text-xs font-medium text-muted-foreground mb-3 px-3 uppercase tracking-wider",
              collapsed && !mobile && "sr-only"
            )}
          >
            Main
          </p>
          {platformNav.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            const link = (
              <Link
                key={item.title}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  collapsed && !mobile && "justify-center px-2"
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {(!collapsed || mobile) && <span>{item.title}</span>}
                {(!collapsed || mobile) && item.badge && (
                  <Badge variant="secondary" className="ml-auto text-xs h-5">
                    {item.badge}
                  </Badge>
                )}
              </Link>
            );

            if (collapsed && !mobile) {
              return (
                <Tooltip key={item.title}>
                  <TooltipTrigger render={<span />}>{link}</TooltipTrigger>
                  <TooltipContent side="right">{item.title}</TooltipContent>
                </Tooltip>
              );
            }
            return link;
          })}

          <div className="pt-4">
            <p
              className={cn(
                "text-xs font-medium text-muted-foreground mb-3 px-3 uppercase tracking-wider",
                collapsed && !mobile && "sr-only"
              )}
            >
              Account
            </p>
            {platformSecondaryNav.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(item.href + "/");
              const link = (
                <Link
                  key={item.title}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    collapsed && !mobile && "justify-center px-2"
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {(!collapsed || mobile) && <span>{item.title}</span>}
                </Link>
              );

              if (collapsed && !mobile) {
                return (
                  <Tooltip key={item.title}>
                  <TooltipTrigger render={<span />}>{link}</TooltipTrigger>
                  <TooltipContent side="right">{item.title}</TooltipContent>
                </Tooltip>
                );
              }
              return link;
            })}
          </div>
        </nav>

        {/* User section */}
        <div className="border-t px-3 py-4">
          <div
            className={cn(
              "flex items-center gap-3",
              collapsed && !mobile && "justify-center"
            )}
          >
            <Avatar className="h-9 w-9">
              <AvatarImage src={userImage} />
              <AvatarFallback>{userInitials}</AvatarFallback>
            </Avatar>
            {(!collapsed || mobile) && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{userName}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {userEmail}
                </p>
              </div>
            )}
            {(!collapsed || mobile) && (
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 h-8 w-8"
                onClick={() => signOut({ callbackUrl: "/login" })}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col border-r bg-card/50 transition-all duration-300 shrink-0",
          collapsed ? "w-[68px]" : "w-64"
        )}
      >
        <div className="flex flex-col h-full relative">
          <NavItems />
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full border bg-background shadow-sm hover:bg-muted transition-colors"
          >
            {collapsed ? (
              <ChevronRight className="h-3 w-3" />
            ) : (
              <ChevronLeft className="h-3 w-3" />
            )}
          </button>
        </div>
      </aside>

      {/* Mobile sidebar */}
      <Sheet>
        <SheetTrigger render={<Button variant="ghost" size="icon" className="lg:hidden fixed top-3 left-3 z-40" />}>
          <Menu className="h-5 w-5" />
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-64">
          <NavItems mobile />
        </SheetContent>
      </Sheet>
    </>
  );
}
