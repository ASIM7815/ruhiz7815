import Link from "next/link";
import type { ReactNode } from "react";
import {
  Activity,
  Award,
  BadgeCheck,
  BookOpen,
  CalendarDays,
  Check,
  Download,
  FolderKanban,
  GraduationCap,
  Hash,
  Layers,
  type LucideIcon,
  Sparkles,
  Users,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileActions } from "@/components/profile/profile-actions";
import type { StudentProfile } from "@/lib/profile-data";

type StudentProfileViewProps = {
  profile: StudentProfile;
  viewerId?: string | null;
  publicShell?: boolean;
};

const roleLabels: Record<string, string> = {
  MEMBER: "Student",
  LEADER: "Project Leader",
  BOTH: "Student Builder",
};

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    year: "numeric",
  }).format(date);
}

function Section({
  title,
  icon: Icon,
  action,
  children,
}: {
  title: string;
  icon: LucideIcon;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
        {action}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function EmptyState({ label }: { label: string }) {
  return <p className="text-sm text-muted-foreground">{label}</p>;
}

export function StudentProfileView({ profile, viewerId, publicShell = false }: StudentProfileViewProps) {
  const isOwnProfile = viewerId === profile.id;
  const joinedDate = formatDate(profile.createdAt);
  const headline = profile.headline || roleLabels[profile.role] || "Student";

  return (
    <div className={publicShell ? "mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8" : "mx-auto w-full max-w-6xl space-y-6"}>
      {publicShell && (
        <div className="mb-5 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2 font-heading text-lg font-bold">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">R</span>
            RUHIZ
          </Link>
          <Button variant="outline" render={<Link href={viewerId ? "/dashboard" : "/login"} />}>
            {viewerId ? "Open App" : "Log In"}
          </Button>
        </div>
      )}

      <Card className="overflow-hidden">
        <div
          className="h-36 bg-[linear-gradient(135deg,var(--primary),var(--chart-3),var(--accent))] sm:h-44"
          style={
            profile.coverImage
              ? {
                  backgroundImage: `url(${profile.coverImage})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }
              : undefined
          }
        />
        <CardContent className="px-4 pb-5 sm:px-6">
          <div className="-mt-12 flex flex-col gap-4 sm:-mt-14 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <Avatar className="h-24 w-24 border-4 border-background shadow-sm sm:h-28 sm:w-28">
                <AvatarImage src={profile.image || undefined} />
                <AvatarFallback className="text-2xl font-heading">{initials(profile.name) || "U"}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="break-words font-heading text-2xl font-bold sm:text-3xl">{profile.name}</h1>
                  {profile.collegeVerified && (
                    <Badge variant="secondary" className="gap-1">
                      <BadgeCheck className="h-3 w-3" />
                      College Verified
                    </Badge>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                  {profile.username && <span>@{profile.username}</span>}
                  {profile.uid && (
                    <span className="inline-flex items-center gap-1">
                      <Hash className="h-3.5 w-3.5" />
                      {profile.uid}
                    </span>
                  )}
                  <span>{headline}</span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  {profile.university && (
                    <span className="inline-flex items-center gap-1">
                      <GraduationCap className="h-4 w-4" />
                      {profile.university}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="h-4 w-4" />
                    Joined {joinedDate}
                  </span>
                </div>
              </div>
            </div>
            <ProfileActions
              userId={profile.id}
              profilePath={profile.profilePath}
              initialFollowers={profile.stats.followers}
              initialIsFollowing={profile.isFollowing}
              isOwnProfile={isOwnProfile}
              canInteract={Boolean(viewerId)}
            />
          </div>

          {profile.bio && (
            <p className="mt-4 max-w-3xl whitespace-pre-line text-sm leading-6 text-muted-foreground">
              {profile.bio}
            </p>
          )}

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {[
              { label: "Followers", value: profile.stats.followers },
              { label: "Following", value: profile.stats.following },
              { label: "Projects", value: profile.stats.projects },
              { label: "Resources", value: profile.stats.resources },
              { label: "Groups", value: profile.stats.studyGroups },
            ].map((stat: any) => (
              <div key={stat.label} className="rounded-lg border bg-background px-3 py-2">
                <p className="font-heading text-xl font-semibold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main Content - Full Width */}
      <div className="space-y-6">
        {/* Projects, Resources, Activity - Full Width */}
        <Section
          title="Projects"
          icon={FolderKanban}
          action={
            isOwnProfile ? (
              <Button variant="outline" size="sm" render={<Link href="/projects/create" />}>
                New
              </Button>
            ) : null
          }
        >
          {profile.projects.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {profile.projects.map((project: any) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="rounded-lg border p-3 transition-colors hover:bg-muted/60"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="line-clamp-1 font-medium">{project.title}</h3>
                    <Badge variant="outline">{project.status.replace("_", " ")}</Badge>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{project.description}</p>
                  {project.skills.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {project.skills.slice(0, 4).map((skill: any) => (
                        <Badge key={skill} variant="secondary">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState label="No projects showcased yet" />
          )}
        </Section>

        <Section title="Resources" icon={BookOpen}>
          {profile.resources.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {profile.resources.map((resource: any) => (
                <div key={resource.id} className="rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="line-clamp-1 font-medium">{resource.title}</h3>
                    <Badge variant="outline">{resource.type}</Badge>
                  </div>
                  {resource.description && (
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{resource.description}</p>
                  )}
                  <p className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Download className="h-3.5 w-3.5" />
                    {resource.downloads} downloads
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState label="No resources shared yet" />
          )}
        </Section>

        <Section title="Activity" icon={Activity}>
          {profile.activity.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {profile.activity.map((item: any) => {
                const content = (
                  <div className="rounded-lg border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-medium line-clamp-1">{item.title}</p>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatDate(item.createdAt)}
                      </span>
                    </div>
                    {item.message && (
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.message}</p>
                    )}
                  </div>
                );

                return item.href ? (
                  <Link key={item.id} href={item.href} className="block transition-colors hover:bg-muted/60">
                    {content}
                  </Link>
                ) : (
                  <div key={item.id}>{content}</div>
                );
              })}
            </div>
          ) : (
            <EmptyState label="No recent activity yet" />
          )}
        </Section>

        {/* Bottom Row - Horizontal Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {isOwnProfile && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Profile Strength
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-between gap-3">
                  <span className="font-heading text-3xl font-semibold">{profile.completion.score}%</span>
                  <span className="text-sm text-muted-foreground">Complete</span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${profile.completion.score}%` }}
                  />
                </div>
                <div className="mt-4 space-y-2">
                  {profile.completion.items.map((item: any) => (
                    <div key={item.label} className="flex items-center gap-2 text-xs">
                      <span className={item.done ? "text-primary" : "text-muted-foreground"}>
                        <Check className="h-3.5 w-3.5" />
                      </span>
                      <span className={item.done ? "" : "text-muted-foreground"}>{item.label}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Layers className="h-4 w-4 text-primary" />
                Skills
              </CardTitle>
            </CardHeader>
            <CardContent>
              {profile.skills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map((skill: any) => (
                    <Badge key={skill} variant="secondary" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                </div>
              ) : (
                <EmptyState label="No skills added yet" />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-primary" />
                Interests
              </CardTitle>
            </CardHeader>
            <CardContent>
              {profile.interests.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {profile.interests.map((interest: any) => (
                    <Badge key={interest} variant="outline" className="text-xs">
                      {interest}
                    </Badge>
                  ))}
                </div>
              ) : (
                <EmptyState label="No interests added yet" />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4 text-primary" />
                Study Groups
              </CardTitle>
            </CardHeader>
            <CardContent>
              {profile.studyGroups.length > 0 ? (
                <div className="space-y-2">
                  {profile.studyGroups.slice(0, 2).map((group: any) => (
                    <div key={group.id} className="rounded-lg border p-2">
                      <p className="text-sm font-medium line-clamp-1">{group.name}</p>
                      <p className="text-xs text-muted-foreground">{group.subject}</p>
                    </div>
                  ))}
                  {profile.studyGroups.length > 2 && (
                    <p className="text-xs text-muted-foreground">+{profile.studyGroups.length - 2} more</p>
                  )}
                </div>
              ) : (
                <EmptyState label="No groups joined yet" />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Award className="h-4 w-4 text-primary" />
                Achievements
              </CardTitle>
            </CardHeader>
            <CardContent>
              {profile.achievements.length > 0 ? (
                <div className="space-y-2">
                  {profile.achievements.slice(0, 2).map((achievement: any) => (
                    <div key={achievement.id} className="rounded-lg border p-2">
                      <p className="text-sm font-medium line-clamp-1">
                        {achievement.icon ? `${achievement.icon} ` : ""}
                        {achievement.title}
                      </p>
                    </div>
                  ))}
                  {profile.achievements.length > 2 && (
                    <p className="text-xs text-muted-foreground">+{profile.achievements.length - 2} more</p>
                  )}
                </div>
              ) : (
                <EmptyState label="No achievements yet" />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BadgeCheck className="h-4 w-4 text-primary" />
                Endorsements
              </CardTitle>
            </CardHeader>
            <CardContent>
              {profile.endorsements.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {profile.endorsements.slice(0, 4).map((endorsement: any) => (
                    <Badge key={endorsement.label} variant="secondary" className="text-xs">
                      {endorsement.label} ({endorsement.count})
                    </Badge>
                  ))}
                  {profile.endorsements.length > 4 && (
                    <Badge variant="outline" className="text-xs">
                      +{profile.endorsements.length - 4}
                    </Badge>
                  )}
                </div>
              ) : (
                <EmptyState label="No endorsements yet" />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
