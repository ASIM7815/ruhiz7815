"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

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
    image: string | null;
    uid: string | null;
  };
};

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("OPEN");

  useEffect(() => {
    loadReports();
  }, [filter]);

  async function loadReports() {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports?status=${filter}`);
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports || []);
      }
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(reportId: string, status: string) {
    const res = await fetch(`/api/reports/${reportId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    if (res.ok) {
      loadReports();
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reports</h1>
        <p className="text-muted-foreground">Review and manage user reports</p>
      </div>

      <div className="flex gap-2">
        {["OPEN", "IN_REVIEW", "RESOLVED", "DISMISSED"].map((status) => (
          <Button
            key={status}
            variant={filter === status ? "default" : "outline"}
            onClick={() => setFilter(status)}
          >
            {status.replace("_", " ")}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : reports.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No {filter.toLowerCase()} reports
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <Card key={report.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">
                      {report.targetType} Report
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Reported by {report.reporter.name} on{" "}
                      {new Date(report.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge>{report.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium">Reason:</p>
                  <p className="text-sm text-muted-foreground">{report.reason}</p>
                </div>
                {report.details && (
                  <div>
                    <p className="text-sm font-medium">Details:</p>
                    <p className="text-sm text-muted-foreground">{report.details}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium">Target:</p>
                  <p className="text-sm text-muted-foreground">
                    {report.targetType} ID: {report.targetId}
                  </p>
                </div>
                {report.status === "OPEN" && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateStatus(report.id, "IN_REVIEW")}
                    >
                      Review
                    </Button>
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => updateStatus(report.id, "RESOLVED")}
                    >
                      Resolve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => updateStatus(report.id, "DISMISSED")}
                    >
                      Dismiss
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
