import type React from "react";
import {
  FolderKanban,
  Users,
  Star,
  MessageSquare,
  TrendingUp,
  ArrowRight,
  Plus,
  Brain,
  BookOpen,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

const stats: { title: string; value: string; change: string; icon: React.ElementType; color: string; bg: string }[] = [];

const recommendedProjects: { title: string; leader: string; avatar: string; skills: string[]; match: number }[] = [];

const activityFeed: { user: string; action: string; target: string; time: string }[] = [];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold">
            Welcome back 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            Here&apos;s what&apos;s happening across your projects and network.
          </p>
        </div>
        <Button render={<Link href="/projects/create" />}>
            <Plus className="mr-2 h-4 w-4" />
            New Project
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold font-heading mt-1">
                    {stat.value}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-emerald-500" />
                    {stat.change}
                  </p>
                </div>
                <div className={`${stat.bg} p-3 rounded-xl`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* AI Recommended Projects */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                AI Recommended Projects
              </CardTitle>
              <CardDescription>
                Matched based on your skills and interests
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" render={<Link href="/projects" />}>
                View All
                <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {recommendedProjects.map((project) => (
              <div
                key={project.title}
                className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={project.avatar} />
                  <AvatarFallback>
                    {project.leader
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {project.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Led by {project.leader}
                  </p>
                  <div className="flex gap-1 mt-1">
                    {project.skills.map((skill) => (
                      <Badge
                        key={skill}
                        variant="secondary"
                        className="text-[10px] h-4"
                      >
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-bold text-primary">
                    {project.match}%
                  </div>
                  <div className="text-[10px] text-muted-foreground">match</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Activity Feed */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {activityFeed.map((activity, i) => (
              <div key={i} className="flex gap-3">
                <div className="h-2 w-2 rounded-full bg-primary mt-2 shrink-0" />
                <div>
                  <p className="text-sm">
                    <span className="font-medium">{activity.user}</span>{" "}
                    {activity.action}{" "}
                    <span className="font-medium text-primary">
                      {activity.target}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {activity.time}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { title: "Browse Projects", href: "/projects", icon: FolderKanban, desc: "Find teams to join" },
          { title: "Knowledge Hub", href: "/knowledge", icon: BookOpen, desc: "Upload or find notes" },
          { title: "Study Groups", href: "/study-groups", icon: Users, desc: "Join a study group" },
          { title: "Post an Idea", href: "/projects/create", icon: Plus, desc: "Start a new project" },
        ].map((action) => (
          <Link key={action.title} href={action.href}>
            <Card className="hover:shadow-md hover:border-primary/30 transition-all cursor-pointer group">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="bg-primary/10 p-2.5 rounded-xl group-hover:bg-primary/20 transition-colors">
                  <action.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">{action.title}</p>
                  <p className="text-xs text-muted-foreground">{action.desc}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
