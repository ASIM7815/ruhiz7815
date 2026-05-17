"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Users,
  Clock,
  MessageSquare,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { useSupabaseUser } from "@/hooks/use-supabase-user";

type StudyGroup = {
  id: string;
  name: string;
  subject: string;
  description: string | null;
  maxMembers: number;
  memberCount: number;
  createdAt: string;
  members: Array<{
    id: string;
    name: string;
    image: string | null;
    uid: string | null;
    role: string;
  }>;
};

type JoinRequestStatus = {
  status: "NONE" | "PENDING" | "ACCEPTED" | "REJECTED";
  isMember: boolean;
};

export default function StudyGroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useSupabaseUser();
  const [group, setGroup] = useState<StudyGroup | null>(null);
  const [joinStatus, setJoinStatus] = useState<JoinRequestStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    loadGroup();
    if (user) {
      loadJoinStatus();
    }
  }, [id, user]);

  async function loadGroup() {
    try {
      const res = await fetch(`/api/study-groups/${id}`);
      if (res.ok) {
        const data = await res.json();
        setGroup(data);
      } else {
        toast.error("Study group not found");
        router.push("/study-groups");
      }
    } finally {
      setLoading(false);
    }
  }

  async function loadJoinStatus() {
    try {
      const res = await fetch(`/api/study-groups/${id}/join/status`);
      if (res.ok) {
        const data = await res.json();
        setJoinStatus(data);
      }
    } catch (err) {
      console.error("Failed to load join status:", err);
    }
  }

  async function handleJoinRequest() {
    setRequesting(true);
    try {
      const res = await fetch(`/api/study-groups/${id}/join`, {
        method: "POST",
      });

      if (res.ok) {
        toast.success("Join request sent!");
        loadJoinStatus();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to send request");
      }
    } finally {
      setRequesting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!group) {
    return null;
  }

  const isFull = group.memberCount >= group.maxMembers;
  const canJoin = joinStatus?.status === "NONE" && !isFull;
  const isPending = joinStatus?.status === "PENDING";
  const isMember = joinStatus?.isMember;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" render={<Link href="/study-groups" />}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="font-heading text-2xl font-bold">{group.name}</h1>
          <Badge variant="secondary" className="mt-1">
            {group.subject}
          </Badge>
        </div>
        {isMember && (
          <Button render={<Link href={`/study-groups/${id}/workspace`} />}>
            <MessageSquare className="h-4 w-4 mr-2" />
            Open Workspace
          </Button>
        )}
      </div>

      {/* Group Info */}
      <Card>
        <CardHeader>
          <CardTitle>About</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {group.description && (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {group.description}
            </p>
          )}
          <div className="flex items-center gap-6 text-sm">
            <span className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>
                {group.memberCount}/{group.maxMembers} members
              </span>
            </span>
            <span className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>Created {new Date(group.createdAt).toLocaleDateString()}</span>
            </span>
          </div>

          {/* Join Button */}
          {!isMember && (
            <div className="pt-4 border-t">
              {canJoin && (
                <Button
                  onClick={handleJoinRequest}
                  disabled={requesting}
                  className="w-full sm:w-auto"
                >
                  {requesting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Clock className="h-4 w-4 mr-2" />
                  )}
                  Request to Join
                </Button>
              )}
              {isPending && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Join request pending approval</span>
                </div>
              )}
              {isFull && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>This group is full</span>
                </div>
              )}
              {joinStatus?.status === "REJECTED" && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <span>Your join request was declined</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Members */}
      <Card>
        <CardHeader>
          <CardTitle>Members ({group.memberCount})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {group.members.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-3 rounded-lg border p-3"
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={member.image || undefined} />
                  <AvatarFallback>
                    {member.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{member.name}</p>
                  {member.uid && (
                    <p className="text-xs text-muted-foreground">#{member.uid}</p>
                  )}
                </div>
                {member.role === "ADMIN" && (
                  <Badge variant="default" className="text-xs">
                    Leader
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
