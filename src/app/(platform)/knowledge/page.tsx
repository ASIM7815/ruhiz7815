"use client";

import { useEffect, useState } from "react";
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
import { useSession } from "next-auth/react";

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
  const { data: session } = useSession();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
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
      .then((r) => r.json())
      .then((data) => {
        setResources(data.resources || []);
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
    formData.append("type", "note");
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
    } else {
      toast.error("Failed to delete resource.");
    }
  }

  async function getFileUrl(id: string): Promise<string | null> {
    const res = await fetch(`/api/resources/${id}/download`);
    if (!res.ok) return null;
    const { url } = await res.json();
    return url || null;
  }

  async function handleView(id: string) {
    const url = await getFileUrl(id);
    if (!url) { toast.error("No file attached to this resource."); return; }
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function handleDownload(id: string, title: string) {
    const url = await getFileUrl(id);
    if (!url) { toast.error("No file attached to this resource."); return; }
    try {
      const res = await fetch(url);
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
      window.open(url, "_blank", "noopener,noreferrer");
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
                      <span className="font-medium">{resource.rating}</span>
                    </div>
                  </div>
                  <h3 className="font-heading text-base font-semibold mt-2 group-hover:text-primary transition-colors line-clamp-2">
                    {resource.title}
                  </h3>
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
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={resource.author.image || ""} />
                        <AvatarFallback>
                          {resource.author.name?.charAt(0)?.toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-medium">
                        {resource.author.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleView(resource.id)}
                        title="Open in browser"
                        disabled={!resource.fileUrl}
                      >
                        <Eye className="mr-1 h-3 w-3" />
                        View
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownload(resource.id, resource.title)}
                        title="Download file"
                        disabled={!resource.fileUrl}
                      >
                        <Download className="mr-1 h-3 w-3" />
                        Download
                      </Button>
                      {session?.user?.id === resource.author.id && (
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
            <Button onClick={handleUpload} className="w-full" disabled={uploading || !uploadForm.title}>
              {uploading ? "Uploading..." : "Upload"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
