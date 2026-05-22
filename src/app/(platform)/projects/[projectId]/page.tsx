"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useSupabaseUser } from "@/hooks/use-supabase-user";
import {
  ArrowLeft,
  MessageSquare,
  Users,
  Clock,
  Send,
  CheckCircle2,
  Inbox,
  Loader2,
  XCircle,
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
  viewerStatus?: "none" | "pending" | "member" | "owner";
  groupConversationId: string | null;
}

interface JoinRequest {
  id: string;
  userId: string;
  message: string | null;
  status: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    image: string | null;
    uid: string | null;
    university: string | null;
  };
}

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useSupabaseUser();
  const userId = user?.id;
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [joinStatus, setJoinStatus] = useState<"none" | "pending" | "member" | "owner">("none");
  const [joinMessage, setJoinMessage] = useState("");
  const [joinError, setJoinError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [ownerRequests, setOwnerRequests] = useState<JoinRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestActionLoading, setRequestActionLoading] = useState<string | null>(null);
  const [requestError, setRequestError] = useState("");

  const loadProject = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    const res = await fetch(`/api/projects/${projectId}`);
    if (!res.ok) {
      setProject(null);
      setLoading(false);
      return;
    }

    const data = await res.json();
    setProject(data);
    if (data.viewerStatus) {
      setJoinStatus(data.viewerStatus);
    } else if (userId) {
      if (data.owner?.id === userId) setJoinStatus("owner");
      else if (data.members?.some((m: { id: string }) => m.id === userId)) setJoinStatus("member");
    }
    setLoading(false);
  }, [projectId, userId]);

  const loadOwnerRequests = useCallback(async (showSpinner = false) => {
    if (!projectId || joinStatus !== "owner") return;
    if (showSpinner) setRequestsLoading(true);
    setRequestError("");

    try {
      const res = await fetch(`/api/projects/${projectId}/join`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setRequestError(data.error || "Could not load join requests.");
        return;
      }

      const data = await res.json();
      setOwnerRequests(Array.isArray(data) ? data : []);
    } finally {
      if (showSpinner) setRequestsLoading(false);
    }
  }, [joinStatus, projectId]);

  useEffect(() => {
    loadProject(true);
  }, [loadProject]);

  useEffect(() => {
    if (!userId || !projectId || joinStatus !== "none") return;
    fetch(`/api/projects/${projectId}/join`, { method: "GET" })
      .then(async (r) => {
        if (!r.ok) return null;
        return r.json();
      })
      .then((data) => {
        if (data?.status === "PENDING") setJoinStatus("pending");
        if (data?.status === "MEMBER" || data?.status === "ACCEPTED") setJoinStatus("member");
      })
      .catch(() => null);
  }, [userId, projectId, joinStatus]);

  useEffect(() => {
    if (joinStatus !== "owner") return;

    loadOwnerRequests(true);
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        loadOwnerRequests(false);
      }
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, [joinStatus, loadOwnerRequests]);

  const handleJoinRequest = async () => {
    setSubmitting(true);
    setJoinError("");
    try {
      const res = await fetch(`/api/projects/${projectId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: joinMessage || undefined }),
      });
      if (res.ok) {
        setJoinStatus("pending");
        setShowForm(false);
        setJoinMessage("");
      } else {
        const data = await res.json().catch(() => ({}));
        if (data.error?.includes("already pending")) setJoinStatus("pending");
        if (data.error?.includes("already a member")) setJoinStatus("member");
        setJoinError(data.error || "Could not send join request.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleOwnerRequest = async (requestId: string, action: "accept" | "reject") => {
    setRequestActionLoading(requestId);
    setRequestError("");

    try {
      const res = await fetch(`/api/projects/${projectId}/join/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setRequestError(data.error || "Could not process the request.");
        return;
      }

      setOwnerRequests((prev) => prev.filter((request) => request.id !== requestId));
      await loadProject(false);
    } finally {
      setRequestActionLoading(null);
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
  const groupHref = project.groupConversationId
    ? `/messages?group=${project.groupConversationId}`
    : "/messages?tab=groups";
  const canOpenGroupChat = Boolean(project.groupConversationId) || project.members.length > 1;

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
                  <Badge variant={member.role === "LEADER" ? "default" : "secondary"}>
                    {member.role}
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
                  <Button className="w-full" size="lg" variant="outline" disabled>
                    Your Project
                  </Button>
                  {canOpenGroupChat ? (
                    <Button className="w-full" size="lg" render={<Link href={groupHref} />}>
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Open Group Chat
                    </Button>
                  ) : (
                    <Button className="w-full" size="lg" variant="outline" disabled>
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Group starts after approval
                    </Button>
                  )}
                </div>
              ) : joinStatus === "member" ? (
                <div className="space-y-2">
                  <Button className="w-full" size="lg" variant="outline" disabled>
                    <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-500" />
                    You&apos;re a Member
                  </Button>
                  <Button className="w-full" size="lg" render={<Link href={groupHref} />}>
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Open Group Chat
                  </Button>
                </div>
              ) : joinStatus === "pending" ? (
                <Button className="w-full" size="lg" variant="outline" disabled>
                  <Clock className="mr-2 h-4 w-4 text-amber-500" />
                  Request Pending
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
                  {joinError && (
                    <p className="text-sm text-destructive">{joinError}</p>
                  )}
                </div>
              ) : (
                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => setShowForm(true)}
                >
                  Apply to Join
                </Button>
              )}
              {joinStatus === "owner" && (
                <div className="rounded-lg border">
                  <div className="flex items-center gap-2 border-b bg-muted/40 px-3 py-2">
                    <Inbox className="h-4 w-4 text-primary" />
                    <p className="text-sm font-medium">Join Requests</p>
                    {ownerRequests.length > 0 && (
                      <Badge className="ml-auto text-[10px]">{ownerRequests.length}</Badge>
                    )}
                  </div>
                  <div className="space-y-3 p-3">
                    {requestsLoading ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading requests
                      </div>
                    ) : ownerRequests.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No pending requests yet.</p>
                    ) : (
                      ownerRequests.map((request) => (
                        <div key={request.id} className="space-y-3 rounded-lg border p-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarImage src={request.user.image || undefined} />
                              <AvatarFallback>
                                {request.user.name?.charAt(0)?.toUpperCase() || "U"}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">{request.user.name}</p>
                              <p className="truncate text-xs text-muted-foreground">
                                {request.user.university || "Student"}
                                {request.user.uid ? ` · #${request.user.uid}` : ""}
                              </p>
                            </div>
                          </div>
                          {request.message && (
                            <p className="line-clamp-3 text-sm text-muted-foreground">
                              &ldquo;{request.message}&rdquo;
                            </p>
                          )}
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleOwnerRequest(request.id, "accept")}
                              disabled={requestActionLoading === request.id}
                              className="bg-emerald-600 hover:bg-emerald-700"
                            >
                              {requestActionLoading === request.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <CheckCircle2 className="mr-1 h-4 w-4" />
                              )}
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOwnerRequest(request.id, "reject")}
                              disabled={requestActionLoading === request.id}
                              className="border-red-300 text-red-600 hover:bg-red-50"
                            >
                              <XCircle className="mr-1 h-4 w-4" />
                              Reject
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                    {requestError && (
                      <p className="text-sm text-destructive">{requestError}</p>
                    )}
                  </div>
                </div>
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
