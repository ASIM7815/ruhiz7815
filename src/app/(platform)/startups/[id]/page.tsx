"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSupabaseUser } from "@/hooks/use-supabase-user";
import {
  Rocket,
  Users,
  Target,
  Lightbulb,
  ArrowLeft,
  Loader2,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

interface Startup {
  id: string;
  name: string;
  problem: string;
  solution: string;
  stage: string;
  lookingFor: string | null;
  createdAt: string;
  founder: {
    id: string;
    name: string;
    image: string | null;
    university: string | null;
  };
  members: {
    id: string;
    name: string;
    image: string | null;
    role: string;
  }[];
}

interface JoinStatus {
  status: "none" | "pending" | "accepted" | "rejected";
}

const stageColors: Record<string, string> = {
  IDEA: "bg-yellow-500/10 text-yellow-700 border-yellow-200",
  VALIDATION: "bg-blue-500/10 text-blue-600 border-blue-200",
  BUILDING: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
};

const stageIcons: Record<string, typeof Lightbulb> = {
  IDEA: Lightbulb,
  VALIDATION: Target,
  BUILDING: Rocket,
};

export default function StartupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useSupabaseUser();
  const startupId = params.id as string;

  const [startup, setStartup] = useState<Startup | null>(null);
  const [joinStatus, setJoinStatus] = useState<JoinStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [startupRes, statusRes] = await Promise.all([
          fetch(`/api/startups/${startupId}`),
          user ? fetch(`/api/startups/${startupId}/join/status`) : null,
        ]);

        if (!startupRes.ok) {
          toast.error("Failed to load startup");
          router.push("/startups");
          return;
        }

        const startupData = await startupRes.json();
        setStartup(startupData);

        if (statusRes?.ok) {
          const statusData = await statusRes.json();
          setJoinStatus(statusData);
        }
      } catch (error) {
        console.error("Error loading startup:", error);
        toast.error("Failed to load startup");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [startupId, user, router]);

  async function handleJoinRequest() {
    setRequesting(true);
    try {
      const res = await fetch(`/api/startups/${startupId}/join`, {
        method: "POST",
      });

      if (res.ok) {
        toast.success("Join request sent!");
        setJoinStatus({ status: "pending" });
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to send request");
      }
    } catch (error) {
      console.error("Error sending join request:", error);
      toast.error("Failed to send request");
    } finally {
      setRequesting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!startup) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Startup not found</p>
        <Button className="mt-4" onClick={() => router.push("/startups")}>
          Back to Startups
        </Button>
      </div>
    );
  }

  const StageIcon = stageIcons[startup.stage] || Lightbulb;
  const isMember = startup.members.some((m) => m.id === user?.id);
  const isFounder = startup.founder.id === user?.id;

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push("/startups")}
        className="mb-2"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Startups
      </Button>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className={stageColors[startup.stage]}>
            <StageIcon className="h-3 w-3 mr-1" />
            {startup.stage.charAt(0) + startup.stage.slice(1).toLowerCase()}
          </Badge>
          <h1 className="font-heading text-2xl md:text-3xl font-bold">
            {startup.name}
          </h1>
        </div>
        {isMember ? (
          <Button onClick={() => router.push(`/startups/${startupId}/workspace`)}>
            <Rocket className="mr-2 h-4 w-4" />
            Open Workspace
          </Button>
        ) : joinStatus?.status === "pending" ? (
          <Button disabled variant="outline">
            <Clock className="mr-2 h-4 w-4" />
            Request Pending
          </Button>
        ) : joinStatus?.status === "rejected" ? (
          <Button disabled variant="outline">
            Request Rejected
          </Button>
        ) : (
          <Button onClick={handleJoinRequest} disabled={requesting}>
            {requesting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Clock className="mr-2 h-4 w-4" />
            )}
            Request to Join
          </Button>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <h2 className="font-heading text-lg font-semibold">Problem</h2>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {startup.problem}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="font-heading text-lg font-semibold">Solution</h2>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {startup.solution}
              </p>
            </CardContent>
          </Card>

          {startup.lookingFor && (
            <Card>
              <CardHeader>
                <h2 className="font-heading text-lg font-semibold">
                  Looking For
                </h2>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {startup.lookingFor.split(",").map((role, idx) => (
                    <Badge key={idx} variant="secondary">
                      {role.trim()}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h2 className="font-heading text-lg font-semibold flex items-center gap-2">
                <Users className="h-5 w-5" />
                Team ({startup.members.length})
              </h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {startup.members.map((member) => (
                  <div key={member.id} className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={member.image || undefined} />
                      <AvatarFallback>
                        {member.name?.charAt(0)?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {member.name}
                      </p>
                      <Badge
                        variant={
                          member.role === "FOUNDER" ? "default" : "secondary"
                        }
                        className="text-xs mt-1"
                      >
                        {member.role}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="font-heading text-lg font-semibold">Founder</h2>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={startup.founder.image || undefined} />
                  <AvatarFallback>
                    {startup.founder.name?.charAt(0)?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{startup.founder.name}</p>
                  {startup.founder.university && (
                    <p className="text-sm text-muted-foreground">
                      {startup.founder.university}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
