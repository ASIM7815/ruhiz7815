"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type ProjectDetail = {
  id: string;
  title: string;
  problem: string;
  description: string;
  status: string;
  visibility: string;
  timeline: string | null;
  maxMembers: number;
  skills: string[];
};

export default function ProjectSettingsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const router = useRouter();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [skills, setSkills] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadProject = useCallback(async () => {
    setLoading(true);
    try {
      const [projectRes, groupRes] = await Promise.all([
        fetch(`/api/projects/${projectId}`),
        fetch(`/api/projects/${projectId}/group`),
      ]);

      if (!groupRes.ok) {
        setError("Only project admins can edit project settings.");
        return;
      }

      const group = await groupRes.json();
      if (!group.isAdmin) {
        setError("Only project admins can edit project settings.");
        return;
      }

      if (projectRes.ok) {
        const data = await projectRes.json();
        setProject(data);
        setSkills((data.skills || []).join(", "));
      }
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  async function saveProject() {
    if (!project) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: project.title,
          problem: project.problem,
          description: project.description,
          status: project.status,
          visibility: project.visibility,
          timeline: project.timeline,
          maxMembers: project.maxMembers,
          skills: skills
            .split(",")
            .map((skill) => skill.trim())
            .filter(Boolean),
        }),
      });

      if (res.ok) router.push(`/projects/${projectId}`);
    } finally {
      setSaving(false);
    }
  }

  async function archiveProject() {
    if (!confirm("Archive this project?")) return;
    const res = await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
    if (res.ok) router.push("/projects");
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="mx-auto max-w-xl space-y-4 text-center">
        <p className="text-sm text-muted-foreground">{error || "Project not found."}</p>
        <Button variant="outline" render={<Link href={`/projects/${projectId}`} />}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Project
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" render={<Link href={`/projects/${projectId}`} />}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="font-heading text-2xl font-bold">Project Settings</h1>
          <p className="text-sm text-muted-foreground">Update project details and availability.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
          <CardDescription>Changes apply to the public project page and workspace group.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={project.title} onChange={(event) => setProject({ ...project, title: event.target.value })} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="problem">Problem</Label>
            <Textarea id="problem" value={project.problem} onChange={(event) => setProject({ ...project, problem: event.target.value })} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" rows={5} value={project.description} onChange={(event) => setProject({ ...project, description: event.target.value })} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={project.status} onValueChange={(status) => setProject({ ...project, status: status || "OPEN" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="OPEN">Open</SelectItem>
                  <SelectItem value="IN_PROGRESS">In progress</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="ARCHIVED">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Visibility</Label>
              <Select value={project.visibility || "PUBLIC"} onValueChange={(visibility) => setProject({ ...project, visibility: visibility || "PUBLIC" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PUBLIC">Public</SelectItem>
                  <SelectItem value="PRIVATE">Private</SelectItem>
                  <SelectItem value="UNLISTED">Unlisted</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="timeline">Timeline</Label>
              <Input id="timeline" value={project.timeline || ""} onChange={(event) => setProject({ ...project, timeline: event.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxMembers">Max members</Label>
              <Input id="maxMembers" type="number" min="2" max="20" value={project.maxMembers} onChange={(event) => setProject({ ...project, maxMembers: Number(event.target.value) })} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="skills">Skills</Label>
            <Input id="skills" value={skills} onChange={(event) => setSkills(event.target.value)} />
          </div>

          <div className="flex flex-col gap-3 border-t pt-5 sm:flex-row sm:justify-between">
            <Button variant="outline" className="text-destructive" onClick={archiveProject}>
              Archive Project
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" render={<Link href={`/projects/${projectId}`} />}>Cancel</Button>
              <Button onClick={saveProject} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
