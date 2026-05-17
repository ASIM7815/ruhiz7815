"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle, Eye } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Report = {
  id: string;
  targetType: string;
  targetId: string;
  reason: string;
  details: string | null;
  status: string;
  createdAt: string;
  reporter: {
    id: string;
    name: string;
    email: string;
  };
};

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("OPEN");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadReports();
  }, [statusFilter]);

  async function loadReports() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      
      const res = await fetch(`/api/reports?${params}`);
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports || []);
      }
    } finally {
      setLoading(false);
    }
  }

  async function updateReportStatus(reportId: string, status: string) {
    setActionLoading(reportId);
    try {
      const res = await fetch(`/api/reports/${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (res.ok) {
        setReports((prev) =>
          prev.map((r) => (r.id === reportId ? { ...r, status } : r))
        );
      }
    } finally {
      setActionLoading(null);
    }
  }

  function getTargetLink(report: Report) {
    switch (report.targetType) {
      case "PROJECT":
        return `/projects/${report.targetId}`;
      case "LISTING":
        return `/marketplace/${report.targetId}`;
      case "USER":
        return `/students/${report.targetId}`;
      default:
        return null;
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reports</h1>
          <p className="text-muted-foreground">Review and moderate user reports</p>
        </div>
        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value || "OPEN")}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="OPEN">Open</SelectItem>
            <SelectItem value="IN_REVIEW">In Review</SelectItem>
            <SelectItem value="RESOLVED">Resolved</SelectItem>
            <SelectItem value="DISMISSED">Dismissed</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        {reports.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No reports found</p>
            </CardContent>
          </Card>
        ) : (
          reports.map((report) => (
            <Card key={report.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">{report.targetType}</Badge>
                      <Badge
                        variant={
                          report.status === "OPEN"
                            ? "destructive"
                            : report.status === "IN_REVIEW"
                            ? "secondary"
                            : "default"
                        }
                      >
                        {report.status}
                      </Badge>
                    </div>
                    <h3 className="font-semibold mb-1">{report.reason}</h3>
                    {report.details && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {report.details}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Reported by: {report.reporter.name}</span>
                      <span>•</span>
                      <span>{new Date(report.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {getTargetLink(report) && (
                      <Button
                        size="sm"
                        variant="outline"
                        render={
                          <a
                            href={getTargetLink(report)!}
                            target="_blank"
                            rel="noopener noreferrer"
                          />
                        }
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    )}
                    {report.status === "OPEN" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateReportStatus(report.id, "IN_REVIEW")}
                        disabled={actionLoading === report.id}
                      >
                        Review
                      </Button>
                    )}
                    {(report.status === "OPEN" || report.status === "IN_REVIEW") && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => updateReportStatus(report.id, "RESOLVED")}
                          disabled={actionLoading === report.id}
                          className="bg-emerald-600 hover:bg-emerald-700"
                        >
                          {actionLoading === report.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Resolve
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateReportStatus(report.id, "DISMISSED")}
                          disabled={actionLoading === report.id}
                          className="text-destructive"
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Dismiss
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
