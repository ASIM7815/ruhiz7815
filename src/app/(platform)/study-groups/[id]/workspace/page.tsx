"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  MessageSquare,
  Users,
  Shield,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GroupChat } from "@/components/group-chat";

type StudyGroupMember = {
  id: string;
  name: string;
  image: string | null;
  uid: string | null;
  role: string;
};

type StudyGroupDetail = {
  id: string;
  name: string;
  subject: string;
  maxMembers: number;
  members: StudyGroupMember[];
};

type StudyGroupGroup = {
  id: string;
  name: string;
  isAdmin: boolean;
};

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function StudyGroupWorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const [studyGroup, setStudyGroup] = useState<StudyGroupDetail | null>(null);
  const [group, setGroup] = useState<StudyGroupGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadWorkspace = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [studyGroupRes, groupRes] = await Promise.all([
        fetch(`/api/study-groups/${id}`),
        fetch(`/api/study-groups/${id}/group`),
      ]);

      if (groupRes.status === 403) {
        setError("Only approved members can access this workspace.");
        return;
      }

      if (!studyGroupRes.ok || !groupRes.ok) {
        setError("Workspace could not be loaded.");
        return;
      }

      setStudyGroup(await studyGroupRes.json());
      setGroup(await groupRes.json());
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 text-center">
        <p className="text-muted-foreground">{error}</p>
        <Button variant="outline" render={<Link href={`/study-groups/${id}`} />}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Study Group
        </Button>
      </div>
    );
  }

  if (!studyGroup || !group) return null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button variant="ghost" size="icon" render={<Link href={`/study-groups/${id}`} />}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-heading text-xl font-bold truncate">{studyGroup.name}</h1>
            {group.isAdmin && (
              <Badge variant="secondary" className="gap-1">
                <Shield className="h-3 w-3" />
                Leader
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="outline" className="text-xs">
              {studyGroup.subject}
            </Badge>
            <span>•</span>
            <span>
              {studyGroup.members.length}/{studyGroup.maxMembers} members
            </span>
          </div>
        </div>
        {group.isAdmin && (
          <Button size="sm" variant="outline" render={<Link href={`/study-groups/${id}/requests`} />}>
            Requests
          </Button>
        )}
      </div>

      <Tabs defaultValue="chat" className="space-y-4">
        <TabsList>
          <TabsTrigger value="chat" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Chat
          </TabsTrigger>
          <TabsTrigger value="members" className="gap-2">
            <Users className="h-4 w-4" />
            Members
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chat">
          <Card className="h-[calc(100vh-250px)] min-h-[520px] overflow-hidden">
            <GroupChat groupId={group.id} />
          </Card>
        </TabsContent>

        <TabsContent value="members">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Group Members</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {studyGroup.members.map((member) => (
                <div key={member.id} className="flex items-center gap-3 rounded-lg border p-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={member.image || undefined} />
                    <AvatarFallback>{initials(member.name || "User")}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{member.name}</p>
                    {member.uid && <p className="text-xs text-muted-foreground">#{member.uid}</p>}
                  </div>
                  <Badge variant={member.role === "ADMIN" ? "default" : "secondary"}>
                    {member.role === "ADMIN" ? "Leader" : "Member"}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
