"use client";

import { useEffect, useState, useCallback } from "react";
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
  const [uploadProgress, setUploadProgress] = useState<string>("");
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
  const [multipleFiles, setMultipleFiles] = useState<Array<{ file: File; subject: string; id: string }>>([]);
  const [uploadMode, setUploadMode] = useState<"single" | "multiple">("single");

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
    if (!uploadForm.type || !uploadForm.university) {
      toast.error("Please select type and university");
      return;
    }
    
    // Check if using multiple files mode
    if (uploadMode === "multiple") {
      await handleMultipleUpload();
      return;
    }
    
    // Single file upload (existing logic)
    if (!uploadForm.title || !file) {
      toast.error("Please provide title and select a file");
      return;
    }
    
    setUploading(true);
    setUploadProgress("Uploading file...");

    let fileUrl: string | null = null;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", "knowledge");
    const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
    if (!uploadRes.ok) {
      const err = await uploadRes.json().catch(() => ({}));
      toast.error(err.error || "File upload failed. Check storage configuration.");
      setUploading(false);
      setUploadProgress("");
      return;
    }
    const uploadData = await uploadRes.json();
    fileUrl = uploadData.url;

    setUploadProgress("Saving resource...");

    const res = await fetch("/api/resources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...uploadForm, fileUrl }),
    });

    if (res.ok) {
      setUploadProgress("Upload successful!");
      toast.success("Resource uploaded successfully!");
      
      // Small delay to show success message
      await new Promise(resolve => setTimeout(resolve, 800));
      
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
    setUploadProgress("");
  }

  async function handleMultipleUpload() {
    if (multipleFiles.length === 0) {
      toast.error("Please add files to upload");
      return;
    }

    // Validate all files have subjects
    const missingSubjects = multipleFiles.filter(f => !f.subject.trim());
    if (missingSubjects.length > 0) {
      toast.error("Please provide subject names for all files");
      return;
    }

    setUploading(true);
    setUploadProgress(`Uploading ${multipleFiles.length} file(s)...`);

    try {
      // Upload files with progress tracking
      const uploadPromises = multipleFiles.map(async (fileItem, index) => {
        // Upload file to storage
        const formData = new FormData();
        formData.append("file", fileItem.file);
        formData.append("type", "knowledge");
        
        const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
        if (!uploadRes.ok) {
          throw new Error(`Failed to upload ${fileItem.file.name}`);
        }
        const uploadData = await uploadRes.json();
        
        // Update progress
        setUploadProgress(`Uploaded ${index + 1} of ${multipleFiles.length} files...`);
        
        return {
          title: fileItem.subject,
          description: uploadForm.description || null,
          type: uploadForm.type,
          fileUrl: uploadData.url,
          university: uploadForm.university || null,
        };
      });

      const uploadedFiles = await Promise.all(uploadPromises);

      setUploadProgress("Saving resources...");

      // Batch create resources
      const res = await fetch("/api/resources/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resources: uploadedFiles }),
      });

      if (res.ok) {
        const data = await res.json();
        setUploadProgress("Upload successful!");
        toast.success(`${data.count} resources uploaded successfully!`);
        
        // Small delay to show success message
        await new Promise(resolve => setTimeout(resolve, 800));
        
        setShowUpload(false);
        setUploadForm({ title: "", description: "", type: "NOTES", university: "" });
        setFile(null);
        setMultipleFiles([]);
        setUploadMode("single");
        
        // Refresh list
        const params = new URLSearchParams();
        if (filter !== "All") params.set("type", filter === "Notes" ? "NOTES" : filter === "Papers" ? "PAPER" : "MATERIAL");
        const listRes = await fetch(`/api/resources?${params}`);
        const listData = await listRes.json();
        setResources(listData.resources || []);
      } else {
        toast.error("Failed to save resources.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
      setUploadProgress("");
    }
  }

  function handleMultipleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles = Array.from(files).map((file) => ({
      file,
      subject: "",
      id: Math.random().toString(36).substring(7),
    }));

    setMultipleFiles((prev) => [...prev, ...newFiles]);
  }

  function removeMultipleFile(id: string) {
    setMultipleFiles((prev) => prev.filter((f) => f.id !== id));
  }

  function updateFileSubject(id: string, subject: string) {
    setMultipleFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, subject } : f))
    );
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
        <Button onClick={() => setShowUpload(true)} className="mobile-primary-action">
          <Upload className="mr-2 h-4 w-4" />
          Upload Resource
        </Button>
      </div>

      {/* Tabs */}
      <div className="mobile-tabs">
        <button
          onClick={() => setTab("browse")}
          className={`mobile-tab-button ${
            tab === "browse" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Browse All
        </button>
        <button
          onClick={() => setTab("mine")}
          className={`mobile-tab-button ${
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
        <div className="mobile-filter-scroll sm:justify-end">
          {["All", "Notes", "Papers", "Materials"].map((type) => (
            <Badge
              key={type}
              variant={filter === type ? "default" : "outline"}
              className="mobile-chip hover:bg-primary/10"
              onClick={() => setFilter(type)}
            >
              {type}
            </Badge>
          ))}
        </div>
      </div>

      {/* Resources Grid */}
      {loading ? (
        <div className="mobile-card-grid">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="mobile-empty-card">
            <p className="text-muted-foreground">No resources found.</p>
            <Button className="mt-4 mobile-primary-action" onClick={() => setShowUpload(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Upload the first one!
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="mobile-card-grid">
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
                        className="min-h-9"
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
                        className="min-h-9"
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
                          className="min-h-9 text-destructive hover:text-destructive"
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
          <div className="mobile-card-grid">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : myResources.length === 0 ? (
          <Card>
            <CardContent className="mobile-empty-card">
              <p className="text-muted-foreground">You haven&apos;t uploaded any resources yet.</p>
              <Button className="mt-4 mobile-primary-action" onClick={() => setShowUpload(true)}>
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
                  <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4">
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
                    <div className="flex w-full items-center justify-end gap-1 sm:w-auto sm:shrink-0">
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
        <DialogContent className="max-h-[90dvh] overflow-y-auto max-w-2xl">
          <DialogHeader>
            <DialogTitle>Upload Resource(s)</DialogTitle>
            <DialogDescription>
              Share notes, papers, or study materials with the community. Upload single or multiple files.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Common fields */}
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
              <Label>Description (Optional)</Label>
              <Textarea
                value={uploadForm.description}
                onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                placeholder="Brief description..."
                rows={2}
              />
            </div>

            {/* Upload mode selection */}
            <div className="border-t pt-4">
              <div className="flex items-center gap-4 mb-3">
                <Badge
                  variant={uploadMode === "single" ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => {
                    setUploadMode("single");
                    setMultipleFiles([]);
                    setFile(null);
                  }}
                >
                  Single File
                </Badge>
                <Badge
                  variant={uploadMode === "multiple" ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => {
                    setUploadMode("multiple");
                    setFile(null);
                    setUploadForm({ ...uploadForm, title: "" });
                  }}
                >
                  Multiple Files
                </Badge>
              </div>

              {uploadMode === "single" ? (
                // Single file mode
                <>
                  <div className="space-y-2 mb-4">
                    <Label>Title</Label>
                    <Input
                      value={uploadForm.title}
                      onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                      placeholder="e.g. Data Structures Notes - Semester 3"
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
                </>
              ) : (
                // Multiple files mode
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Add PDF Files</Label>
                    <Input
                      type="file"
                      accept=".pdf"
                      multiple
                      onChange={handleMultipleFileSelect}
                    />
                    <p className="text-xs text-muted-foreground">Select multiple PDF files. Max 10MB each.</p>
                  </div>

                  {multipleFiles.length > 0 && (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto border rounded-lg p-3">
                      <Label className="text-sm font-medium">Files to Upload ({multipleFiles.length})</Label>
                      {multipleFiles.map((fileItem) => (
                        <div key={fileItem.id} className="flex items-start gap-2 p-2 bg-muted/50 rounded">
                          <FileText className="h-4 w-4 mt-1 shrink-0 text-muted-foreground" />
                          <div className="flex-1 min-w-0 space-y-1.5">
                            <p className="text-sm font-medium truncate">{fileItem.file.name}</p>
                            <Input
                              placeholder="Subject name (e.g., Data Structures)"
                              value={fileItem.subject}
                              onChange={(e) => updateFileSubject(fileItem.id, e.target.value)}
                              className="h-8 text-sm"
                            />
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeMultipleFile(fileItem.id)}
                            className="shrink-0"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <Button 
              onClick={handleUpload} 
              className="w-full" 
              disabled={
                uploading || 
                !uploadForm.type || 
                (uploadMode === "single" && (!uploadForm.title || !file)) ||
                (uploadMode === "multiple" && (multipleFiles.length === 0 || multipleFiles.some(f => !f.subject.trim())))
              }
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {uploadProgress || "Uploading..."}
                </>
              ) : (
                uploadMode === "multiple" && multipleFiles.length > 0
                  ? `Upload ${multipleFiles.length} File${multipleFiles.length > 1 ? 's' : ''}`
                  : 'Upload'
              )}
            </Button>

            {/* Upload Progress Indicator */}
            {uploading && (
              <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-blue-600 dark:text-blue-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      {uploadProgress || "Processing..."}
                    </p>
                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
                      Please wait, this may take a moment
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
