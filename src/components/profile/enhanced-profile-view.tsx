"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Star,
  Users,
  Folder,
  UserPlus,
  Share2,
  MoreHorizontal,
  Award,
  TrendingUp,
  Calendar,
  CheckCircle2,
  Circle,
  Flame,
  MapPin,
  Zap,
  Trophy,
  Globe,
  Settings,
  UserCheck,
  AtSign,
  Briefcase,
  Code,
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
  purple: "profile-badge-purple",
  blue: "profile-badge-blue",
  green: "profile-badge-green",
  yellow: "profile-badge-yellow",
  red: "profile-badge-red",
  pink: "profile-badge-pink",
  indigo: "profile-badge-indigo",
};

export function EnhancedProfileView({ profile, isOwner }: { profile: ProfileData; isOwner: boolean }) {
  const router = useRouter();
  const [isFollowing, setIsFollowing] = useState(profile.isFollowing);
  const [busy, setBusy] = useState(false);
  const [showAllSkills, setShowAllSkills] = useState(false);
  const [activeTab, setActiveTab] = useState<"projects" | "activity">("projects");
  const badges = Array.isArray(profile.customBadges) ? profile.customBadges : [];

  const levelTitle = profile.level <= 10 ? "Beginner" : 
                    profile.level <= 25 ? "Builder" : 
                    profile.level <= 50 ? "Expert" :
                    profile.level <= 75 ? "Master" : "Legend";

  const levelProgress = Math.min(100, (profile.level % 25) * 4);

  async function handleFollowClick() {
    setBusy(true);
    try {
      const res = await fetch(`/api/users/${profile.id}/follow`, {
        method: isFollowing ? "DELETE" : "POST",
      });

      if (res.status === 401) {
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

  function handleShare() {
    const url = profile.username 
      ? `${window.location.origin}/@${profile.username}`
      : window.location.href;
    if (navigator.share) {
      navigator.share({ title: profile.name, url });
    } else {
      navigator.clipboard.writeText(url);
      alert("Profile link copied!");
    }
  }

  return (
    <div className="profile-page">
      {/* ── Cover + Avatar Hero ── */}
      <div className="profile-hero">
        <div className="profile-cover">
          {profile.coverImage ? (
            <Image src={profile.coverImage} alt="Cover" fill className="object-cover" />
          ) : (
            <div className="profile-cover-fallback" />
          )}
          <div className="profile-cover-overlay" />
        </div>

        <div className="profile-hero-content">
          {/* Avatar */}
          <div className="profile-avatar-wrap">
            <div className="profile-avatar">
              {profile.image ? (
                <Image src={profile.image} alt={profile.name} width={160} height={160} className="profile-avatar-img" />
              ) : (
                <div className="profile-avatar-fallback">{profile.name[0]}</div>
              )}
            </div>
            <div className="profile-online-dot" />
            {/* Level badge on avatar */}
            <div className="profile-level-badge">
              <Zap className="w-3 h-3" />
              <span>{profile.level}</span>
            </div>
          </div>

          {/* Identity + Actions Row */}
          <div className="profile-identity">
            <div className="profile-name-row">
              <h1 className="profile-name">{profile.name}</h1>
              {profile.verified && (
                <div className="profile-verified">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              )}
            </div>

            <div className="profile-handle-row">
              <button
                onClick={() => {
                  const shareUrl = profile.username 
                    ? `${window.location.origin}/@${profile.username}`
                    : window.location.href;
                  navigator.clipboard.writeText(shareUrl);
                }}
                className="profile-handle"
                title="Copy profile link"
              >
                @{profile.username}
              </button>
              {profile.uid && (
                <>
                  <span className="profile-sep">•</span>
                  <span className="profile-uid">#{profile.uid}</span>
                </>
              )}
            </div>

            {/* Custom Badges */}
            {badges.length > 0 && (
              <div className="profile-badges">
                {badges.map((badge: any, index: number) => (
                  <span key={index} className={`profile-badge ${BADGE_COLOR_CLASSES[badge.color] || BADGE_COLOR_CLASSES.purple}`}>
                    {badge.label}
                  </span>
                ))}
              </div>
            )}

            {profile.headline && <p className="profile-headline">{profile.headline}</p>}
            {profile.bio && <p className="profile-bio">{profile.bio}</p>}

            {/* Meta info */}
            <div className="profile-meta">
              {profile.university && (
                <span className="profile-meta-item">
                  <MapPin className="w-3.5 h-3.5" />
                  {profile.university}
                </span>
              )}
              <span className="profile-meta-item">
                <Calendar className="w-3.5 h-3.5" />
                Joined May 2026
              </span>
              {profile.currentStreak > 0 && (
                <span className="profile-meta-item profile-streak">
                  <Flame className="w-3.5 h-3.5" />
                  {profile.currentStreak}d streak
                </span>
              )}
            </div>

            {/* Social Links */}
            <div className="profile-socials">
              {profile.githubUsername && (
                <a href={`https://github.com/${profile.githubUsername}`} target="_blank" rel="noopener noreferrer" className="profile-social-link" title="GitHub">
                  <Code className="w-4 h-4" />
                </a>
              )}
              {profile.linkedinUrl && (
                <a href={profile.linkedinUrl} target="_blank" rel="noopener noreferrer" className="profile-social-link" title="LinkedIn">
                  <Briefcase className="w-4 h-4" />
                </a>
              )}
              {profile.twitterUsername && (
                <a href={`https://twitter.com/${profile.twitterUsername}`} target="_blank" rel="noopener noreferrer" className="profile-social-link" title="Twitter/X">
                  <AtSign className="w-4 h-4" />
                </a>
              )}
              {profile.portfolioUrl && (
                <a href={profile.portfolioUrl} target="_blank" rel="noopener noreferrer" className="profile-social-link" title="Portfolio">
                  <Globe className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="profile-actions">
            {isOwner ? (
              <>
                <Link href="/settings" className="profile-btn-primary">
                  <Settings className="w-4 h-4" />
                  Edit Profile
                </Link>
                <button onClick={handleShare} className="profile-btn-ghost" title="Share profile">
                  <Share2 className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <button onClick={handleFollowClick} disabled={busy} className={`profile-btn-primary ${isFollowing ? "profile-btn-following" : ""}`}>
                  {isFollowing ? <UserCheck className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                  {busy ? "..." : isFollowing ? "Following" : "Follow"}
                </button>
                <button onClick={handleShare} className="profile-btn-ghost" title="Share profile">
                  <Share2 className="w-4 h-4" />
                </button>
                <button className="profile-btn-ghost">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Stats Strip ── */}
      <div className="profile-stats-strip">
        <StatPill label="Followers" value={profile.stats.followers} />
        <StatPill label="Following" value={profile.stats.following} />
        <StatPill label="Projects" value={profile.stats.projects} />
        <StatPill label="Resources" value={profile.stats.resources} />
        <StatPill label="Reputation" value={profile.reputation} highlight />
      </div>

      {/* ── Main Grid ── */}
      <div className="profile-grid">
        {/* Left Column */}
        <div className="profile-sidebar">
          {/* Level & Streak Card */}
          <div className="profile-card profile-level-card">
            <div className="profile-level-header">
              <Trophy className="w-5 h-5" />
              <span className="profile-level-title">Level {profile.level}</span>
              <span className="profile-level-rank">{levelTitle}</span>
            </div>
            <div className="profile-level-bar">
              <div className="profile-level-fill" style={{ width: `${levelProgress}%` }} />
            </div>
            <div className="profile-level-stats">
              <div className="profile-level-stat">
                <Star className="w-4 h-4" />
                <span>{profile.reputation} XP</span>
              </div>
              <div className="profile-level-stat profile-streak">
                <Flame className="w-4 h-4" />
                <span>{profile.currentStreak}d</span>
              </div>
            </div>
          </div>

          {/* Profile Completion */}
          {isOwner && profile.completion.score < 100 && (
            <div className="profile-card">
              <div className="profile-card-header">
                <h3>Profile Completion</h3>
                <span className="profile-completion-pct">{profile.completion.score}%</span>
              </div>
              <div className="profile-progress-bar">
                <div className="profile-progress-fill" style={{ width: `${profile.completion.score}%` }} />
              </div>
              <div className="profile-completion-list">
                {profile.completion.items.map((item, i) => (
                  <div key={i} className={`profile-completion-item ${item.done ? "done" : ""}`}>
                    {item.done ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5" />}
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
              <Link href="/settings" className="profile-completion-cta">Complete Now →</Link>
            </div>
          )}

          {/* Skills */}
          <div className="profile-card">
            <div className="profile-card-header">
              <h3>Skills</h3>
              {isOwner && <Link href="/settings" className="profile-edit-link">Edit</Link>}
            </div>
            <div className="profile-skills">
              {(showAllSkills ? profile.skills : profile.skills.slice(0, 6)).map((skill, i) => (
                <div key={i} className="profile-skill-item">
                  <span className="profile-skill-name">{skill.skill}</span>
                  {skill.endorsements > 0 && <span className="profile-skill-count">{skill.endorsements}</span>}
                </div>
              ))}
            </div>
            {profile.skills.length > 6 && (
              <button onClick={() => setShowAllSkills(!showAllSkills)} className="profile-show-more">
                {showAllSkills ? "Show less" : `Show all ${profile.skills.length} skills →`}
              </button>
            )}
          </div>

          {/* Interests */}
          <div className="profile-card">
            <div className="profile-card-header"><h3>Interests</h3></div>
            <div className="profile-interests">
              {profile.interests.map((interest, i) => (
                <span key={i} className="profile-interest-tag">{interest}</span>
              ))}
              {profile.interests.length === 0 && <p className="profile-empty">No interests added yet</p>}
            </div>
          </div>
        </div>

        {/* Main Column */}
        <div className="profile-main">
          {/* Tab Switcher */}
          <div className="profile-tabs">
            <button className={`profile-tab ${activeTab === "projects" ? "active" : ""}`} onClick={() => setActiveTab("projects")}>
              <Folder className="w-4 h-4" /> Projects
            </button>
            <button className={`profile-tab ${activeTab === "activity" ? "active" : ""}`} onClick={() => setActiveTab("activity")}>
              <TrendingUp className="w-4 h-4" /> Activity
            </button>
          </div>

          {/* Featured */}
          {profile.featuredItems && profile.featuredItems.length > 0 && (
            <div className="profile-card">
              <div className="profile-card-header">
                <h3><Star className="w-4 h-4 inline mr-1.5 text-yellow-500" />Featured</h3>
              </div>
              <div className="profile-featured-grid">
                {profile.featuredItems.slice(0, 4).map((item: any, i: number) => (
                  <a key={i} href={item.url || "#"} target="_blank" rel="noopener noreferrer" className="profile-featured-item">
                    <span className="profile-featured-icon">{item.icon || "🎯"}</span>
                    <span className="profile-featured-title">{item.title}</span>
                    {item.description && <span className="profile-featured-desc">{item.description}</span>}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Projects Tab */}
          {activeTab === "projects" && (
            <div className="profile-card">
              <div className="profile-card-header">
                <h3><Folder className="w-4 h-4 inline mr-1.5" />Projects</h3>
              </div>
              {profile.projects.length > 0 ? (
                <div className="profile-projects-grid">
                  {profile.projects.slice(0, 6).map((project: any) => (
                    <ProjectCard key={project.id} project={project} />
                  ))}
                </div>
              ) : (
                <div className="profile-empty-state">
                  <Folder className="w-10 h-10" />
                  <p>No projects yet</p>
                  {isOwner && <Link href="/projects/create" className="profile-completion-cta">+ Create Project</Link>}
                </div>
              )}
            </div>
          )}

          {/* Activity Tab */}
          {activeTab === "activity" && (
            <div className="profile-card">
              <div className="profile-card-header">
                <h3><TrendingUp className="w-4 h-4 inline mr-1.5" />Recent Activity</h3>
              </div>
              {profile.activity.length > 0 ? (
                <div className="profile-activity-list">
                  {profile.activity.slice(0, 8).map((act: any, i: number) => (
                    <ActivityItem key={i} activity={act} />
                  ))}
                </div>
              ) : (
                <div className="profile-empty-state">
                  <TrendingUp className="w-10 h-10" />
                  <p>No activity yet</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column */}
        <div className="profile-sidebar-right">
          {/* Activity Heatmap */}
          <div className="profile-card">
            <div className="profile-card-header">
              <h3><TrendingUp className="w-4 h-4 inline mr-1.5" />Activity</h3>
            </div>
            <ActivityHeatmap data={profile.heatmapData} />
          </div>

          {/* Achievements */}
          <div className="profile-card">
            <div className="profile-card-header">
              <h3><Award className="w-4 h-4 inline mr-1.5" />Achievements</h3>
            </div>
            {profile.achievements.length > 0 ? (
              <div className="profile-achievements-grid">
                {profile.achievements.slice(0, 6).map((a: any, i: number) => (
                  <div key={i} className="profile-achievement">
                    <span className="profile-achievement-icon">{a.icon}</span>
                    <span className="profile-achievement-title">{a.title}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="profile-empty-state-sm">
                <Award className="w-8 h-8" />
                <p>No achievements yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatPill({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`profile-stat-pill ${highlight ? "highlight" : ""}`}>
      <span className="profile-stat-value">{value}</span>
      <span className="profile-stat-label">{label}</span>
    </div>
  );
}

function ProjectCard({ project }: any) {
  return (
    <div className="profile-project-card">
      <h4 className="profile-project-title">{project.title}</h4>
      <p className="profile-project-desc">{project.description}</p>
      <div className="profile-project-meta">
        <span><Star className="w-3 h-3" /> {project.stars || 0}</span>
        <span><Users className="w-3 h-3" /> {project.memberCount}</span>
      </div>
    </div>
  );
}

function ActivityItem({ activity }: any) {
  return (
    <div className="profile-activity-item">
      <div className="profile-activity-dot" />
      <div className="profile-activity-content">
        <p className="profile-activity-title">{activity.title}</p>
        <p className="profile-activity-date">{new Date(activity.createdAt).toLocaleDateString()}</p>
      </div>
    </div>
  );
}

function ActivityHeatmap({ data }: { data: Array<{ date: string; count: number; level: number }> }) {
  return (
    <div className="profile-heatmap">
      <div className="profile-heatmap-grid">
        {Array.from({ length: 84 }).map((_, i) => {
          const activity = data[i];
          const level = activity?.level || 0;
          return (
            <div key={i} className={`profile-heatmap-cell level-${level}`} title={activity ? `${activity.count} activities` : "No activity"} />
          );
        })}
      </div>
      <div className="profile-heatmap-legend">
        <span>Less</span>
        <div className="profile-heatmap-legend-cells">
          {[0, 1, 2, 3, 4].map((l) => <div key={l} className={`profile-heatmap-cell level-${l}`} />)}
        </div>
        <span>More</span>
      </div>
    </div>
  );
}
