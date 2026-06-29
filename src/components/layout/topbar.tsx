"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSupabaseUser } from "@/hooks/use-supabase-user";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useRouter } from "next/navigation";
import { Search, Bell, Sun, Moon, X } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function Topbar() {
  const { user: supabaseUser } = useSupabaseUser();
  const { user: dbUser } = useCurrentUser();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState<{
    id: string;
    uid: string | null;
    username: string | null;
    name: string;
    image: string | null;
    university: string | null;
    profilePath: string;
  } | null>(null);
  const [searching, setSearching] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  // Use database user data if available (for real-time sync), fallback to Supabase
  const userImage = dbUser?.image || supabaseUser?.user_metadata?.avatar_url || undefined;
  const userName = dbUser?.name || supabaseUser?.user_metadata?.full_name || "";
  const userInitials = userName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  async function handleSearch(value: string) {
    setSearchQuery(value);
    const query = value.trim();
    if (query.length >= 2) {
      setSearching(true);
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResult(data);
          setShowResult(true);
        } else {
          setSearchResult(null);
          setShowResult(true);
        }
      } catch {
        setSearchResult(null);
      }
      setSearching(false);
    } else {
      setShowResult(false);
      setSearchResult(null);
    }
  }

  useEffect(() => {
    if (!supabaseUser?.id) {
      setUnreadNotifications(0);
      return;
    }

    let cancelled = false;
    async function loadUnreadCount() {
      try {
        const res = await fetch("/api/notifications/unread-count", {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setUnreadNotifications(data.count || 0);
      } catch {
        // A missing badge should not interrupt navigation.
      }
    }

    loadUnreadCount();
    const intervalId = window.setInterval(loadUnreadCount, 15000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [supabaseUser?.id]);

  const searchBox = (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder="Search people, UID, @username..."
        className="h-10 bg-muted/50 pl-10 sm:h-9 sm:border-0"
        value={searchQuery}
        onChange={(e) => handleSearch(e.target.value)}
        onBlur={() => setTimeout(() => setShowResult(false), 200)}
        onFocus={() => searchResult && setShowResult(true)}
      />
      {showResult && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border bg-background p-2 shadow-lg">
          {searching ? (
            <p className="p-2 text-sm text-muted-foreground">Searching...</p>
          ) : searchResult ? (
            <button
              className="flex w-full items-center gap-3 rounded-md p-2 text-left transition-colors hover:bg-muted"
              onClick={() => {
                router.push(searchResult.profilePath || `/students/${searchResult.uid}`);
                setShowResult(false);
                setSearchQuery("");
                setMobileSearchOpen(false);
              }}
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={searchResult.image || undefined} />
                <AvatarFallback>
                  {searchResult.name?.charAt(0)?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {searchResult.name}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {searchResult.username
                    ? `@${searchResult.username}`
                    : searchResult.uid
                      ? `#${searchResult.uid}`
                      : "Student"}
                  {searchResult.university ? ` · ${searchResult.university}` : ""}
                </p>
              </div>
            </button>
          ) : (
            <p className="p-2 text-sm text-muted-foreground">No user found</p>
          )}
        </div>
      )}
    </div>
  );

  return (
    <header className="sticky top-0 z-30 border-b bg-background/90 px-3 backdrop-blur-xl sm:px-4 lg:px-6">
      <div className="flex h-14 items-center gap-2 sm:gap-4">
        <Link href="/dashboard" className="flex min-w-0 items-center gap-2 lg:hidden">
          <Image
            src="/logo.png"
            alt="RUHIZ"
            width={32}
            height={32}
            className="h-8 w-8 shrink-0 rounded-lg object-cover"
          />
          <span className="font-heading text-lg font-bold">RUHIZ</span>
        </Link>

        <div className="relative hidden max-w-md flex-1 sm:block">{searchBox}</div>

        <div className="flex-1 lg:hidden" />

        <div className="flex items-center gap-1 sm:gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 sm:hidden"
            onClick={() => setMobileSearchOpen((open) => !open)}
            aria-label={mobileSearchOpen ? "Close search" : "Open search"}
          >
            {mobileSearchOpen ? (
              <X className="h-4 w-4" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="Toggle theme"
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="relative h-10 w-10"
            render={<Link href="/notifications" />}
          >
            <Bell className="h-4 w-4" />
            {unreadNotifications > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium leading-none text-primary-foreground">
                {unreadNotifications > 9 ? "9+" : unreadNotifications}
              </span>
            )}
          </Button>
          <Link href="/profile" className="rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarImage src={userImage} />
              <AvatarFallback>{userInitials}</AvatarFallback>
            </Avatar>
          </Link>
        </div>
      </div>

      {mobileSearchOpen && (
        <div className="pb-3 sm:hidden">
          <div className="relative">{searchBox}</div>
        </div>
      )}
    </header>
  );
}
