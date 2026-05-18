"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Loader2, Shield, ShieldOff, UserX, UserPlus, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Member = {
  id: string;
  name: string;
  image: string | null;
  uid: string | null;
  role: string;
};

type ProjectDetail = {
  id: string;
  title: string;
  owner: { id: string };
  members: Member[];
};

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function ProjectMembersPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [groupAdmin, setGroupAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteUid, setInviteUid] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");

  const loadMembers = useCallback(async () => {
    setLoading(true);
    try {
      const [projectRes, groupRes] = await Promise.all([
        fetch(`/api/projects/${projectId}`),
        fetch(`/api/projects/${projectId}/group`),
      ]);

      if (projectRes.ok) setProject(await projectRes.json());
      if (groupRes.ok) {
        const group = await groupRes.json();
        setGroupAdmin(!!group.isAdmin);
      }
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  async function changeRole(userId: string, role: "ADMIN" | "MEMBER") {
    setActionId(userId);
    try {
      const res = await fetch(`/api/projects/${projectId}/members/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (res.ok) loadMembers();
    } finally {
      setActionId(null);
    }
  }

  async function removeMember(userId: string) {
    if (!confirm("Remove this member from the project?")) return;
    setActionId(userId);
    try {
      const res = await fetch(`/api/projects/${projectId}/members/${userId}`, { method: "DELETE" });
      if (res.ok) loadMembers();
    } finally {
      setActionId(null);
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteUid.trim()) return;
    
    setInviting(true);
    setInviteError("");
    setInviteSuccess("");
    
    try {
      const res = await fetch(`/api/projects/${projectId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: inviteUid.trim() }),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setInviteSuccess("User added successfully!");
        setInviteUid("");
        loadMembers();
        setTimeout(() => setInviteOpen(false), 2000);
      } else {
        setInviteError(data.error || "Failed to add user");
      }
    } catch (e) {
      setInviteError("Something went wrong");
    } finally {
      setInviting(false);
    }
  }

  function handleCopyLink() {
    const link = `${window.location.origin}/projects/${projectId}`;
    navigator.clipboard.writeText(link);
    alert("Project link copied to clipboard!");
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!project) {
    return <p className="text-center text-sm text-muted-foreground">Project not found.</p>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" render={<Link href={`/projects/${projectId}/workspace`} />}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="font-heading text-2xl font-bold">Members</h1>
          <p className="text-sm text-muted-foreground">{project.title}</p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Active Members</CardTitle>
          {groupAdmin && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handleCopyLink}>
                <Link2 className="mr-2 h-4 w-4" />
                Copy Link
              </Button>
              <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Invite
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Invite to Project</DialogTitle>
                    <DialogDescription>
                      Enter the user's UID to add them directly to the project.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleInvite} className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Input
                        placeholder="User UID (e.g. jdoe123)"
                        value={inviteUid}
                        onChange={(e) => setInviteUid(e.target.value)}
                        disabled={inviting}
                      />
                    </div>
                    {inviteError && <p className="text-sm text-destructive">{inviteError}</p>}
                    {inviteSuccess && <p className="text-sm text-green-500">{inviteSuccess}</p>}
                    <Button type="submit" className="w-full" disabled={inviting || !inviteUid.trim()}>
                      {inviting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Add Member
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {project.members.map((member) => {
            const isCreator = member.id === project.owner.id;
            const isAdmin = member.role === "ADMIN" || member.role === "LEADER";
            return (
              <div key={member.id} className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={member.image || undefined} />
                  <AvatarFallback>{initials(member.name || "User")}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{member.name}</p>
                  {member.uid && <p className="text-xs text-muted-foreground">#{member.uid}</p>}
                </div>
                <Badge variant={isAdmin ? "default" : "secondary"}>{isAdmin ? "ADMIN" : "MEMBER"}</Badge>
                {groupAdmin && !isCreator && (
                  <div className="flex gap-2">
                    {isAdmin ? (
                      <Button size="icon" variant="outline" onClick={() => changeRole(member.id, "MEMBER")} disabled={actionId === member.id}>
                        <ShieldOff className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button size="icon" variant="outline" onClick={() => changeRole(member.id, "ADMIN")} disabled={actionId === member.id}>
                        <Shield className="h-4 w-4" />
                      </Button>
                    )}
                    <Button size="icon" variant="outline" className="text-destructive" onClick={() => removeMember(member.id)} disabled={actionId === member.id}>
                      <UserX className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
