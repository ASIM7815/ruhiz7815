"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSupabaseUser } from "@/hooks/use-supabase-user";
import { motion, AnimatePresence } from "framer-motion";
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
  FolderOpen,
  Sparkles,
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
  const { user } = useSupabaseUser();
  const userId = user?.id;

  const [tab, setTab] = useState<"browse" | "mine">("browse");
  const [projects, setProjects] = useState<Project[]>([]);
  const [myProjects, setMyProjects] = useState<MyProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [myLoading, setMyLoading] = useState(false);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");

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

  const loadMyProjects = useCallback(async (showSpinner = true) => {
    if (!userId) return;
    if (showSpinner) setMyLoading(true);
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
      if (showSpinner) setMyLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (tab === "mine") loadMyProjects();
  }, [tab, loadMyProjects]);

  useEffect(() => {
    if (!userId) return;

    loadMyProjects(false);
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        loadMyProjects(false);
      }
    }, 8000);

    return () => window.clearInterval(intervalId);
  }, [userId, loadMyProjects]);

  const handleRequest = async (projectId: string, requestId: string, action: "accept" | "reject") => {
    setActionLoading(requestId);
    setActionError("");
    try {
      const res = await fetch(`/api/projects/${projectId}/join/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setActionError(data.error || "Could not process the request.");
        return;
      }
      setMyProjects((prev) =>
        prev.map((p) =>
          p.id === projectId
            ? {
                ...p,
                memberCount: action === "accept" ? Math.min(p.memberCount + 1, p.maxMembers) : p.memberCount,
                pendingRequests: p.pendingRequests.filter((r) => r.id !== requestId),
              }
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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold">
            Projects
          </h1>
          <p className="text-muted-foreground mt-1">
            Browse project ideas or create your own
          </p>
        </div>
        <Button
          render={<Link href="/projects/create" />}
          className="mobile-primary-action"
        >
            <Plus className="mr-2 h-4 w-4" />
            Post Project Idea
        </Button>
      </motion.div>

      {/* Tabs */}
      <div className="mobile-tabs">
        <button
          onClick={() => setTab("browse")}
          className={`mobile-tab-button ${
            tab === "browse" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Browse Projects
        </button>
        <button
          onClick={() => setTab("mine")}
          className={`mobile-tab-button flex items-center justify-center gap-2 ${
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
            <div className="mobile-filter-scroll sm:justify-end">
              {["All", "Open", "In Progress"].map((f) => (
                <Badge
                  key={f}
                  variant={filter === f ? "default" : "outline"}
                  className="mobile-chip hover:bg-primary/10"
                  onClick={() => setFilter(f)}
                >
                  {f}
                </Badge>
              ))}
            </div>
          </div>

          {/* Project Grid */}
          {loading ? (
            <div className="mobile-card-grid">
              {[1, 2, 3].map((i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0.5, 0.8, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 }}
                  className="h-64 bg-muted rounded-lg"
                />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <Card>
                <CardContent className="mobile-empty-card">
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                  >
                    <FolderOpen className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
                  </motion.div>
                  <p className="text-muted-foreground">No projects found.</p>
                  <Button className="mt-4 mobile-primary-action" render={<Link href="/projects/create" />}>
                      <Plus className="mr-2 h-4 w-4" />
                      Post the first one!
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
          <div className="mobile-card-grid">
            <AnimatePresence mode="popLayout">
            {filtered.map((project, idx) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3, delay: idx * 0.05 }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
              >
              <Card
                className="group hover:shadow-lg hover:border-primary/30 transition-all h-full"
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
                  <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full sm:w-auto"
                      render={<Link href={`/projects/${project.id}`} />}
                    >
                        View
                        <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                  </div>
                </CardFooter>
              </Card>
              </motion.div>
            ))}
            </AnimatePresence>
          </div>
          )}
        </>
      ) : (
        /* My Projects Tab */
        myLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2].map((i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: [0.5, 0.8, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 }}
                className="h-64 bg-muted rounded-lg"
              />
            ))}
          </div>
        ) : myProjects.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardContent className="mobile-empty-card">
                <motion.div
                  animate={{
                    scale: [1, 1.1, 1],
                    rotate: [0, 5, -5, 0],
                  }}
                  transition={{ duration: 3, repeat: Infinity }}
                >
                  <Sparkles className="h-16 w-16 text-primary/50 mx-auto mb-4" />
                </motion.div>
                <p className="text-muted-foreground">You haven&apos;t created any projects yet.</p>
                <Button className="mt-4 mobile-primary-action" render={<Link href="/projects/create" />}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create your first project
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            {actionError && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
              >
                {actionError}
              </motion.div>
            )}
            <AnimatePresence mode="popLayout">
            {myProjects.map((project, idx) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.05 }}
              >
              <Card className="overflow-hidden">
                <CardHeader className="pb-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-3">
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
                                onClick={() => handleRequest(project.id, req.id, "accept")}
                                disabled={actionLoading === req.id}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-700 sm:flex-none"
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
                                onClick={() => handleRequest(project.id, req.id, "reject")}
                                disabled={actionLoading === req.id}
                                className="flex-1 border-red-300 text-red-600 hover:bg-red-50 sm:flex-none"
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
              </motion.div>
            ))}
            </AnimatePresence>
          </motion.div>
        )
      )}
    </motion.div>
  );
}
