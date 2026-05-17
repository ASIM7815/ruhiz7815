"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, Search, Archive, Trash2 } from "lucide-react";
import Link from "next/link";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Project = {
  id: string;
  title: string;
  description: string;
  status: string;
  visibility: string;
  memberCount: number;
  createdAt: string;
  owner: {
    id: string;
    name: string;
    email: string;
  };
};

const statusColors: Record<string, string> = {
  OPEN: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
  IN_PROGRESS: "bg-blue-500/10 text-blue-600 border-blue-200",
  COMPLETED: "bg-gray-500/10 text-gray-600 border-gray-200",
  ARCHIVED: "bg-slate-500/10 text-slate-600 border-slate-200",
};

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadProjects();
  }, [statusFilter]);

  async function loadProjects() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      
      const res = await fetch(`/api/projects?${params}`);
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
      }
    } finally {
      setLoading(false);
    }
  }

  async function archiveProject(projectId: string) {
    if (!confirm("Archive this project? It will be hidden from public view.")) return;
    
    setActionLoading(projectId);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ARCHIVED" }),
      });

      if (res.ok) {
        setProjects((prev) =>
          prev.map((p) => (p.id === projectId ? { ...p, status: "ARCHIVED" } : p))
        );
      }
    } finally {
      setActionLoading(null);
    }
  }

  async function deleteProject(projectId: string) {
    if (!confirm("Permanently delete this project? This cannot be undone.")) return;
    
    setActionLoading(projectId);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setProjects((prev) => prev.filter((p) => p.id !== projectId));
      }
    } finally {
      setActionLoading(null);
    }
  }

  const filtered = projects.filter((p) => {
    const searchLower = search.toLowerCase();
    return (
      !search ||
      p.title.toLowerCase().includes(searchLower) ||
      p.description.toLowerCase().includes(searchLower) ||
      p.owner.name.toLowerCase().includes(searchLower) ||
      p.owner.email.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Projects</h1>
        <p className="text-muted-foreground">Moderate and manage platform projects</p>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects by title, description, or owner..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value || "all")}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="OPEN">Open</SelectItem>
            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="ARCHIVED">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No projects found</p>
            </CardContent>
          </Card>
        ) : (
          filtered.map((project) => (
            <Card key={project.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold truncate">{project.title}</h3>
                      <Badge variant="outline" className={statusColors[project.status]}>
                        {project.status}
                      </Badge>
                      <Badge variant="secondary">{project.visibility}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      {project.description}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Owner: {project.owner.name}</span>
                      <span>•</span>
                      <span>{project.memberCount} members</span>
                      <span>•</span>
                      <span>{new Date(project.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      render={<Link href={`/projects/${project.id}`} target="_blank" />}
                    >
                      View
                    </Button>
                    {project.status !== "ARCHIVED" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => archiveProject(project.id)}
                        disabled={actionLoading === project.id}
                      >
                        {actionLoading === project.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Archive className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive"
                      onClick={() => deleteProject(project.id)}
                      disabled={actionLoading === project.id}
                    >
                      {actionLoading === project.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
