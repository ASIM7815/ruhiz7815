"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Plus,
  Search,
  Users,
  Clock,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Inbox,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Project {
  id: string;
  title: string;
  description: string;
  status: string;
  timeline: string | null;
  maxMembers: number;
  memberCount: number;
  skills: string[];
  owner: {
    id: string;
    name: string;
    image: string | null;
    university: string | null;
    uid: string | null;
  };
}

interface JoinRequest {
  id: string;
  userId: string;
  message: string | null;
  status: string;
  createdAt: string;
  user: { id: string; name: string; image: string | null; uid: string | null; university: string | null };
}

interface MyProject extends Project {
  pendingRequests: JoinRequest[];
}

const statusColors: Record<string, string> = {
  OPEN: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
  IN_PROGRESS: "bg-blue-500/10 text-blue-600 border-blue-200",
  COMPLETED: "bg-gray-500/10 text-gray-600 border-gray-200",
};

export default function ProjectsPage() {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const [tab, setTab] = useState<"browse" | "mine">("browse");
  const [projects, setProjects] = useState<Project[]>([]);
  const [myProjects, setMyProjects] = useState<MyProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [myLoading, setMyLoading] = useState(false);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filter === "Open") params.set("status", "OPEN");
    if (filter === "In Progress") params.set("status", "IN_PROGRESS");
    fetch(`/api/projects?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setProjects(data.projects || []);
        setLoading(false);
      });
  }, [filter]);

  const loadMyProjects = useCallback(async () => {
    if (!userId) return;
    setMyLoading(true);
    try {
      const res = await fetch(`/api/projects?owner=me`);
      const data = await res.json();
      const owned: Project[] = data.projects || [];
      const withRequests = await Promise.all(
        owned.map(async (p) => {
          const rr = await fetch(`/api/projects/${p.id}/join`);
          const reqs = rr.ok ? await rr.json() : [];
          return { ...p, pendingRequests: reqs } as MyProject;
        })
      );
      setMyProjects(withRequests);
    } finally {
      setMyLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (tab === "mine") loadMyProjects();
  }, [tab, loadMyProjects]);

  const handleRequest = async (projectId: string, requestId: string, action: "ACCEPTED" | "REJECTED") => {
    setActionLoading(requestId);
    try {
      await fetch(`/api/projects/${projectId}/join/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: action }),
      });
      setMyProjects((prev) =>
        prev.map((p) =>
          p.id === projectId
            ? { ...p, pendingRequests: p.pendingRequests.filter((r) => r.id !== requestId) }
            : p
        )
      );
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = search
    ? projects.filter(
        (p) =>
          p.title.toLowerCase().includes(search.toLowerCase()) ||
          p.skills.some((s) => s.toLowerCase().includes(search.toLowerCase()))
      )
    : projects;

  const totalPending = myProjects.reduce((s, p) => s + p.pendingRequests.length, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold">
            Projects
          </h1>
          <p className="text-muted-foreground mt-1">
            Browse project ideas or create your own
          </p>
        </div>
        <Button render={<Link href="/projects/create" />}>
            <Plus className="mr-2 h-4 w-4" />
            Post Project Idea
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
        <button
          onClick={() => setTab("browse")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === "browse" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Browse Projects
        </button>
        <button
          onClick={() => setTab("mine")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
            tab === "mine" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          My Projects
          {totalPending > 0 && (
            <span className="bg-primary text-primary-foreground text-xs rounded-full px-2 py-0.5 min-w-[20px] text-center">
              {totalPending}
            </span>
          )}
        </button>
      </div>

      {tab === "browse" ? (
        <>
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search projects by title or skill..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              {["All", "Open", "In Progress"].map((f) => (
                <Badge
                  key={f}
                  variant={filter === f ? "default" : "outline"}
                  className="cursor-pointer hover:bg-primary/10 px-4 py-1.5"
                  onClick={() => setFilter(f)}
                >
                  {f}
                </Badge>
              ))}
            </div>
          </div>

          {/* Project Grid */}
          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-64 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-muted-foreground">No projects found.</p>
                <Button className="mt-4" render={<Link href="/projects/create" />}>
                    <Plus className="mr-2 h-4 w-4" />
                    Post the first one!
                </Button>
              </CardContent>
            </Card>
          ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((project) => (
              <Card
                key={project.id}
                className="group hover:shadow-lg hover:border-primary/30 transition-all"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <Badge
                      variant="outline"
                      className={statusColors[project.status]}
                    >
                      {project.status === "IN_PROGRESS"
                        ? "In Progress"
                        : project.status.charAt(0) +
                          project.status.slice(1).toLowerCase()}
                    </Badge>
                  </div>
                  <h3 className="font-heading text-lg font-semibold mt-2 group-hover:text-primary transition-colors">
                    {project.title}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {project.description}
                  </p>
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {project.skills.map((skill) => (
                      <Badge key={skill} variant="secondary" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {project.memberCount}/{project.maxMembers}
                    </span>
                    {project.timeline && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {project.timeline}
                    </span>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="pt-3 border-t">
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={project.owner.image || undefined} />
                        <AvatarFallback>
                          {project.owner.name
                            .split(" ")
                            .map((n: string) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-xs font-medium">
                          {project.owner.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {project.owner.university || ""}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" render={<Link href={`/projects/${project.id}`} />}>
                        View
                        <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
          )}
        </>
      ) : (
        /* My Projects Tab */
        myLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-64 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : myProjects.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">You haven&apos;t created any projects yet.</p>
              <Button className="mt-4" render={<Link href="/projects/create" />}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create your first project
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {myProjects.map((project) => (
              <Card key={project.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className={statusColors[project.status]}>
                        {project.status === "IN_PROGRESS" ? "In Progress" : project.status.charAt(0) + project.status.slice(1).toLowerCase()}
                      </Badge>
                      <h3 className="font-heading text-lg font-semibold">{project.title}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {project.memberCount}/{project.maxMembers}
                      </span>
                      <Button variant="ghost" size="sm" render={<Link href={`/projects/${project.id}`} />}>
                          View
                          <ArrowRight className="ml-1 h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                {project.pendingRequests.length > 0 && (
                  <CardContent className="pt-0">
                    <div className="border rounded-lg">
                      <div className="px-4 py-2.5 bg-muted/50 border-b flex items-center gap-2">
                        <Inbox className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">
                          Pending Requests ({project.pendingRequests.length})
                        </span>
                      </div>
                      <div className="divide-y">
                        {project.pendingRequests.map((req) => (
                          <div key={req.id} className="p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                            <Avatar className="h-10 w-10 shrink-0">
                              <AvatarImage src={req.user.image || undefined} />
                              <AvatarFallback>{req.user.name?.charAt(0)?.toUpperCase() || "U"}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm">{req.user.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {req.user.university || ""} {req.user.uid ? `· #${req.user.uid}` : ""}
                              </p>
                              {req.message && (
                                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">&ldquo;{req.message}&rdquo;</p>
                              )}
                            </div>
                            <div className="flex gap-2 w-full sm:w-auto sm:shrink-0">
                              <Button
                                size="sm"
                                onClick={() => handleRequest(project.id, req.id, "ACCEPTED")}
                                disabled={actionLoading === req.id}
                                className="bg-emerald-600 hover:bg-emerald-700"
                              >
                                {actionLoading === req.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="h-4 w-4 mr-1" />
                                )}
                                Accept
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRequest(project.id, req.id, "REJECTED")}
                                disabled={actionLoading === req.id}
                                className="border-red-300 text-red-600 hover:bg-red-50"
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                )}
                {project.pendingRequests.length === 0 && (
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground">No pending join requests</p>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )
      )}
    </div>
  );
}
