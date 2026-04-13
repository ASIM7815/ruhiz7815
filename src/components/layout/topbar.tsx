"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Search, Bell, MessageSquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export function Topbar() {
  const { data: session } = useSession();
  const router = useRouter();
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

  const userImage = session?.user?.image ?? undefined;
  const userName = session?.user?.name ?? "";
  const userInitials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

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
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/80 backdrop-blur-xl px-4 lg:px-6">
      {/* Spacer for mobile menu button */}
      <div className="lg:hidden w-10" />

      {/* Search by UID */}
      <div className="flex-1 max-w-md relative">
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
              <div className="p-1 space-y-1">
                <button
                  className="flex items-center gap-3 w-full p-2 rounded-md hover:bg-muted transition-colors text-left"
                  onClick={() => {
                    router.push(`/students/${searchResult.uid}`);
                    setShowResult(false);
                    setSearchUid("");
                  }}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={searchResult.image || ""} />
                    <AvatarFallback>
                      {searchResult.name?.charAt(0)?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{searchResult.name}</p>
                    <p className="text-xs text-muted-foreground">
                      #{searchResult.uid}
                      {searchResult.university ? ` · ${searchResult.university}` : ""}
                    </p>
                  </div>
                </button>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full gap-2"
                  onClick={async () => {
                    setShowResult(false);
                    setSearchUid("");
                    try {
                      const res = await fetch("/api/messages/conversations", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ targetUserId: searchResult.id }),
                      });
                      if (res.ok) {
                        const data = await res.json();
                        router.push(`/messages?chat=${data.conversationId}`);
                      } else {
                        router.push("/messages");
                      }
                    } catch {
                      router.push("/messages");
                    }
                  }}
                >
                  <MessageSquarePlus className="h-3.5 w-3.5" />
                  Message
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground p-2">No user found</p>
            )}
          </div>
        )}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="h-4 w-4" />
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary" />
        </Button>
        <Avatar className="h-8 w-8">
          <AvatarImage src={userImage} />
          <AvatarFallback>{userInitials}</AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
