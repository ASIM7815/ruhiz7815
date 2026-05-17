"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Search,
  Upload,
  Download,
  Eye,
  Star,
  FileText,
  BookOpen,
  GraduationCap,
  X,
  Pencil,
  Check,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useSupabaseUser } from "@/hooks/use-supabase-user";

interface Resource {
  id: string;
  title: string;
  description: string | null;
  type: string;
  fileUrl: string | null;
  university: string | null;
  rating: number;
  downloads: number;
  author: { id: string; name: string; image: string | null; uid: string | null };
}

const typeIcons: Record<string, typeof FileText> = {
  NOTES: BookOpen,
  PAPER: FileText,
  MATERIAL: GraduationCap,
};

const typeColors: Record<string, string> = {
  NOTES: "bg-blue-500/10 text-blue-600 border-blue-200",
  PAPER: "bg-amber-500/10 text-amber-600 border-amber-200",
  MATERIAL: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
};

export default function KnowledgeHubPage() {
  const { user } = useSupabaseUser();
  const [tab, setTab] = useState<"browse" | "mine">("browse");
  const [resources, setResources] = useState<Resource[]>([]);
  const [myResources, setMyResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [myLoading, setMyLoading] = useState(false);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    title: "",
    description: "",
    type: "NOTES",
    university: "",
  });
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filter === "Notes") params.set("type", "NOTES");
    if (filter === "Papers") params.set("type", "PAPER");
    if (filter === "Materials") params.set("type", "MATERIAL");
    fetch(`/api/resources?${params}`)
      .then((r) => {
        if (r.status === 401) {
          window.location.href = "/login";
          return { resources: [] };
        }
        if (!r.ok) {
          console.error(`Failed to load resources: HTTP ${r.status}`);
          return { resources: [] };
        }
        return r.json();
      })
      .then((data) => {
        setResources(data.resources || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load resources:", err);
        setResources([]);
        setLoading(false);
      });
  }, [filter]);

  const filtered = search
    ? resources.filter((r) =>
        r.title.toLowerCase().includes(search.toLowerCase())
      )
    : resources;

  async function handleUpload() {
    if (!uploadForm.title || !uploadForm.type) return;
    if (!file) { toast.error("Please select a file to upload"); return; }
    setUploading(true);

    let fileUrl: string | null = null;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", "knowledge");
    const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
    if (!uploadRes.ok) {
      const err = await uploadRes.json().catch(() => ({}));
      toast.error(err.error || "File upload failed. Check storage configuration.");
      setUploading(false);
      return;
    }
    const uploadData = await uploadRes.json();
    fileUrl = uploadData.url;

    const res = await fetch("/api/resources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...uploadForm, fileUrl }),
    });

    if (res.ok) {
      toast.success("Resource uploaded successfully!");
      setShowUpload(false);
      setUploadForm({ title: "", description: "", type: "NOTES", university: "" });
      setFile(null);
      const params = new URLSearchParams();
      if (filter !== "All") params.set("type", filter === "Notes" ? "NOTES" : filter === "Papers" ? "PAPER" : "MATERIAL");
      const listRes = await fetch(`/api/resources?${params}`);
      const data = await listRes.json();
      setResources(data.resources || []);
    } else {
      toast.error("Failed to save resource.");
    }
    setUploading(false);
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/resources/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Resource deleted.");
      setResources((prev) => prev.filter((r) => r.id !== id));
      setMyResources((prev) => prev.filter((r) => r.id !== id));
    } else {
      toast.error("Failed to delete resource.");
    }
  }

  const loadMyResources = useCallback(async () => {
    setMyLoading(true);
    try {
      const res = await fetch(`/api/resources?author=me`);
      const data = await res.json();
      setMyResources(data.resources || []);
    } finally {
      setMyLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "mine") loadMyResources();
  }, [tab, loadMyResources]);

  async function handleRename(id: string) {
    if (!editTitle.trim()) return;
    setRenaming(true);
    try {
      const res = await fetch(`/api/resources/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle.trim() }),
      });
      if (res.ok) {
        toast.success("Name updated.");
        setMyResources((prev) => prev.map((r) => r.id === id ? { ...r, title: editTitle.trim() } : r));
        setResources((prev) => prev.map((r) => r.id === id ? { ...r, title: editTitle.trim() } : r));
        setEditingId(null);
      } else {
        toast.error("Failed to rename.");
      }
    } finally {
      setRenaming(false);
    }
  }

  function handleView(fileUrl: string | null) {
    if (!fileUrl) { toast.error("No file attached to this resource."); return; }
    window.open(fileUrl, "_blank", "noopener,noreferrer");
  }

  async function handleDownload(fileUrl: string | null, title: string, id: string) {
    if (!fileUrl) { toast.error("No file attached to this resource."); return; }
    // Increment download count in background
    fetch(`/api/resources/${id}/download`).catch(() => {});
    try {
      const res = await fetch(fileUrl);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = title;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    } catch {
      window.open(fileUrl, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold">
            Knowledge Hub
          </h1>
          <p className="text-muted-foreground mt-1">
            Upload and access notes, papers, and study materials
          </p>
        </div>
        <Button onClick={() => setShowUpload(true)}>
          <Upload className="mr-2 h-4 w-4" />
          Upload Resource
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
          Browse All
        </button>
        <button
          onClick={() => setTab("mine")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === "mine" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          My Uploads
        </button>
      </div>

      {tab === "browse" ? (
      <>
      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {["All", "Notes", "Papers", "Materials"].map((type) => (
            <Badge
              key={type}
              variant={filter === type ? "default" : "outline"}
              className="cursor-pointer hover:bg-primary/10 px-4 py-1.5"
              onClick={() => setFilter(type)}
            >
              {type}
            </Badge>
          ))}
        </div>
      </div>

      {/* Resources Grid */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">No resources found.</p>
            <Button className="mt-4" onClick={() => setShowUpload(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Upload the first one!
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((resource) => {
            const TypeIcon = typeIcons[resource.type] || FileText;
            return (
              <Card
                key={resource.id}
                className="group hover:shadow-lg hover:border-primary/30 transition-all"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className={typeColors[resource.type]}>
                      <TypeIcon className="h-3 w-3 mr-1" />
                      {resource.type.charAt(0) + resource.type.slice(1).toLowerCase()}
                    </Badge>
                    <div className="flex items-center gap-1 text-sm">
                      <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                      <span className="font-medium">{resource.rating.toFixed(1)}</span>
                    </div>
                  </div>
                  <Link href={`/knowledge/${resource.id}`}>
                    <h3 className="font-heading text-base font-semibold mt-2 group-hover:text-primary transition-colors line-clamp-2 cursor-pointer">
                      {resource.title}
                    </h3>
                  </Link>
                </CardHeader>
                <CardContent className="pb-3">
                  {resource.university && (
                    <Badge variant="secondary" className="text-xs mb-2">
                      {resource.university}
                    </Badge>
                  )}
                  <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Download className="h-3 w-3" />
                      {resource.downloads.toLocaleString()}
                    </span>
                  </div>
                </CardContent>
                <CardFooter className="pt-3 border-t">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full gap-2">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={resource.author.image || undefined} />
                        <AvatarFallback>
                          {resource.author.name?.charAt(0)?.toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-medium truncate max-w-[120px]">
                        {resource.author.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleView(resource.fileUrl)}
                        title="Open in browser"
                        disabled={!resource.fileUrl}
                      >
                        <Eye className="h-3.5 w-3.5 sm:mr-1" />
                        <span className="hidden sm:inline">View</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownload(resource.fileUrl, resource.title, resource.id)}
                        title="Download file"
                        disabled={!resource.fileUrl}
                      >
                        <Download className="h-3.5 w-3.5 sm:mr-1" />
                        <span className="hidden sm:inline">Download</span>
                      </Button>
                      {user?.id === resource.author.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(resource.id)}
                          title="Delete resource"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
      </>
      ) : (
        /* My Uploads Tab */
        myLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : myResources.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">You haven&apos;t uploaded any resources yet.</p>
              <Button className="mt-4" onClick={() => setShowUpload(true)}>
                <Upload className="mr-2 h-4 w-4" />
                Upload your first resource
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {myResources.map((resource) => {
              const TypeIcon = typeIcons[resource.type] || FileText;
              const isEditing = editingId === resource.id;
              return (
                <Card key={resource.id} className="hover:border-primary/30 transition-all">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="shrink-0">
                      <Badge variant="outline" className={typeColors[resource.type]}>
                        <TypeIcon className="h-3 w-3 mr-1" />
                        {resource.type.charAt(0) + resource.type.slice(1).toLowerCase()}
                      </Badge>
                    </div>
                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="h-8 text-sm"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleRename(resource.id);
                              if (e.key === "Escape") setEditingId(null);
                            }}
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRename(resource.id)}
                            disabled={renaming}
                          >
                            {renaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 text-emerald-500" />}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <p className="font-medium text-sm truncate">{resource.title}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          {resource.rating}
                        </span>
                        <span className="flex items-center gap-1">
                          <Download className="h-3 w-3" />
                          {resource.downloads}
                        </span>
                        {resource.university && <span>{resource.university}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {!isEditing && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => { setEditingId(resource.id); setEditTitle(resource.title); }}
                          title="Rename"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleView(resource.fileUrl)}
                        disabled={!resource.fileUrl}
                        title="View"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(resource.id)}
                        title="Delete"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )
      )}

      {/* Upload Dialog */}
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Resource</DialogTitle>
            <DialogDescription>
              Share notes, papers, or study materials with the community
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={uploadForm.title}
                onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                placeholder="e.g. Data Structures Notes - Semester 3"
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={uploadForm.type}
                onValueChange={(v) => v && setUploadForm({ ...uploadForm, type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NOTES">Notes</SelectItem>
                  <SelectItem value="PAPER">Paper</SelectItem>
                  <SelectItem value="MATERIAL">Material</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>University</Label>
              <Input
                value={uploadForm.university}
                onChange={(e) => setUploadForm({ ...uploadForm, university: e.target.value })}
                placeholder="e.g. IIT Delhi"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={uploadForm.description}
                onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                placeholder="Brief description..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>File</Label>
              <Input
                type="file"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.zip,.jpg,.jpeg,.png"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              <p className="text-xs text-muted-foreground">PDF, DOC, PPT, ZIP, or images. Max 10MB.</p>
            </div>
            <Button onClick={handleUpload} className="w-full" disabled={uploading || !uploadForm.title || !file}>
              {uploading ? "Uploading..." : "Upload"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
