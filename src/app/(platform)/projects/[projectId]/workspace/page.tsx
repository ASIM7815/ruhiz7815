"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  CheckSquare,
  Download,
  FileText,
  Loader2,
  MessageSquare,
  Plus,
  Settings,
  Shield,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GroupChat } from "@/components/group-chat";

type ProjectMember = {
  id: string;
  name: string;
  image: string | null;
  uid: string | null;
  role: string;
};

type ProjectDetail = {
  id: string;
  title: string;
  status: string;
  maxMembers: number;
  members: ProjectMember[];
};

type ProjectGroup = {
  id: string;
  name: string;
  isAdmin: boolean;
};

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: "TODO" | "IN_PROGRESS" | "DONE";
  assigneeId: string | null;
};

type ProjectFile = {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
  uploadedBy: {
    id: string;
    name: string;
    image: string | null;
  };
};

const taskColumns = [
  { value: "TODO", label: "To do" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "DONE", label: "Done" },
] as const;

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function WorkspacePage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [group, setGroup] = useState<ProjectGroup | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [newTask, setNewTask] = useState("");
  const [loading, setLoading] = useState(true);
  const [taskSaving, setTaskSaving] = useState(false);
  const [fileUploading, setFileUploading] = useState(false);
  const [fileDeleting, setFileDeleting] = useState<string | null>(null);
  const [error, setError] = useState("");

  const loadWorkspace = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [projectRes, groupRes, tasksRes, filesRes] = await Promise.all([
        fetch(`/api/projects/${projectId}`),
        fetch(`/api/projects/${projectId}/group`),
        fetch(`/api/projects/${projectId}/tasks`),
        fetch(`/api/projects/${projectId}/files`),
      ]);

      if (groupRes.status === 403) {
        setError("Only approved project members can open this workspace.");
        return;
      }

      if (!projectRes.ok || !groupRes.ok) {
        setError("Workspace could not be loaded.");
        return;
      }

      setProject(await projectRes.json());
      setGroup(await groupRes.json());

      if (tasksRes.ok) {
        const taskData = await tasksRes.json();
        setTasks(taskData.tasks || []);
      }

      if (filesRes.ok) {
        const fileData = await filesRes.json();
        setFiles(fileData.files || []);
      }
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  async function createTask() {
    const title = newTask.trim();
    if (!title || taskSaving) return;

    setTaskSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });

      if (res.ok) {
        setNewTask("");
        const tasksRes = await fetch(`/api/projects/${projectId}/tasks`);
        if (tasksRes.ok) {
          const data = await tasksRes.json();
          setTasks(data.tasks || []);
        }
      }
    } finally {
      setTaskSaving(false);
    }
  }

  async function updateTaskStatus(taskId: string, status: Task["status"]) {
    const previous = tasks;
    setTasks((current) => current.map((task) => (task.id === taskId ? { ...task, status } : task)));

    const res = await fetch(`/api/projects/${projectId}/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    if (!res.ok) setTasks(previous);
  }

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || fileUploading) return;

    // Validate file size (50MB)
    if (file.size > 50 * 1024 * 1024) {
      alert("File too large. Maximum size is 50MB.");
      return;
    }

    setFileUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/projects/${projectId}/files`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setFiles((prev) => [data.file, ...prev]);
      } else {
        const error = await res.json();
        alert(error.error || "Failed to upload file");
      }
    } finally {
      setFileUploading(false);
      // Reset input
      event.target.value = "";
    }
  }

  async function deleteFile(fileId: string) {
    if (!confirm("Delete this file? This cannot be undone.")) return;

    setFileDeleting(fileId);
    try {
      const res = await fetch(`/api/projects/${projectId}/files/${fileId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setFiles((prev) => prev.filter((f) => f.id !== fileId));
      } else {
        const error = await res.json();
        alert(error.error || "Failed to delete file");
      }
    } finally {
      setFileDeleting(null);
    }
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  function getFileIcon(mimeType: string) {
    if (mimeType.startsWith("image/")) return "🖼️";
    if (mimeType.startsWith("video/")) return "🎥";
    if (mimeType.startsWith("audio/")) return "🎵";
    if (mimeType.includes("pdf")) return "📄";
    if (mimeType.includes("word") || mimeType.includes("document")) return "📝";
    if (mimeType.includes("sheet") || mimeType.includes("excel")) return "📊";
    if (mimeType.includes("presentation") || mimeType.includes("powerpoint")) return "📽️";
    if (mimeType.includes("zip") || mimeType.includes("rar") || mimeType.includes("tar")) return "📦";
    return "📎";
  }

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
        <Button variant="outline" render={<Link href={`/projects/${projectId}`} />}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Project
        </Button>
      </div>
    );
  }

  if (!project || !group) return null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button variant="ghost" size="icon" render={<Link href={`/projects/${projectId}`} />}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-heading text-xl font-bold truncate">{project.title}</h1>
            {group.isAdmin && (
              <Badge variant="secondary" className="gap-1">
                <Shield className="h-3 w-3" />
                Admin
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {project.members.length}/{project.maxMembers} active members
          </p>
        </div>
        {group.isAdmin && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" render={<Link href={`/projects/${projectId}/requests`} />}>
              Requests
            </Button>
            <Button size="sm" variant="outline" render={<Link href={`/projects/${projectId}/settings`} />}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Button>
          </div>
        )}
      </div>

      <Tabs defaultValue="chat" className="space-y-4">
        <TabsList>
          <TabsTrigger value="chat" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Chat
          </TabsTrigger>
          <TabsTrigger value="tasks" className="gap-2">
            <CheckSquare className="h-4 w-4" />
            Tasks
          </TabsTrigger>
          <TabsTrigger value="files" className="gap-2">
            <FileText className="h-4 w-4" />
            Files
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

        <TabsContent value="tasks">
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={newTask}
                onChange={(event) => setNewTask(event.target.value)}
                placeholder="Add a task"
                onKeyDown={(event) => {
                  if (event.key === "Enter") createTask();
                }}
              />
              <Button onClick={createTask} disabled={!newTask.trim() || taskSaving}>
                {taskSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              </Button>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              {taskColumns.map((column) => (
                <Card key={column.value}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between text-sm">
                      {column.label}
                      <Badge variant="secondary">
                        {tasks.filter((task) => task.status === column.value).length}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {tasks
                      .filter((task) => task.status === column.value)
                      .map((task) => (
                        <div key={task.id} className="rounded-lg border p-3">
                          <p className="text-sm font-medium">{task.title}</p>
                          <div className="mt-3 flex gap-1">
                            {taskColumns.map((next) => (
                              <Button
                                key={next.value}
                                size="sm"
                                variant={task.status === next.value ? "default" : "outline"}
                                className="h-7 px-2 text-xs"
                                onClick={() => updateTaskStatus(task.id, next.value)}
                              >
                                {next.label}
                              </Button>
                            ))}
                          </div>
                        </div>
                      ))}
                    {tasks.filter((task) => task.status === column.value).length === 0 && (
                      <p className="py-6 text-center text-sm text-muted-foreground">No tasks</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="files">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Shared Files</CardTitle>
              <div className="relative">
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={fileUploading}
                />
                <Button
                  size="sm"
                  onClick={() => document.getElementById("file-upload")?.click()}
                  disabled={fileUploading}
                >
                  {fileUploading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  Upload File
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {files.length === 0 ? (
                <div className="py-12 text-center">
                  <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-4 text-sm text-muted-foreground">No shared files yet.</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Upload files to share with your team
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {files.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                    >
                      <div className="text-2xl">{getFileIcon(file.mimeType)}</div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{file.fileName}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{formatFileSize(file.fileSize)}</span>
                          <span>•</span>
                          <span>
                            {file.uploadedBy.name} •{" "}
                            {new Date(file.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          render={<a href={file.fileUrl} target="_blank" rel="noopener noreferrer" />}
                          title="Download"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deleteFile(file.id)}
                          disabled={fileDeleting === file.id}
                          className="text-destructive hover:text-destructive"
                          title="Delete"
                        >
                          {fileDeleting === file.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Project Members</CardTitle>
              {group.isAdmin && (
                <Button size="sm" variant="outline" render={<Link href={`/projects/${projectId}/members`} />}>
                  Manage
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              {project.members.map((member) => (
                <div key={member.id} className="flex items-center gap-3 rounded-lg border p-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={member.image || undefined} />
                    <AvatarFallback>{initials(member.name || "User")}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{member.name}</p>
                    {member.uid && <p className="text-xs text-muted-foreground">#{member.uid}</p>}
                  </div>
                  <Badge variant={member.role === "ADMIN" || member.role === "LEADER" ? "default" : "secondary"}>
                    {member.role === "LEADER" ? "ADMIN" : member.role}
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
