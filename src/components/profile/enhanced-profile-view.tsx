"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Star,
  Users,
  Folder,
  BookOpen,
  UserPlus,
  Share2,
  MoreHorizontal,
  Award,
  TrendingUp,
  Calendar,
  CheckCircle2,
  Circle,
  Flame,
  ExternalLink,
  Link2,
} from "lucide-react";

type ProfileData = {
  id: string;
  uid: string | null;
  username: string | null;
  name: string;
  image: string | null;
  coverImage: string | null;
  headline: string | null;
  bio: string | null;
  university: string | null;
  verified: boolean;
  customBadges: any;
  level: number;
  reputation: number;
  currentStreak: number;
  githubUsername: string | null;
  linkedinUrl: string | null;
  twitterUsername: string | null;
  portfolioUrl: string | null;
  isFollowing: boolean;
  stats: {
    followers: number;
    following: number;
    projects: number;
    resources: number;
    studyGroups: number;
  };
  completion: {
    score: number;
    items: Array<{ label: string; done: boolean }>;
  };
  skills: Array<{ skill: string; endorsements: number }>;
  interests: string[];
  projects: any[];
  achievements: any[];
  activity: any[];
  featuredItems: any[];
  heatmapData: Array<{ date: string; count: number; level: number }>;
};

const BADGE_COLOR_CLASSES: Record<string, string> = {
  purple: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  blue: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  green: "bg-green-500/20 text-green-400 border-green-500/30",
  yellow: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  red: "bg-red-500/20 text-red-400 border-red-500/30",
  pink: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  indigo: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
};

export function EnhancedProfileView({ profile, isOwner }: { profile: ProfileData; isOwner: boolean }) {
  const router = useRouter();
  const [isFollowing, setIsFollowing] = useState(profile.isFollowing);
  const [busy, setBusy] = useState(false);
  const badges = Array.isArray(profile.customBadges) ? profile.customBadges : [];

  const levelTitle = profile.level <= 10 ? "Beginner" : 
                    profile.level <= 25 ? "Builder" : 
                    profile.level <= 50 ? "Expert" :
                    profile.level <= 75 ? "Master" : "Legend";

  async function handleFollowClick() {
    // Check if user is authenticated by trying to follow
    setBusy(true);
    try {
      const res = await fetch(`/api/users/${profile.id}/follow`, {
        method: isFollowing ? "DELETE" : "POST",
      });

      if (res.status === 401) {
        // User not authenticated, redirect to login with current page
        const currentUrl = window.location.pathname;
        router.push(`/login?redirect=${encodeURIComponent(currentUrl)}`);
        return;
      }

      if (res.ok) {
        const data = await res.json();
        setIsFollowing(data.isFollowing);
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Cover Image + Profile Header */}
      <div className="relative">
        {/* Cover Image */}
        <div className="h-64 bg-gradient-to-r from-purple-900/40 via-blue-900/40 to-purple-900/40 relative overflow-hidden">
          {profile.coverImage ? (
            <Image
              src={profile.coverImage}
              alt="Cover"
              fill
              className="object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20" />
          )}
        </div>

        {/* Profile Info */}
        <div className="container max-w-7xl mx-auto px-4">
          <div className="relative -mt-20">
            <div className="flex flex-col md:flex-row gap-6 items-start md:items-end">
              {/* Profile Photo */}
              <div className="relative">
                <div className="w-40 h-40 rounded-full border-4 border-background overflow-hidden bg-card">
                  {profile.image ? (
                    <Image
                      src={profile.image}
                      alt={profile.name}
                      width={160}
                      height={160}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-purple-500/20 text-4xl font-bold text-purple-400">
                      {profile.name[0]}
                    </div>
                  )}
                </div>
                {/* Online Status */}
                <div className="absolute bottom-2 right-2 w-6 h-6 bg-green-500 border-4 border-background rounded-full" />
              </div>

              {/* Name & Info */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold">{profile.name}</h1>
                  {profile.verified && (
                    <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 text-muted-foreground mb-3">
                  <button
                    onClick={() => {
                      const shareUrl = profile.username 
                        ? `${window.location.origin}/@${profile.username}`
                        : window.location.href;
                      navigator.clipboard.writeText(shareUrl);
                      alert("Profile link copied!");
                    }}
                    className="hover:text-purple-400 transition-colors flex items-center gap-1"
                    title="Copy profile link"
                  >
                    <span>@{profile.username}</span>
                  </button>
                  {profile.uid && (
                    <>
                      <span>•</span>
                      <span>#{profile.uid}</span>
                    </>
                  )}
                </div>

                {/* Custom Badges */}
                {badges.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {badges.map((badge: any, index: number) => (
                      <div
                        key={index}
                        className={`px-3 py-1 rounded-full border text-xs font-medium ${
                          BADGE_COLOR_CLASSES[badge.color] || BADGE_COLOR_CLASSES.purple
                        }`}
                      >
                        {badge.label}
                      </div>
                    ))}
                  </div>
                )}

                {/* Headline & Bio */}
                {profile.headline && (
                  <p className="text-sm text-muted-foreground mb-2">{profile.headline}</p>
                )}
                {profile.bio && (
                  <p className="text-sm max-w-2xl">{profile.bio}</p>
                )}

                {/* University & Join Date */}
                <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                  {profile.university && (
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4" />
                      {profile.university}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Joined May 2026
                  </div>
                </div>

                {/* Social Links */}
                <div className="flex items-center gap-3 mt-4">
                  {profile.githubUsername && (
                    <a
                      href={`https://github.com/${profile.githubUsername}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 rounded-lg bg-card border border-border flex items-center justify-center hover:border-purple-500 transition-colors"
                      title="GitHub"
                    >
                      <Link2 className="w-5 h-5" />
                    </a>
                  )}
                  {profile.linkedinUrl && (
                    <a
                      href={profile.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 rounded-lg bg-card border border-border flex items-center justify-center hover:border-purple-500 transition-colors"
                      title="LinkedIn"
                    >
                      <Link2 className="w-5 h-5" />
                    </a>
                  )}
                  {profile.twitterUsername && (
                    <a
                      href={`https://twitter.com/${profile.twitterUsername}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 rounded-lg bg-card border border-border flex items-center justify-center hover:border-purple-500 transition-colors"
                      title="Twitter/X"
                    >
                      <Link2 className="w-5 h-5" />
                    </a>
                  )}
                  {profile.portfolioUrl && (
                    <a
                      href={profile.portfolioUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 rounded-lg bg-card border border-border flex items-center justify-center hover:border-purple-500 transition-colors"
                      title="Portfolio"
                    >
                      <ExternalLink className="w-5 h-5" />
                    </a>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                {isOwner ? (
                  <>
                    <Link
                      href="/settings"
                      className="px-6 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 font-medium"
                    >
                      Edit Profile
                    </Link>
                    <button
                      onClick={() => {
                        const url = profile.username 
                          ? `${window.location.origin}/@${profile.username}`
                          : window.location.href;
                        if (navigator.share) {
                          navigator.share({ title: profile.name, url });
                        } else {
                          navigator.clipboard.writeText(url);
                          alert("Profile link copied!");
                        }
                      }}
                      className="px-4 py-2 bg-card border border-border rounded-lg hover:border-purple-500"
                      title="Share profile"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <button 
                      onClick={handleFollowClick}
                      disabled={busy}
                      className="px-6 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <UserPlus className="w-4 h-4 inline mr-2" />
                      {busy ? "Loading..." : isFollowing ? "Following" : "Follow"}
                    </button>
                    <button 
                      onClick={() => {
                        const url = profile.username 
                          ? `${window.location.origin}/@${profile.username}`
                          : window.location.href;
                        if (navigator.share) {
                          navigator.share({ title: profile.name, url });
                        } else {
                          navigator.clipboard.writeText(url);
                          alert("Profile link copied!");
                        }
                      }}
                      className="px-4 py-2 bg-card border border-border rounded-lg hover:border-purple-500"
                      title="Share profile"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                    <button className="px-4 py-2 bg-card border border-border rounded-lg hover:border-purple-500">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="border-y border-border bg-card/30 backdrop-blur-sm sticky top-0 z-40 mt-6">
        <div className="container max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-6 overflow-x-auto">
            <StatCard icon={Users} label="Followers" value={profile.stats.followers} />
            <StatCard icon={Folder} label="Projects" value={profile.stats.projects} />
            <StatCard icon={BookOpen} label="Resources" value={profile.stats.resources} />
            <StatCard icon={Users} label="Study Groups" value={profile.stats.studyGroups} />
            <StatCard icon={Star} label="Reputation" value={profile.reputation} highlight />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Sidebar */}
          <div className="lg:col-span-3 space-y-6">
            {/* Profile Completion */}
            {isOwner && profile.completion.score < 100 && (
              <div className="bg-card border border-border rounded-xl p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">Profile Completion</h3>
                  <span className="text-2xl font-bold text-purple-400">
                    {profile.completion.score}%
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden mb-4">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
                    style={{ width: `${profile.completion.score}%` }}
                  />
                </div>
                <div className="space-y-2 mb-4">
                  {profile.completion.items.map((item, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      {item.done ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      ) : (
                        <Circle className="w-4 h-4 text-muted-foreground" />
                      )}
                      <span className={item.done ? "text-muted-foreground" : ""}>
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
                <Link
                  href="/settings"
                  className="block w-full px-4 py-2 bg-purple-500/10 text-purple-400 rounded-lg text-center hover:bg-purple-500/20 font-medium"
                >
                  Complete Now →
                </Link>
              </div>
            )}

            {/* Level & Streak */}
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="text-center mb-4">
                <div className="text-3xl font-bold text-purple-400">Level {profile.level}</div>
                <div className="text-sm text-muted-foreground">{levelTitle}</div>
              </div>
              <div className="flex items-center justify-center gap-2 text-sm">
                <Flame className="w-5 h-5 text-orange-500" />
                <span className="font-semibold">{profile.currentStreak} Day Streak</span>
              </div>
            </div>
          </div>

          {/* Main Column */}
          <div className="lg:col-span-6 space-y-6">
            {/* Featured Section */}
            {profile.featuredItems && profile.featuredItems.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Star className="w-5 h-5 text-yellow-500" />
                    Featured
                  </h2>
                  <button className="text-sm text-purple-400 hover:text-purple-300">
                    View all →
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {profile.featuredItems.slice(0, 4).map((item: any, index: number) => (
                    <a
                      key={index}
                      href={item.url || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-4 bg-background border border-border rounded-lg hover:border-purple-500 transition-colors group"
                    >
                      <div className="text-3xl mb-2">{item.icon || "🎯"}</div>
                      <div className="font-semibold text-sm mb-1 group-hover:text-purple-400">
                        {item.title}
                      </div>
                      {item.description && (
                        <div className="text-xs text-muted-foreground">
                          {item.description}
                        </div>
                      )}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Projects */}
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Folder className="w-5 h-5" />
                  Projects
                </h2>
                <button className="text-sm text-purple-400 hover:text-purple-300">
                  View all →
                </button>
              </div>
              {profile.projects.length > 0 ? (
                <div className="grid gap-4">
                  {profile.projects.slice(0, 3).map((project: any) => (
                    <ProjectCard key={project.id} project={project} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Folder className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No projects yet</p>
                  {isOwner && (
                    <Link
                      href="/projects/create"
                      className="inline-block mt-3 px-4 py-2 bg-purple-500/10 text-purple-400 rounded-lg hover:bg-purple-500/20"
                    >
                      + Create Project
                    </Link>
                  )}
                </div>
              )}
            </div>

            {/* Recent Activity */}
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Recent Activity
                </h2>
              </div>
              <div className="space-y-3">
                {profile.activity.slice(0, 5).map((activity: any, index: number) => (
                  <ActivityItem key={index} activity={activity} />
                ))}
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="lg:col-span-3 space-y-6">
            {/* Activity Heatmap */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Activity Overview
              </h3>
              <ActivityHeatmap data={profile.heatmapData} />
            </div>

            {/* Skills */}
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Skills</h3>
                {isOwner && (
                  <Link
                    href="/settings"
                    className="text-sm text-purple-400 hover:text-purple-300"
                  >
                    Edit
                  </Link>
                )}
              </div>
              <div className="space-y-2">
                {profile.skills.slice(0, 8).map((skill: any, index: number) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm">{skill.skill}</span>
                    <span className="text-xs text-muted-foreground">{skill.endorsements}</span>
                  </div>
                ))}
              </div>
              {profile.skills.length > 8 && (
                <button className="text-sm text-purple-400 hover:text-purple-300 mt-3">
                  Show all skills →
                </button>
              )}
            </div>

            {/* Achievements */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Award className="w-4 h-4" />
                Achievements
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {profile.achievements.slice(0, 4).map((achievement: any, index: number) => (
                  <div
                    key={index}
                    className="p-3 bg-background border border-border rounded-lg text-center"
                  >
                    <div className="text-2xl mb-1">{achievement.icon}</div>
                    <div className="text-xs font-medium">{achievement.title}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Interests */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="font-semibold mb-4">Interests</h3>
              <div className="flex flex-wrap gap-2">
                {profile.interests.map((interest, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-blue-500/10 text-blue-400 rounded-full text-xs border border-blue-500/20"
                  >
                    {interest}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, highlight }: any) {
  return (
    <div className={`text-center ${highlight ? "text-purple-400" : ""}`}>
      <div className="flex items-center justify-center mb-1">
        <Icon className={`w-5 h-5 ${highlight ? "text-purple-400" : "text-muted-foreground"}`} />
      </div>
      <div className={`text-2xl font-bold ${highlight ? "text-purple-400" : ""}`}>
        {value}
      </div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function ProjectCard({ project }: any) {
  return (
    <div className="p-4 bg-background border border-border rounded-lg hover:border-purple-500 transition-colors">
      <h3 className="font-semibold mb-2">{project.title}</h3>
      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
        {project.description}
      </p>
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Star className="w-3 h-3" /> {project.stars || 0}
        </span>
        <span className="flex items-center gap-1">
          <Users className="w-3 h-3" /> {project.memberCount}
        </span>
      </div>
    </div>
  );
}

function ActivityItem({ activity }: any) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
        <TrendingUp className="w-4 h-4 text-purple-400" />
      </div>
      <div className="flex-1">
        <p>{activity.title}</p>
        <p className="text-xs text-muted-foreground">
          {new Date(activity.createdAt).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}

function ActivityHeatmap({ data }: { data: Array<{ date: string; count: number; level: number }> }) {
  const colorMap = [
    "bg-muted",
    "bg-purple-500/30",
    "bg-purple-500/50",
    "bg-purple-500/70",
    "bg-purple-500",
  ];

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-12 gap-1">
        {Array.from({ length: 84 }).map((_, index) => {
          const activity = data[index];
          const level = activity?.level || 0;
          return (
            <div
              key={index}
              className={`aspect-square rounded-sm ${colorMap[level]}`}
              title={activity ? `${activity.count} activities` : "No activity"}
            />
          );
        })}
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Less</span>
        <div className="flex gap-1">
          {colorMap.map((color, index) => (
            <div key={index} className={`w-3 h-3 rounded-sm ${color}`} />
          ))}
        </div>
        <span>More</span>
      </div>
    </div>
  );
}
