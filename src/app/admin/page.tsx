import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FolderKanban, ShoppingBag, Flag } from "lucide-react";
import { getRecentAuditLogs } from "@/lib/services/audit-log";
import { formatRelativeTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const [userCount, projectCount, listingCount, reportCount, recentLogs] = await Promise.all([
    db.user.count(),
    db.project.count(),
    db.listing.count(),
    db.report.count({ where: { status: "OPEN" } }),
    getRecentAuditLogs(10),
  ]);

  const stats = [
    { label: "Total Users", value: userCount, icon: Users, color: "text-blue-600" },
    { label: "Total Projects", value: projectCount, icon: FolderKanban, color: "text-green-600" },
    { label: "Active Listings", value: listingCount, icon: ShoppingBag, color: "text-purple-600" },
    { label: "Open Reports", value: reportCount, icon: Flag, color: "text-red-600" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">Platform overview and statistics</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {recentLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent activity</p>
          ) : (
            <div className="space-y-3">
              {recentLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 text-sm">
                  <div className="flex-1">
                    <p className="font-medium">{log.actor.name}</p>
                    <p className="text-muted-foreground">
                      {log.action.replace(/_/g, " ").toLowerCase()} {log.entityType.toLowerCase()}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatRelativeTime(log.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
