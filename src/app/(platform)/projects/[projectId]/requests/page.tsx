"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, Inbox, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

type JoinRequest = {
  id: string;
  message: string | null;
  status: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    image: string | null;
    uid: string | null;
    university: string | null;
    bio: string | null;
  };
};

function initial(name: string) {
  return name?.charAt(0)?.toUpperCase() || "U";
}

export default function ProjectRequestsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/projects/${projectId}/join`);
      if (!res.ok) {
        setError(res.status === 403 ? "Only project admins can manage join requests." : "Could not load requests.");
        return;
      }
      setRequests(await res.json());
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  async function reviewRequest(requestId: string, status: "ACCEPTED" | "REJECTED") {
    setActionId(requestId);
    try {
      const res = await fetch(`/api/projects/${projectId}/join/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (res.ok) {
        setRequests((current) => current.filter((request) => request.id !== requestId));
      }
    } finally {
      setActionId(null);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" render={<Link href={`/projects/${projectId}`} />}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="font-heading text-2xl font-bold">Join Requests</h1>
          <p className="text-sm text-muted-foreground">Review students who want to join this project.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Inbox className="h-4 w-4" />
            Pending Requests
            <Badge variant="secondary">{requests.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{error}</p>
          ) : requests.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No pending requests.</p>
          ) : (
            requests.map((request) => (
              <div key={request.id} className="flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center">
                <Avatar className="h-11 w-11">
                  <AvatarImage src={request.user.image || undefined} />
                  <AvatarFallback>{initial(request.user.name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{request.user.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {request.user.university || "Student"}
                    {request.user.uid ? ` · #${request.user.uid}` : ""}
                  </p>
                  {request.message && <p className="mt-2 text-sm text-muted-foreground">&ldquo;{request.message}&rdquo;</p>}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => reviewRequest(request.id, "ACCEPTED")}
                    disabled={actionId === request.id}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    {actionId === request.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1 h-4 w-4" />}
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => reviewRequest(request.id, "REJECTED")}
                    disabled={actionId === request.id}
                    className="border-red-300 text-red-600 hover:bg-red-50"
                  >
                    <XCircle className="mr-1 h-4 w-4" />
                    Reject
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
