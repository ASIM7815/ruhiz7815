"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  Users,
  Clock,
  ArrowRight,
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

const statusColors: Record<string, string> = {
  OPEN: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
  IN_PROGRESS: "bg-blue-500/10 text-blue-600 border-blue-200",
  COMPLETED: "bg-gray-500/10 text-gray-600 border-gray-200",
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");

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

  const filtered = search
    ? projects.filter(
        (p) =>
          p.title.toLowerCase().includes(search.toLowerCase()) ||
          p.skills.some((s) => s.toLowerCase().includes(search.toLowerCase()))
      )
    : projects;

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
                    <AvatarImage src={project.owner.image || ""} />
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
    </div>
  );
}
