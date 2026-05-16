"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useSupabaseUser } from "@/hooks/use-supabase-user";
import {
  ArrowLeft,
  Users,
  Clock,
  Send,
  CheckCircle2,
  Loader2,
  XCircle,
  MessageSquare,
  Inbox,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

interface ProjectDetail {
  id: string;
  title: string;
  problem: string;
  description: string;
  status: string;
  timeline: string | null;
  maxMembers: number;
  skills: string[];
  owner: {
    id: string;
    name: string;
    image: string | null;
    university: string | null;
    uid: string | null;
    reputation: number;
  };
  members: {
    id: string;
    name: string;
    image: string | null;
    uid: string | null;
    role: string;
  }[];
}

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useSupabaseUser();
  const userId = user?.id;
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [joinStatus, setJoinStatus] = useState<"none" | "pending" | "member" | "owner" | "rejected">("none");
  const [canRequest, setCanRequest] = useState(true);
  const [joinMessage, setJoinMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetch(`/api/projects/${projectId}`)
      .then((r) => r.json())
      .then((data) => {
        setProject(data);
        setLoading(false);
      });
  }, [projectId, userId]);

  useEffect(() => {
    if (!userId || !projectId) return;
    fetch(`/api/projects/${projectId}/join/status`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!data) return;
        if (data.relationship === "OWNER") setJoinStatus("owner");
        if (data.relationship === "MEMBER") setJoinStatus("member");
        if (data.relationship === "PENDING") setJoinStatus("pending");
        if (data.relationship === "REJECTED") setJoinStatus("rejected");
        if (data.relationship === "NONE") setJoinStatus("none");
        setCanRequest(!!data.canRequest);
      })
      .catch(() => null);
  }, [userId, projectId]);

  const handleJoinRequest = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: joinMessage || undefined }),
      });
      if (res.ok) {
        setJoinStatus("pending");
        setShowForm(false);
      } else {
        const data = await res.json();
        if (data.error?.includes("already pending")) setJoinStatus("pending");
        if (data.error?.toLowerCase().includes("already a member")) setJoinStatus("member");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="h-8 w-32 bg-muted animate-pulse rounded" />
        <div className="h-64 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="max-w-5xl mx-auto text-center py-12">
        <p className="text-muted-foreground">Project not found</p>
      </div>
    );
  }

  const statusLabel =
    project.status === "IN_PROGRESS"
      ? "In Progress"
      : project.status.charAt(0) + project.status.slice(1).toLowerCase();

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Button variant="ghost" size="sm" render={<Link href="/projects" />}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Projects
      </Button>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200">
                {statusLabel}
              </Badge>
              {project.timeline && (
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {project.timeline}
                </span>
              )}
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {project.members.length}/{project.maxMembers} members
              </span>
            </div>
            <h1 className="font-heading text-2xl md:text-3xl font-bold">
              {project.title}
            </h1>
          </div>

          <div className="flex flex-wrap gap-2">
            {project.skills.map((skill) => (
              <Badge key={skill} variant="secondary">
                {skill}
              </Badge>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Problem Statement</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">
                {project.problem}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Project Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">
                {project.description}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Current Team</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {project.members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 p-3 rounded-lg border"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={member.image || undefined} />
                    <AvatarFallback>
                      {member.name?.charAt(0)?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{member.name}</p>
                    {member.uid && (
                      <p className="text-xs text-muted-foreground">#{member.uid}</p>
                    )}
                  </div>
                  <Badge variant={member.role === "ADMIN" || member.role === "LEADER" ? "default" : "secondary"}>
                    {member.role === "LEADER" ? "ADMIN" : member.role}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardContent className="p-5 space-y-4">
              {joinStatus === "owner" ? (
                <div className="space-y-2">
                  <Button className="w-full" size="lg" render={<Link href={`/projects/${project.id}/workspace`} />}>
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Open Workspace
                  </Button>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" render={<Link href={`/projects/${project.id}/requests`} />}>
                      <Inbox className="mr-2 h-4 w-4" />
                      Requests
                    </Button>
                    <Button variant="outline" render={<Link href={`/projects/${project.id}/settings`} />}>
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </Button>
                  </div>
                </div>
              ) : joinStatus === "member" ? (
                <Button className="w-full" size="lg" render={<Link href={`/projects/${project.id}/workspace`} />}>
                  <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-500" />
                  Open Workspace
                </Button>
              ) : joinStatus === "pending" ? (
                <Button className="w-full" size="lg" variant="outline" disabled>
                  <Clock className="mr-2 h-4 w-4 text-amber-500" />
                  Request Pending
                </Button>
              ) : joinStatus === "rejected" && !showForm ? (
                <Button
                  className="w-full"
                  size="lg"
                  variant="outline"
                  disabled={!canRequest}
                  onClick={() => setShowForm(true)}
                >
                  Apply Again
                </Button>
              ) : showForm ? (
                <div className="space-y-3">
                  <Textarea
                    placeholder="Why do you want to join? (optional)"
                    value={joinMessage}
                    onChange={(e) => setJoinMessage(e.target.value)}
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      size="lg"
                      onClick={handleJoinRequest}
                      disabled={submitting}
                    >
                      {submitting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="mr-2 h-4 w-4" />
                      )}
                      Send Request
                    </Button>
                    <Button
                      variant="ghost"
                      size="lg"
                      onClick={() => setShowForm(false)}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  className="w-full"
                  size="lg"
                  disabled={!canRequest}
                  onClick={() => setShowForm(true)}
                >
                  Apply to Join
                </Button>
              )}
              <Separator />
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={project.owner.image || undefined} />
                  <AvatarFallback>
                    {project.owner.name?.charAt(0)?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-sm">{project.owner.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {project.owner.university || ""} · ⭐ {project.owner.reputation}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
