"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Bell,
  Copy,
  Check,
  Upload,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImageCropDialog } from "@/components/image-crop-dialog";
import { CoverCropDialog } from "@/components/cover-crop-dialog";
import { useToast } from "@/hooks/use-toast";
import { broadcastProfileUpdate } from "@/hooks/use-profile-sync";

interface UserProfile {
  id: string;
  uid: string | null;
  username: string | null;
  name: string;
  email: string;
  image: string | null;
  coverImage: string | null;
  headline: string | null;
  bio: string | null;
  university: string | null;
  role: string;
  skills: string[];
  interests: string[];
}

export default function SettingsPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [copied, setCopied] = useState(false);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [coverCropDialogOpen, setCoverCropDialogOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedCoverImage, setSelectedCoverImage] = useState<string | null>(null);
  const [form, setForm] = useState({
    username: "",
    name: "",
    headline: "",
    bio: "",
    university: "",
    role: "MEMBER",
    skillsText: "",
    interestsText: "",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/user/me")
      .then((r) => r.json())
      .then((data) => {
        setProfile(data);
        setForm({
          username: data.username || "",
          name: data.name || "",
          headline: data.headline || "",
          bio: data.bio || "",
          university: data.university || "",
          role: data.role || "MEMBER",
          skillsText: (data.skills || []).join(", "),
          interestsText: (data.interests || []).join(", "),
        });
        setLoading(false);
      });
  }, []);

  function parseTags(value: string) {
    return Array.from(
      new Set(
        value
          .split(/[,\n]/)
          .map((item) => item.trim())
          .filter(Boolean)
      )
    ).slice(0, 20);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/user/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: form.username,
          name: form.name,
          headline: form.headline,
          bio: form.bio,
          university: form.university,
          role: form.role,
          skills: parseTags(form.skillsText),
          interests: parseTags(form.interestsText),
        }),
      });
      
      if (res.ok) {
        const updated = await res.json();
        const skills = parseTags(form.skillsText);
        const interests = parseTags(form.interestsText);
        
        setProfile((current) =>
          current
            ? {
                ...current,
                ...updated,
                skills,
                interests,
              }
            : current
        );
        
        // Broadcast profile update for real-time sync
        if (profile?.id) {
          broadcastProfileUpdate(profile.id, {
            name: form.name,
            headline: form.headline || null,
            bio: form.bio || null,
            username: form.username || null,
            university: form.university || null,
            skills,
            interests,
          });
        }
        
        toast({
          title: "Success!",
          description: "Your profile has been updated.",
        });
      } else {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save changes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file",
        description: "Please select an image file.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (10MB for high-res PNG)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Image must be less than 10MB.",
        variant: "destructive",
      });
      return;
    }

    // Read file and open crop dialog
    const reader = new FileReader();
    reader.onload = (e) => {
      setSelectedImage(e.target?.result as string);
      setCropDialogOpen(true);
    };
    reader.readAsDataURL(file);
  }

  async function handleCropComplete(croppedBlob: Blob) {
    setUploading(true);
    try {
      const formData = new FormData();
      // Use .png extension for circular images with transparency
      formData.append("file", croppedBlob, "avatar.png");
      formData.append("type", "avatar");
      
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      
      if (res.ok) {
        const { url } = await res.json();
        
        // Update user profile with new image
        const updateRes = await fetch("/api/user/me", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: url }),
        });
        
        if (updateRes.ok) {
          setProfile((p) => (p ? { ...p, image: url } : p));
          
          // Broadcast profile image update for real-time sync
          if (profile?.id) {
            broadcastProfileUpdate(profile.id, { image: url });
          }
          
          toast({
            title: "Success!",
            description: "Profile photo updated successfully.",
          });
          // Refresh the router to update all pages with new image
          router.refresh();
        }
      } else {
        throw new Error("Upload failed");
      }
    } catch {
      toast({
        title: "Upload failed",
        description: "Failed to upload image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function handleCoverFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file",
        description: "Please select an image file.",
        variant: "destructive",
      });
      return;
    }

    // Increased to 10MB for cover images (higher resolution)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Cover image must be less than 10MB.",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setSelectedCoverImage(e.target?.result as string);
      setCoverCropDialogOpen(true);
    };
    reader.readAsDataURL(file);
  }

  async function handleCoverCropComplete(croppedBlob: Blob) {
    setUploadingCover(true);
    try {
      const formData = new FormData();
      formData.append("file", croppedBlob, "cover.jpg");
      formData.append("type", "avatar");
      
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(errorData.error || "Upload failed");
      }
      
      const { url } = await res.json();
      
      const updateRes = await fetch("/api/user/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coverImage: url }),
      });
      
      if (!updateRes.ok) {
        const errorData = await updateRes.json().catch(() => ({ error: "Failed to update profile" }));
        throw new Error(errorData.error || "Failed to update profile");
      }
      
      setProfile((p) => (p ? { ...p, coverImage: url } : p));
      
      // Broadcast cover image update for real-time sync
      if (profile?.id) {
        broadcastProfileUpdate(profile.id, { coverImage: url });
      }
      
      toast({
        title: "Success!",
        description: "Cover image updated successfully.",
      });
      // Refresh the router to update all pages with new cover image
      router.refresh();
    } catch (error) {
      console.error("Cover upload error:", error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload cover image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploadingCover(false);
      if (coverFileInputRef.current) {
        coverFileInputRef.current.value = "";
      }
    }
  }

  function copyUid() {
    if (profile?.uid) {
      navigator.clipboard.writeText(profile.uid);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-64 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold">
            Settings
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your account and preferences
          </p>
        </div>
        {profile?.uid && (
          <Badge
            variant="secondary"
            className="text-base px-3 py-1 cursor-pointer gap-2"
            onClick={copyUid}
          >
            #{profile.uid}
            {copied ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </Badge>
        )}
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your personal details and public profile
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Cover Image Upload */}
              <div className="space-y-3">
                <Label>Cover Image</Label>
                <div className="relative overflow-hidden rounded-lg border bg-muted h-32 sm:h-40">
                  {profile?.coverImage ? (
                    <img
                      src={profile.coverImage}
                      alt="Cover"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      <div className="text-center">
                        <Upload className="mx-auto h-8 w-8 mb-2" />
                        <p className="text-sm">No cover image</p>
                      </div>
                    </div>
                  )}
                </div>
                <input
                  ref={coverFileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  className="hidden"
                  onChange={handleCoverFileSelect}
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => coverFileInputRef.current?.click()}
                    disabled={uploadingCover}
                  >
                    {uploadingCover ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        {profile?.coverImage ? "Change Cover" : "Upload Cover"}
                      </>
                    )}
                  </Button>
                  {profile?.coverImage && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        const res = await fetch("/api/user/me", {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ coverImage: null }),
                        });
                        if (res.ok) {
                          setProfile((p) => (p ? { ...p, coverImage: null } : p));
                          toast({ title: "Cover image removed" });
                        }
                      }}
                    >
                      Remove
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Recommended: 1200x400px. JPG, PNG or GIF. Max 10MB.
                </p>
              </div>

              {/* Profile Photo Upload */}
              <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                <Avatar className="h-20 w-20 border-2 border-primary/20">
                  <AvatarImage src={profile?.image || undefined} />
                  <AvatarFallback className="text-2xl">
                    {profile?.name?.charAt(0)?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Change Photo
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">
                    JPG, PNG or GIF. Max 10MB.
                  </p>
                </div>
              </div>

              {/* Image Crop Dialogs */}
              {selectedImage && (
                <ImageCropDialog
                  open={cropDialogOpen}
                  onClose={() => {
                    setCropDialogOpen(false);
                    setSelectedImage(null);
                  }}
                  imageSrc={selectedImage}
                  onCropComplete={handleCropComplete}
                />
              )}
              
              {selectedCoverImage && (
                <CoverCropDialog
                  open={coverCropDialogOpen}
                  onClose={() => {
                    setCoverCropDialogOpen(false);
                    setSelectedCoverImage(null);
                  }}
                  imageSrc={selectedCoverImage}
                  onCropComplete={handleCoverCropComplete}
                />
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    placeholder="asimsaad"
                    value={form.username}
                    onChange={(e) =>
                      setForm({ ...form, username: e.target.value })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Your public link is /u/{form.username || "username"}.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) =>
                      setForm({ ...form, name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    value={profile?.email || ""}
                    disabled
                    className="opacity-60"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="headline">Headline</Label>
                  <Input
                    id="headline"
                    placeholder="CSE Student · Building Ruhiz"
                    maxLength={120}
                    value={form.headline}
                    onChange={(e) =>
                      setForm({ ...form, headline: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="university">University</Label>
                  <Input
                    id="university"
                    placeholder="e.g. IIT Delhi"
                    value={form.university}
                    onChange={(e) =>
                      setForm({ ...form, university: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={form.role}
                    onValueChange={(v) => v && setForm({ ...form, role: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MEMBER">Student / Team Member</SelectItem>
                      <SelectItem value="LEADER">Project Leader</SelectItem>
                      <SelectItem value="BOTH">Both</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="skills">Skills</Label>
                  <Textarea
                    id="skills"
                    placeholder="Python, JavaScript, React, AWS"
                    value={form.skillsText}
                    onChange={(e) =>
                      setForm({ ...form, skillsText: e.target.value })
                    }
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="interests">Interests</Label>
                  <Textarea
                    id="interests"
                    placeholder="AI, Cloud, Startups, Hackathons"
                    value={form.interestsText}
                    onChange={(e) =>
                      setForm({ ...form, interestsText: e.target.value })
                    }
                    rows={3}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  placeholder="Tell us about yourself..."
                  maxLength={500}
                  value={form.bio}
                  onChange={(e) =>
                    setForm({ ...form, bio: e.target.value })
                  }
                  rows={4}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {form.bio.length}/500
                </p>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={saving} className="mobile-primary-action">
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Choose what notifications you want to receive
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                {
                  title: "Team Invitations",
                  desc: "Get notified when someone invites you to a project",
                },
                {
                  title: "Project Updates",
                  desc: "Activity in your projects (tasks, milestones)",
                },
                {
                  title: "Messages",
                  desc: "New direct messages and group messages",
                },
                {
                  title: "Knowledge Hub",
                  desc: "When your resources are downloaded or rated",
                },
                {
                  title: "Marketplace",
                  desc: "When someone is interested in your listings",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="flex items-start justify-between gap-4 py-2"
                >
                  <div>
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.desc}
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      defaultChecked
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
