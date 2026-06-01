"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  FolderKanban,
  Users,
  MessageSquare,
  BookOpen,
  TrendingUp,
  ArrowRight,
  Plus,
  Zap,
  Flame,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

interface DashboardData {
  stats: { projects: number; messagesSent: number; resources: number; studyGroups: number };
  weeklyActivity: { day: string; date: string; sent: number; received: number }[];
  categoryBreakdown: { name: string; value: number }[];
  productivityScore: number;
  recentActivity: { user: string; action: string; target: string; time: string; type: string }[];
}

const chartColors = [
  "rgba(139,92,246,1)",
  "rgba(236,72,153,1)",
  "rgba(16,185,129,1)",
  "rgba(245,158,11,1)",
  "rgba(59,130,246,1)",
];

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const stats = [
    { title: "Active Projects", value: data?.stats?.projects || 0, icon: FolderKanban, color: "text-violet-400", bg: "bg-violet-500/10", change: "+2 this week" },
    { title: "Messages Sent", value: data?.stats?.messagesSent || 0, icon: MessageSquare, color: "text-pink-400", bg: "bg-pink-500/10", change: "7 day total" },
    { title: "Resources Shared", value: data?.stats?.resources || 0, icon: BookOpen, color: "text-emerald-400", bg: "bg-emerald-500/10", change: "Knowledge shared" },
    { title: "Study Groups", value: data?.stats?.studyGroups || 0, icon: Users, color: "text-amber-400", bg: "bg-amber-500/10", change: "Groups joined" },
  ];

  const weeklyActivityOption = {
    tooltip: { trigger: "axis", backgroundColor: "rgba(20,20,30,0.9)", borderColor: "rgba(255,255,255,0.1)", textStyle: { color: "#fff", fontSize: 12 } },
    grid: { top: 30, right: 20, bottom: 30, left: 40 },
    xAxis: { type: "category" as const, data: data?.weeklyActivity?.map((d) => d.day) || [], axisLine: { lineStyle: { color: "rgba(255,255,255,0.1)" } }, axisLabel: { color: "rgba(255,255,255,0.5)", fontSize: 11 } },
    yAxis: { type: "value" as const, splitLine: { lineStyle: { color: "rgba(255,255,255,0.06)" } }, axisLabel: { color: "rgba(255,255,255,0.5)", fontSize: 11 } },
    series: [
      {
        name: "Sent",
        type: "bar",
        data: data?.weeklyActivity?.map((d) => d.sent) || [],
        itemStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "rgba(139,92,246,0.9)" }, { offset: 1, color: "rgba(139,92,246,0.3)" }] }, borderRadius: [4, 4, 0, 0] },
        barWidth: "35%",
      },
      {
        name: "Received",
        type: "bar",
        data: data?.weeklyActivity?.map((d) => d.received) || [],
        itemStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "rgba(236,72,153,0.9)" }, { offset: 1, color: "rgba(236,72,153,0.3)" }] }, borderRadius: [4, 4, 0, 0] },
        barWidth: "35%",
      },
    ],
  };

  const categoryOption = {
    tooltip: { trigger: "item", backgroundColor: "rgba(20,20,30,0.9)", borderColor: "rgba(255,255,255,0.1)", textStyle: { color: "#fff", fontSize: 12 } },
    series: [
      {
        type: "pie",
        radius: ["55%", "80%"],
        center: ["50%", "50%"],
        avoidLabelOverlap: false,
        itemStyle: { borderRadius: 8, borderColor: "rgba(20,20,30,1)", borderWidth: 3 },
        label: { show: false },
        emphasis: { label: { show: true, fontSize: 14, fontWeight: "bold", color: "#fff" }, itemStyle: { shadowBlur: 20, shadowColor: "rgba(139,92,246,0.4)" } },
        data: (data?.categoryBreakdown || []).map((item, i) => ({ ...item, itemStyle: { color: chartColors[i % chartColors.length] } })),
      },
    ],
  };

  const gaugeOption = {
    series: [
      {
        type: "gauge",
        startAngle: 220,
        endAngle: -40,
        min: 0,
        max: 100,
        splitNumber: 10,
        itemStyle: {
          color: {
            type: "linear",
            x: 0, y: 1, x2: 1, y2: 0,
            colorStops: [
              { offset: 0, color: "rgba(236,72,153,1)" },
              { offset: 0.5, color: "rgba(139,92,246,1)" },
              { offset: 1, color: "rgba(59,130,246,1)" },
            ],
          },
        },
        progress: { show: true, width: 14 },
        pointer: { show: false },
        axisLine: { lineStyle: { width: 14, color: [[1, "rgba(255,255,255,0.06)"]] } },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        title: { fontSize: 12, color: "rgba(255,255,255,0.5)", offsetCenter: [0, "65%"] },
        detail: { fontSize: 36, fontWeight: "bold", color: "#fff", offsetCenter: [0, "10%"], formatter: "{value}%", valueAnimation: true },
        data: [{ value: data?.productivityScore || 0, name: "Productivity" }],
      },
    ],
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 w-48 bg-muted/50 rounded-lg animate-pulse" />
            <div className="h-4 w-72 bg-muted/50 rounded mt-2 animate-pulse" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}><CardContent className="p-5"><div className="h-16 bg-muted/50 rounded animate-pulse" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl sm:text-2xl md:text-3xl font-bold flex items-center gap-2">
            Welcome back <Flame className="h-6 w-6 sm:h-7 sm:w-7 text-orange-400" />
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Here&apos;s your activity overview and analytics.
          </p>
        </div>
        <Button render={<Link href="/projects/create" />} className="bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-700 hover:to-pink-700 border-0 w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          New Project
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="border-border/50 bg-card/80 backdrop-blur-sm hover:border-primary/30 transition-all">
            <CardContent className="p-4 sm:p-5">
              <div className="flex min-h-[7.5rem] flex-col justify-between gap-3 sm:min-h-0 sm:flex-row sm:items-center">
                <div>
                  <p className="text-xs text-muted-foreground sm:text-sm">{stat.title}</p>
                  <p className="text-2xl font-bold font-heading mt-1 sm:text-3xl">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-emerald-400" />
                    {stat.change}
                  </p>
                </div>
                <div className={`${stat.bg} self-end rounded-xl p-2.5 sm:self-auto sm:p-3`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="md:col-span-1 lg:col-span-2 border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="h-5 w-5 text-violet-400" />
              Messages This Week
            </CardTitle>
            <CardDescription>Sent vs Received (last 7 days)</CardDescription>
          </CardHeader>
          <CardContent>
            <ReactECharts option={weeklyActivityOption} className="h-[210px] sm:h-[220px]" opts={{ renderer: "svg" }} />
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Productivity Score</CardTitle>
            <CardDescription>Based on your activity</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <ReactECharts option={gaugeOption} className="h-[210px] w-full sm:h-[220px]" opts={{ renderer: "svg" }} />
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Activity Breakdown</CardTitle>
            <CardDescription>Where you spend your time</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <ReactECharts option={categoryOption} className="h-[210px] w-full sm:h-[220px]" opts={{ renderer: "svg" }} />
          </CardContent>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 gap-2">
              {(data?.categoryBreakdown || []).map((item, i) => (
                <div key={item.name} className="flex items-center gap-2 text-xs">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: chartColors[i % chartColors.length] }} />
                  <span className="text-muted-foreground">{item.name}</span>
                  <span className="font-medium ml-auto">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-1 lg:col-span-2 border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <div>
              <CardTitle className="text-base">Recent Activity</CardTitle>
              <CardDescription>Your latest actions</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {(data?.recentActivity || []).length === 0 && (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No recent activity yet. Start creating projects or uploading resources!
              </p>
            )}
            {(data?.recentActivity || []).map((activity, i) => (
              <div key={i} className="flex gap-3">
                <div className={`h-2 w-2 rounded-full mt-2 shrink-0 ${activity.type === "project" ? "bg-violet-400" : "bg-emerald-400"}`} />
                <div>
                  <p className="text-sm">
                    <span className="font-medium">{activity.user}</span>{" "}
                    {activity.action}{" "}
                    <span className="font-medium text-primary">{activity.target}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(activity.time).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
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
          { title: "Browse Projects", href: "/projects", icon: FolderKanban, desc: "Find teams to join", gradient: "from-violet-500/10 to-purple-500/10" },
          { title: "Knowledge Hub", href: "/knowledge", icon: BookOpen, desc: "Upload or find notes", gradient: "from-emerald-500/10 to-green-500/10" },
          { title: "Study Groups", href: "/study-groups", icon: Users, desc: "Join a study group", gradient: "from-amber-500/10 to-yellow-500/10" },
          { title: "Post an Idea", href: "/projects/create", icon: Plus, desc: "Start a new project", gradient: "from-pink-500/10 to-rose-500/10" },
        ].map((action) => (
          <Link key={action.title} href={action.href}>
            <Card className={`hover:shadow-lg hover:border-primary/30 transition-all cursor-pointer group border-border/50 bg-gradient-to-br ${action.gradient}`}>
              <CardContent className="p-5 flex items-center gap-4">
                <div className="bg-primary/10 p-2.5 rounded-xl group-hover:bg-primary/20 transition-colors">
                  <action.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">{action.title}</p>
                  <p className="text-xs text-muted-foreground">{action.desc}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
