"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Users,
  Clock,
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
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/projects/${projectId}`)
      .then((r) => r.json())
      .then((data) => {
        setProject(data);
        setLoading(false);
      });
  }, [projectId]);

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
                    <AvatarImage src={member.image || ""} />
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
              <Button className="w-full" size="lg">
                Apply to Join
              </Button>
              <Separator />
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={project.owner.image || ""} />
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
