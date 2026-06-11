"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  User,
  Bell,
  Copy,
  Loader2,
  Camera,
  Image as ImageIcon,
  Sparkles,
  Shield,
  Globe,
  Mail,
  AtSign,
  Briefcase,
  GraduationCap,
  Code,
  Heart,
  Pencil,
  CheckCircle2,
  ShoppingBag,
  Users,
  Plus,
  X,
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
    githubUsername: "",
    linkedinUrl: "",
    twitterUsername: "",
    portfolioUrl: "",
  });
  const [badges, setBadges] = useState<Array<{ label: string; color: string }>>([]);
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
          githubUsername: data.githubUsername || "",
          linkedinUrl: data.linkedinUrl || "",
          twitterUsername: data.twitterUsername || "",
          portfolioUrl: data.portfolioUrl || "",
        });
        setBadges(data.customBadges ? (Array.isArray(data.customBadges) ? data.customBadges : []) : []);
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
          githubUsername: form.githubUsername,
          linkedinUrl: form.linkedinUrl,
          twitterUsername: form.twitterUsername,
          portfolioUrl: form.portfolioUrl,
          customBadges: badges,
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
            githubUsername: form.githubUsername || null,
            linkedinUrl: form.linkedinUrl || null,
            twitterUsername: form.twitterUsername || null,
            portfolioUrl: form.portfolioUrl || null,
            customBadges: badges,
          });
        }
        
        toast({
          title: "✨ Profile Updated!",
          description: "Your changes have been saved successfully.",
          className: "bg-green-500/10 border-green-500/50 text-green-500",
        });
      } else {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save");
      }
    } catch (error) {
      toast({
        title: "❌ Error",
        description: error instanceof Error ? error.message : "Failed to save changes. Please try again.",
        variant: "destructive",
        className: "bg-red-500/10 border-red-500/50",
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
        title: "⚠️ Invalid file",
        description: "Please select an image file.",
        variant: "destructive",
        className: "bg-yellow-500/10 border-yellow-500/50",
      });
      return;
    }

    // Validate file size (10MB for high-res PNG)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "⚠️ File too large",
        description: "Image must be less than 10MB.",
        variant: "destructive",
        className: "bg-yellow-500/10 border-yellow-500/50",
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
          
          // Auto-close dialog
          setCropDialogOpen(false);
          setSelectedImage(null);
          
          toast({
            title: "✨ Image Uploaded!",
            description: "Profile photo updated successfully.",
            className: "bg-green-500/10 border-green-500/50 text-green-500",
          });
          // Refresh the router to update all pages with new image
          router.refresh();
        }
      } else {
        throw new Error("Upload failed");
      }
    } catch {
      toast({
        title: "❌ Upload failed",
        description: "Failed to upload image. Please try again.",
        variant: "destructive",
        className: "bg-red-500/10 border-red-500/50",
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
        title: "⚠️ Invalid file",
        description: "Please select an image file.",
        variant: "destructive",
        className: "bg-yellow-500/10 border-yellow-500/50",
      });
      return;
    }

    // Increased to 10MB for cover images (higher resolution)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "⚠️ File too large",
        description: "Cover image must be less than 10MB.",
        variant: "destructive",
        className: "bg-yellow-500/10 border-yellow-500/50",
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
      
      // Auto-close dialog
      setCoverCropDialogOpen(false);
      setSelectedCoverImage(null);
      
      toast({
        title: "✨ Image Uploaded!",
        description: "Cover image updated successfully.",
        className: "bg-green-500/10 border-green-500/50 text-green-500",
      });
      // Refresh the router to update all pages with new cover image
      router.refresh();
    } catch (error) {
      console.error("Cover upload error:", error);
      toast({
        title: "❌ Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload cover image. Please try again.",
        variant: "destructive",
        className: "bg-red-500/10 border-red-500/50",
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
      <div className="max-w-5xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-6"
        >
          <div className="h-8 w-48 bg-muted animate-shimmer rounded" />
          <div className="h-96 bg-muted animate-shimmer rounded-2xl" />
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-5xl mx-auto space-y-6"
    >
      {/* Modern Header with Gradient */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-background border border-primary/20 p-6 sm:p-8"
      >
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl md:text-4xl font-bold flex items-center gap-3">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              >
                <Sparkles className="h-8 w-8 text-primary" />
              </motion.div>
              Settings
            </h1>
            <p className="text-muted-foreground mt-2">
              Customize your profile and preferences
            </p>
          </div>
          {profile?.uid && (
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Badge
                variant="secondary"
                className="text-lg px-4 py-2 cursor-pointer gap-2 bg-background/50 backdrop-blur-sm hover:bg-background/80 transition-colors"
                onClick={copyUid}
              >
                <AtSign className="h-4 w-4" />
                {profile.uid}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={copied ? { scale: 1 } : { scale: 0 }}
                >
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                </motion.div>
                {!copied && <Copy className="h-4 w-4" />}
              </Badge>
            </motion.div>
          )}
        </div>
        {/* Decorative gradient orbs */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl" />
      </motion.div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="w-full sm:w-auto grid grid-cols-4 h-auto p-1 bg-muted/50 backdrop-blur-sm">
          <TabsTrigger
            value="profile"
            className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-lg transition-all py-3"
          >
            <User className="h-4 w-4" />
            <span className="font-medium">Profile</span>
          </TabsTrigger>
          <TabsTrigger
            value="social"
            className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-lg transition-all py-3"
          >
            <Globe className="h-4 w-4" />
            <span className="font-medium">Social</span>
          </TabsTrigger>
          <TabsTrigger
            value="badges"
            className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-lg transition-all py-3"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span className="font-medium">Badges</span>
          </TabsTrigger>
          <TabsTrigger
            value="notifications"
            className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-lg transition-all py-3"
          >
            <Bell className="h-4 w-4" />
            <span className="font-medium">Notifications</span>
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          {/* Cover Image Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="overflow-hidden border-2 hover:border-primary/30 transition-all">
              <div className="relative">
                {/* Cover Image */}
                <div className="relative h-48 sm:h-56 bg-gradient-to-br from-primary/20 via-purple-500/10 to-background overflow-hidden">
                  {profile?.coverImage ? (
                    <img
                      src={profile.coverImage}
                      alt="Cover"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center text-muted-foreground">
                        <ImageIcon className="mx-auto h-12 w-12 mb-2 opacity-50" />
                        <p className="text-sm">Add a cover image</p>
                      </div>
                    </div>
                  )}
                  {/* Cover Upload Button */}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => coverFileInputRef.current?.click()}
                    className="absolute bottom-4 right-4 bg-background/90 backdrop-blur-sm border border-border rounded-full p-3 hover:bg-background transition-colors shadow-lg"
                    disabled={uploadingCover}
                  >
                    {uploadingCover ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Camera className="h-5 w-5" />
                    )}
                  </motion.button>
                </div>
                
                {/* Avatar Overlapping Cover */}
                <div className="absolute -bottom-16 left-6 sm:left-8">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="relative"
                  >
                    <Avatar className="h-28 w-28 sm:h-32 sm:w-32 border-4 border-background shadow-2xl ring-2 ring-primary/20">
                      <AvatarImage src={profile?.image || undefined} />
                      <AvatarFallback className="text-3xl font-bold bg-gradient-to-br from-primary to-purple-600 text-white">
                        {profile?.name?.charAt(0)?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-2.5 shadow-lg hover:bg-primary/90 transition-colors"
                      disabled={uploading}
                    >
                      {uploading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Camera className="h-4 w-4" />
                      )}
                    </motion.button>
                  </motion.div>
                </div>
              </div>
              
              <CardContent className="pt-20 pb-6 space-y-6">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <input
                  ref={coverFileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  className="hidden"
                  onChange={handleCoverFileSelect}
                />

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

                {/* Form Fields with Modern Icons */}
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="name" className="flex items-center gap-2 text-sm font-medium">
                      <User className="h-4 w-4 text-primary" />
                      Full Name
                    </Label>
                    <Input
                      id="name"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="h-11 border-2 focus:border-primary transition-colors"
                      placeholder="Enter your full name"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="username" className="flex items-center gap-2 text-sm font-medium">
                      <AtSign className="h-4 w-4 text-primary" />
                      Username
                    </Label>
                    <Input
                      id="username"
                      placeholder="your-username"
                      value={form.username}
                      onChange={(e) => setForm({ ...form, username: e.target.value })}
                      className="h-11 border-2 focus:border-primary transition-colors"
                    />
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Globe className="h-3 w-3" />
                      /u/{form.username || "username"}
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email" className="flex items-center gap-2 text-sm font-medium">
                      <Mail className="h-4 w-4 text-primary" />
                      Email
                    </Label>
                    <div className="relative">
                      <Input
                        id="email"
                        value={profile?.email || ""}
                        disabled
                        className="h-11 border-2 opacity-60"
                      />
                      <Shield className="absolute right-3 top-3 h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="headline" className="flex items-center gap-2 text-sm font-medium">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Headline
                  </Label>
                  <Input
                    id="headline"
                    placeholder="Computer Science Student · Full Stack Developer"
                    maxLength={120}
                    value={form.headline}
                    onChange={(e) => setForm({ ...form, headline: e.target.value })}
                    className="h-11 border-2 focus:border-primary transition-colors"
                  />
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="university" className="flex items-center gap-2 text-sm font-medium">
                      <GraduationCap className="h-4 w-4 text-primary" />
                      University
                    </Label>
                    <Input
                      id="university"
                      placeholder="e.g. IIT Delhi"
                      value={form.university}
                      onChange={(e) => setForm({ ...form, university: e.target.value })}
                      className="h-11 border-2 focus:border-primary transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role" className="flex items-center gap-2 text-sm font-medium">
                      <Briefcase className="h-4 w-4 text-primary" />
                      Role
                    </Label>
                    <Select
                      value={form.role}
                      onValueChange={(v) => v && setForm({ ...form, role: v })}
                    >
                      <SelectTrigger className="h-11 border-2">
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

                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="skills" className="flex items-center gap-2 text-sm font-medium">
                      <Code className="h-4 w-4 text-primary" />
                      Skills
                    </Label>
                    <Textarea
                      id="skills"
                      placeholder="Python, JavaScript, React, AWS"
                      value={form.skillsText}
                      onChange={(e) => setForm({ ...form, skillsText: e.target.value })}
                      rows={3}
                      className="border-2 focus:border-primary transition-colors resize-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="interests" className="flex items-center gap-2 text-sm font-medium">
                      <Heart className="h-4 w-4 text-primary" />
                      Interests
                    </Label>
                    <Textarea
                      id="interests"
                      placeholder="AI, Cloud, Startups, Hackathons"
                      value={form.interestsText}
                      onChange={(e) => setForm({ ...form, interestsText: e.target.value })}
                      rows={3}
                      className="border-2 focus:border-primary transition-colors resize-none"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio" className="flex items-center gap-2 text-sm font-medium">
                    <Pencil className="h-4 w-4 text-primary" />
                    Bio
                  </Label>
                  <Textarea
                    id="bio"
                    placeholder="Tell us about yourself, your interests, and what you're working on..."
                    maxLength={500}
                    value={form.bio}
                    onChange={(e) => setForm({ ...form, bio: e.target.value })}
                    rows={4}
                    className="border-2 focus:border-primary transition-colors resize-none"
                  />
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span>Share your story with the community</span>
                    <span className="font-mono">{form.bio.length}/500</span>
                  </div>
                </div>

                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="pt-4"
                >
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full h-12 text-base font-semibold shadow-lg hover:shadow-xl transition-all"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Saving Changes...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-5 w-5" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Social Links Tab */}
        <TabsContent value="social" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-2 hover:border-primary/30 transition-all">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-primary" />
                  Social Links
                </CardTitle>
                <CardDescription>
                  Connect your social profiles
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="github" className="flex items-center gap-2 text-sm font-medium">
                    <Code className="h-4 w-4 text-primary" />
                    GitHub Username
                  </Label>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">github.com/</span>
                    <Input
                      id="github"
                      value={form.githubUsername}
                      onChange={(e) => setForm({ ...form, githubUsername: e.target.value.replace(/[^a-zA-Z0-9-]/g, "") })}
                      className="h-11 border-2 focus:border-primary transition-colors"
                      placeholder="username"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="linkedin" className="flex items-center gap-2 text-sm font-medium">
                    <Briefcase className="h-4 w-4 text-primary" />
                    LinkedIn URL
                  </Label>
                  <Input
                    id="linkedin"
                    type="url"
                    value={form.linkedinUrl}
                    onChange={(e) => setForm({ ...form, linkedinUrl: e.target.value })}
                    className="h-11 border-2 focus:border-primary transition-colors"
                    placeholder="https://linkedin.com/in/yourprofile"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="twitter" className="flex items-center gap-2 text-sm font-medium">
                    <AtSign className="h-4 w-4 text-primary" />
                    Twitter/X Username
                  </Label>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">@</span>
                    <Input
                      id="twitter"
                      value={form.twitterUsername}
                      onChange={(e) => setForm({ ...form, twitterUsername: e.target.value.replace(/[^a-zA-Z0-9_]/g, "") })}
                      className="h-11 border-2 focus:border-primary transition-colors"
                      placeholder="username"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="portfolio" className="flex items-center gap-2 text-sm font-medium">
                    <Globe className="h-4 w-4 text-primary" />
                    Portfolio Website
                  </Label>
                  <Input
                    id="portfolio"
                    type="url"
                    value={form.portfolioUrl}
                    onChange={(e) => setForm({ ...form, portfolioUrl: e.target.value })}
                    className="h-11 border-2 focus:border-primary transition-colors"
                    placeholder="https://yourwebsite.com"
                  />
                </div>

                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="pt-4"
                >
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full h-12 text-base font-semibold shadow-lg hover:shadow-xl transition-all"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Saving Changes...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-5 w-5" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Badges Tab */}
        <TabsContent value="badges" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-2 hover:border-primary/30 transition-all">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                      Custom Role Badges
                    </CardTitle>
                    <CardDescription>
                      Add up to 4 badges to highlight your roles (max 4)
                    </CardDescription>
                  </div>
                  <Button
                    type="button"
                    onClick={() => {
                      if (badges.length >= 4) {
                        toast({
                          title: "⚠️ Maximum reached",
                          description: "You can only add up to 4 badges.",
                          variant: "destructive",
                          className: "bg-yellow-500/10 border-yellow-500/50",
                        });
                        return;
                      }
                      setBadges([...badges, { label: "New Badge", color: "purple" }]);
                    }}
                    disabled={badges.length >= 4}
                    variant="outline"
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Badge
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {badges.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No badges added yet</p>
                    <p className="text-sm">Click &ldquo;Add Badge&rdquo; to create your first badge</p>
                  </div>
                ) : (
                  badges.map((badge, index) => (
                    <div key={index} className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                      <Input
                        value={badge.label}
                        onChange={(e) => {
                          const updated = [...badges];
                          updated[index] = { ...updated[index], label: e.target.value };
                          setBadges(updated);
                        }}
                        className="flex-1 h-10 border-2 focus:border-primary"
                        placeholder="Badge label"
                        maxLength={20}
                      />
                      <Select
                        value={badge.color}
                        onValueChange={(v) => {
                          if (!v) return;
                          const updated = [...badges];
                          updated[index] = { ...updated[index], color: v };
                          setBadges(updated);
                        }}
                      >
                        <SelectTrigger className="w-32 h-10 border-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="purple">Purple</SelectItem>
                          <SelectItem value="blue">Blue</SelectItem>
                          <SelectItem value="green">Green</SelectItem>
                          <SelectItem value="yellow">Yellow</SelectItem>
                          <SelectItem value="red">Red</SelectItem>
                          <SelectItem value="pink">Pink</SelectItem>
                          <SelectItem value="indigo">Indigo</SelectItem>
                        </SelectContent>
                      </Select>
                      <Badge
                        className={`${
                          badge.color === "purple" ? "bg-purple-500/20 text-purple-400 border-purple-500/30" :
                          badge.color === "blue" ? "bg-blue-500/20 text-blue-400 border-blue-500/30" :
                          badge.color === "green" ? "bg-green-500/20 text-green-400 border-green-500/30" :
                          badge.color === "yellow" ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" :
                          badge.color === "red" ? "bg-red-500/20 text-red-400 border-red-500/30" :
                          badge.color === "pink" ? "bg-pink-500/20 text-pink-400 border-pink-500/30" :
                          "bg-indigo-500/20 text-indigo-400 border-indigo-500/30"
                        } border`}
                      >
                        {badge.label || "Badge"}
                      </Badge>
                      <Button
                        type="button"
                        onClick={() => setBadges(badges.filter((_, i) => i !== index))}
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 text-muted-foreground hover:text-red-400"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}

                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="pt-4"
                >
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full h-12 text-base font-semibold shadow-lg hover:shadow-xl transition-all"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Saving Changes...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-5 w-5" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-2 hover:border-primary/30 transition-all">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-primary" />
                  Notification Preferences
                </CardTitle>
                <CardDescription>
                  Choose what notifications you want to receive
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {[
                  {
                    title: "Team Invitations",
                    desc: "Get notified when someone invites you to a project",
                    icon: Users,
                  },
                  {
                    title: "Project Updates",
                    desc: "Activity in your projects (tasks, milestones)",
                    icon: Briefcase,
                  },
                  {
                    title: "Messages",
                    desc: "New direct messages and group messages",
                    icon: Mail,
                  },
                  {
                    title: "Knowledge Hub",
                    desc: "When your resources are downloaded or rated",
                    icon: GraduationCap,
                  },
                  {
                    title: "Marketplace",
                    desc: "When someone is interested in your listings",
                    icon: ShoppingBag,
                  },
                ].map((item, idx) => (
                  <motion.div
                    key={item.title}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + idx * 0.05 }}
                    className="flex items-start justify-between gap-4 p-4 rounded-lg border-2 border-transparent hover:border-primary/20 hover:bg-accent/50 transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1 p-2 rounded-lg bg-primary/10">
                        <item.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{item.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {item.desc}
                        </p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        defaultChecked
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary shadow-inner"></div>
                    </label>
                  </motion.div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
