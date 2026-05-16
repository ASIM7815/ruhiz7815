"use client";

import { useEffect, useState } from "react";
import { useSupabaseUser } from "@/hooks/use-supabase-user";
import { useRouter } from "next/navigation";
import { Search, Bell, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function Topbar() {
  const { user } = useSupabaseUser();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [searchUid, setSearchUid] = useState("");
  const [searchResult, setSearchResult] = useState<{
    id: string;
    uid: string;
    name: string;
    image: string | null;
    university: string | null;
  } | null>(null);
  const [searching, setSearching] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const userImage = user?.user_metadata?.avatar_url ?? undefined;
  const userName = user?.user_metadata?.full_name ?? "";
  const userInitials = userName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  useEffect(() => {
    if (!user) return;
    fetch("/api/notifications?unread=1&limit=1")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setUnreadCount(data?.unreadCount || 0))
      .catch(() => null);
  }, [user]);

  async function handleSearch(value: string) {
    setSearchUid(value);
    if (/^\d{5}$/.test(value)) {
      setSearching(true);
      try {
        const res = await fetch(`/api/users/search?uid=${value}`);
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

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 sm:gap-4 border-b bg-background/80 backdrop-blur-xl px-3 sm:px-4 lg:px-6">
      {/* Spacer for mobile menu button */}
      <div className="lg:hidden w-10 shrink-0" />

      {/* Search by UID */}
      <div className="flex-1 max-w-md relative hidden sm:block">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by 5-digit UID..."
            className="pl-10 h-9 bg-muted/50 border-0"
            value={searchUid}
            onChange={(e) => handleSearch(e.target.value)}
            onBlur={() => setTimeout(() => setShowResult(false), 200)}
            onFocus={() => searchResult && setShowResult(true)}
            maxLength={5}
          />
        </div>
        {showResult && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-lg shadow-lg p-2 z-50">
            {searching ? (
              <p className="text-sm text-muted-foreground p-2">Searching...</p>
            ) : searchResult ? (
              <button
                className="flex items-center gap-3 w-full p-2 rounded-md hover:bg-muted transition-colors text-left"
                onClick={() => {
                  router.push(`/students/${searchResult.uid}`);
                  setShowResult(false);
                  setSearchUid("");
                }}
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={searchResult.image || undefined} />
                  <AvatarFallback>
                    {searchResult.name?.charAt(0)?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{searchResult.name}</p>
                  <p className="text-xs text-muted-foreground">
                    #{searchResult.uid}
                    {searchResult.university ? ` · ${searchResult.university}` : ""}
                  </p>
                </div>
              </button>
            ) : (
              <p className="text-sm text-muted-foreground p-2">No user found</p>
            )}
          </div>
        )}
      </div>

      {/* Spacer on mobile to push icons right */}
      <div className="flex-1 sm:hidden" />

      {/* Right side */}
      <div className="flex items-center gap-1 sm:gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-10 w-10"
          onClick={() => router.push("/notifications")}
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
        <Avatar className="h-8 w-8">
          <AvatarImage src={userImage} />
          <AvatarFallback>{userInitials}</AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
