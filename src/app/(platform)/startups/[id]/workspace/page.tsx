"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSupabaseUser } from "@/hooks/use-supabase-user";
import { ArrowLeft, MessageSquare, Users, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { GroupChat } from "@/components/group-chat";
import { toast } from "sonner";

interface Startup {
  id: string;
  name: string;
  stage: string;
  members: {
    id: string;
    name: string;
    image: string | null;
    role: string;
  }[];
}

interface StartupGroup {
  id: string;
  name: string;
  isAdmin: boolean;
}

export default function StartupWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useSupabaseUser();
  const startupId = params.id as string;

  const [startup, setStartup] = useState<Startup | null>(null);
  const [group, setGroup] = useState<StartupGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"chat" | "members">("chat");

  useEffect(() => {
    async function load() {
      try {
        const [startupRes, groupRes] = await Promise.all([
          fetch(`/api/startups/${startupId}`),
          fetch(`/api/startups/${startupId}/group`),
        ]);

        if (!startupRes.ok) {
          toast.error("Failed to load startup");
          router.push("/startups");
          return;
        }

        if (!groupRes.ok) {
          toast.error("You don't have access to this workspace");
          router.push(`/startups/${startupId}`);
          return;
        }

        const [startupData, groupData] = await Promise.all([
          startupRes.json(),
          groupRes.json(),
        ]);

        setStartup(startupData);
        setGroup(groupData);
      } catch (error) {
        console.error("Error loading workspace:", error);
        toast.error("Failed to load workspace");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [startupId, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!startup || !group) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Workspace not found</p>
        <Button className="mt-4" onClick={() => router.push("/startups")}>
          Back to Startups
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/startups/${startupId}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="font-heading text-2xl md:text-3xl font-bold">
              {startup.name}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {startup.stage.charAt(0) + startup.stage.slice(1).toLowerCase()} Stage
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
        <button
          onClick={() => setTab("chat")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
            tab === "chat"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <MessageSquare className="h-4 w-4" />
          Chat
        </button>
        <button
          onClick={() => setTab("members")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
            tab === "members"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users className="h-4 w-4" />
          Team ({startup.members.length})
        </button>
      </div>

      {tab === "chat" ? (
        <Card className="h-[600px]">
          <CardContent className="p-0 h-full">
            <GroupChat groupId={group.id} />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {startup.members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={member.image || undefined} />
                    <AvatarFallback>
                      {member.name?.charAt(0)?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{member.name}</p>
                    <Badge
                      variant={member.role === "FOUNDER" ? "default" : "secondary"}
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
      )}
    </div>
  );
}
