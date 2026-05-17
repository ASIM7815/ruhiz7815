"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Trash2, Archive, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

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
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

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
    
    if (!project.title.trim()) {
      toast.error("Project title is required");
      return;
    }

    if (!project.problem.trim()) {
      toast.error("Problem statement is required");
      return;
    }

    if (!project.description.trim()) {
      toast.error("Description is required");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: project.title.trim(),
          problem: project.problem.trim(),
          description: project.description.trim(),
          status: project.status,
          visibility: project.visibility,
          timeline: project.timeline?.trim() || null,
          maxMembers: project.maxMembers,
          skills: skills
            .split(",")
            .map((skill) => skill.trim())
            .filter(Boolean)
            .slice(0, 10), // Limit to 10 skills
        }),
      });

      if (res.ok) {
        toast.success("Project settings updated");
        router.push(`/projects/${projectId}`);
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to update project");
      }
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to update project");
    } finally {
      setSaving(false);
    }
  }

  async function archiveProject() {
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ARCHIVED" }),
      });

      if (res.ok) {
        toast.success("Project archived");
        router.push("/projects");
      } else {
        toast.error("Failed to archive project");
      }
    } catch (error) {
      console.error("Archive error:", error);
      toast.error("Failed to archive project");
    }
    setShowArchiveDialog(false);
  }

  async function deleteProject() {
    if (deleteConfirmText !== project?.title) {
      toast.error("Project name doesn't match");
      return;
    }

    try {
      const res = await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Project deleted");
        router.push("/projects");
      } else {
        toast.error("Failed to delete project");
      }
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete project");
    }
    setShowDeleteDialog(false);
    setDeleteConfirmText("");
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
        <Link href={`/projects/${projectId}`}>
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Project
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/projects/${projectId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="font-heading text-2xl font-bold">Project Settings</h1>
          <p className="text-sm text-muted-foreground">Manage your project configuration</p>
        </div>
      </div>

      {/* Basic Details */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Details</CardTitle>
          <CardDescription>Update project information visible to members and visitors</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="title">
              Project Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              value={project.title}
              onChange={(e) => setProject({ ...project, title: e.target.value })}
              placeholder="e.g., AI-Powered Study Assistant"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="problem">
              Problem Statement <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="problem"
              value={project.problem}
              onChange={(e) => setProject({ ...project, problem: e.target.value })}
              placeholder="What problem does this project solve?"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">
              Description <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="description"
              rows={5}
              value={project.description}
              onChange={(e) => setProject({ ...project, description: e.target.value })}
              placeholder="Detailed description of the project..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="skills">Required Skills</Label>
            <Input
              id="skills"
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              placeholder="e.g., React, Python, Machine Learning (comma-separated)"
            />
            <p className="text-xs text-muted-foreground">
              Comma-separated list (max 10 skills)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="timeline">Timeline (Optional)</Label>
            <Input
              id="timeline"
              value={project.timeline || ""}
              onChange={(e) => setProject({ ...project, timeline: e.target.value })}
              placeholder="e.g., 3 months, Summer 2026"
            />
          </div>
        </CardContent>
      </Card>

      {/* Project Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Project Configuration</CardTitle>
          <CardDescription>Control project status, visibility, and team size</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={project.status}
                onValueChange={(status) => setProject({ ...project, status: status || "OPEN" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OPEN">Open - Accepting members</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress - Active development</SelectItem>
                  <SelectItem value="COMPLETED">Completed - Project finished</SelectItem>
                  <SelectItem value="ARCHIVED">Archived - No longer active</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {project.status === "OPEN" && "Project is visible and accepting new members"}
                {project.status === "IN_PROGRESS" && "Project is actively being worked on"}
                {project.status === "COMPLETED" && "Project has been completed"}
                {project.status === "ARCHIVED" && "Project is archived and hidden from listings"}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Visibility</Label>
              <Select
                value={project.visibility || "PUBLIC"}
                onValueChange={(visibility) => setProject({ ...project, visibility: visibility || "PUBLIC" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PUBLIC">Public - Anyone can view</SelectItem>
                  <SelectItem value="PRIVATE">Private - Members only</SelectItem>
                  <SelectItem value="UNLISTED">Unlisted - Link only</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {project.visibility === "PUBLIC" && "Visible in project listings"}
                {project.visibility === "PRIVATE" && "Only members can view"}
                {project.visibility === "UNLISTED" && "Hidden from listings but accessible via link"}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxMembers">Maximum Team Size</Label>
            <Input
              id="maxMembers"
              type="number"
              min="2"
              max="20"
              value={project.maxMembers}
              onChange={(e) => setProject({ ...project, maxMembers: Math.min(20, Math.max(2, Number(e.target.value))) })}
            />
            <p className="text-xs text-muted-foreground">
              Between 2 and 20 members (currently accepting new members)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>Irreversible actions - proceed with caution</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div>
              <p className="font-medium">Archive Project</p>
              <p className="text-sm text-muted-foreground">
                Hide project from listings. Can be restored later.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowArchiveDialog(true)}
              disabled={project.status === "ARCHIVED"}
            >
              <Archive className="mr-2 h-4 w-4" />
              Archive
            </Button>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-destructive/50 p-4">
            <div>
              <p className="font-medium text-destructive">Delete Project</p>
              <p className="text-sm text-muted-foreground">
                Permanently delete this project. This cannot be undone.
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <Link href={`/projects/${projectId}`}>
          <Button variant="outline" className="w-full sm:w-auto">
            Cancel
          </Button>
        </Link>
        <Button onClick={saveProject} disabled={saving} className="w-full sm:w-auto">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Changes
        </Button>
      </div>

      {/* Archive Dialog */}
      <AlertDialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Project?</AlertDialogTitle>
            <AlertDialogDescription>
              This will hide the project from public listings. Members will still have access,
              and you can restore it later from your projects page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={archiveProject}>
              Archive Project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete Project Permanently?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                This action <strong>cannot be undone</strong>. This will permanently delete:
              </p>
              <ul className="list-inside list-disc space-y-1 text-sm">
                <li>Project details and description</li>
                <li>All member associations</li>
                <li>Join requests</li>
                <li>Project group chat</li>
                <li>All project files</li>
              </ul>
              <div className="space-y-2 pt-2">
                <Label htmlFor="confirm-delete">
                  Type <strong>{project.title}</strong> to confirm:
                </Label>
                <Input
                  id="confirm-delete"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Enter project title"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirmText("")}>
              Cancel
            </AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={deleteProject}
              disabled={deleteConfirmText !== project.title}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Forever
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
