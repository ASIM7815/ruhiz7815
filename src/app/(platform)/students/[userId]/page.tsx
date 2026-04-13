"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, GraduationCap, Star, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface PublicUser {
  id: string;
  uid: string;
  name: string;
  image: string | null;
  bio: string | null;
  university: string | null;
  role: string;
  reputation: number;
  skills: string[];
}

export default function PublicProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const router = useRouter();
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [startingChat, setStartingChat] = useState(false);

  useEffect(() => {
    fetch(`/api/users/search?uid=${userId}`)
      .then((r) => {
        if (!r.ok) {
          setNotFound(true);
          setLoading(false);
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (data) setUser(data);
        setLoading(false);
      });
  }, [userId]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="h-48 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  if (notFound || !user) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <p className="text-muted-foreground text-lg">User not found</p>
        <Button variant="outline" className="mt-4" render={<Link href="/dashboard" />}>
          Go Home
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Button variant="ghost" size="sm" render={<Link href="/dashboard" />}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
      </Button>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center text-center gap-4">
            <Avatar className="h-24 w-24 border-4 border-primary/20">
              <AvatarImage src={user.image || ""} />
              <AvatarFallback className="text-2xl">
                {user.name?.charAt(0)?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="font-heading text-2xl font-bold">{user.name}</h1>
              <Badge variant="secondary" className="mt-1">
                #{user.uid}
              </Badge>
            </div>
            {user.university && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <GraduationCap className="h-4 w-4" />
                {user.university}
              </p>
            )}
            {user.bio && (
              <p className="text-muted-foreground text-sm max-w-md">
                {user.bio}
              </p>
            )}
            <div className="flex items-center gap-3">
              <Badge variant="default" className="gap-1">
                <Star className="h-3 w-3" />
                {user.reputation} Reputation
              </Badge>
              <Badge variant="outline">{user.role}</Badge>
            </div>
            {user.skills.length > 0 && (
              <div className="flex flex-wrap gap-2 justify-center pt-2">
                {user.skills.map((skill) => (
                  <Badge key={skill} variant="secondary">
                    {skill}
                  </Badge>
                ))}
              </div>
            )}
            <Button
              variant="outline"
              className="mt-4 gap-2"
              disabled={startingChat}
              onClick={async () => {
                if (!user) return;
                setStartingChat(true);
                try {
                  const res = await fetch("/api/messages/conversations", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ targetUserId: user.id }),
                  });
                  if (res.ok) {
                    const data = await res.json();
                    router.push(`/messages?conversation=${data.conversationId}`);
                  }
                } catch {
                  // silently fail
                } finally {
                  setStartingChat(false);
                }
              }}
            >
              <MessageSquare className="h-4 w-4" />
              Message
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
