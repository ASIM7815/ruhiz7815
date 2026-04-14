"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Search,
  Plus,
  Users,
  CheckCircle2,
  XCircle,
  Inbox,
  Loader2,
  Clock,
  Upload,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import Link from "next/link";

interface StudyGroup {
  id: string;
  name: string;
  subject: string;
  description: string | null;
  maxMembers: number;
  memberCount: number;
  avatars: string[];
}

interface JoinRequest {
  id: string;
  userId: string;
  status: string;
  createdAt: string;
  user: { id: string; name: string; image: string | null; uid: string | null; university: string | null };
}

interface MyGroup extends StudyGroup {
  pendingRequests: JoinRequest[];
  isLeader: boolean;
}

export default function StudyGroupsPage() {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const [tab, setTab] = useState<"browse" | "mine">("browse");
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [myGroups, setMyGroups] = useState<MyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [myLoading, setMyLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [requestingId, setRequestingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    subject: "",
    description: "",
    maxMembers: "10",
  });

  useEffect(() => {
    fetch("/api/study-groups")
      .then((r) => r.json())
      .then((data) => {
        setGroups(data.groups || []);
        setLoading(false);
      });
  }, []);

  const loadMyGroups = useCallback(async () => {
    if (!userId) return;
    setMyLoading(true);
    try {
      const res = await fetch("/api/study-groups");
      const data = await res.json();
      const allGroups: StudyGroup[] = data.groups || [];

      // For each group, check if user is a leader and get requests
      const withDetails = await Promise.all(
        allGroups.map(async (g) => {
          const reqRes = await fetch(`/api/study-groups/${g.id}/join`);
          const isLeader = reqRes.ok;
          const pendingRequests = isLeader ? await reqRes.json() : [];
          return { ...g, isLeader, pendingRequests } as MyGroup;
        })
      );
      setMyGroups(withDetails.filter((g) => g.isLeader));
    } finally {
      setMyLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (tab === "mine") loadMyGroups();
  }, [tab, loadMyGroups]);

  const filtered = search
    ? groups.filter(
        (g) =>
          g.name.toLowerCase().includes(search.toLowerCase()) ||
          g.subject.toLowerCase().includes(search.toLowerCase())
      )
    : groups;

  async function handleCreate() {
    if (!form.name || !form.subject) return;
    setCreating(true);
    const res = await fetch("/api/study-groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        subject: form.subject,
        description: form.description || null,
        maxMembers: parseInt(form.maxMembers) || 10,
      }),
    });
    if (res.ok) {
      toast.success("Study group created!");
      setShowCreate(false);
      setForm({ name: "", subject: "", description: "", maxMembers: "10" });
      const listRes = await fetch("/api/study-groups");
      const data = await listRes.json();
      setGroups(data.groups || []);
    } else {
      const err = await res.json();
      toast.error(err.error || "Failed to create group.");
    }
    setCreating(false);
  }

  async function handleJoinRequest(groupId: string) {
    setRequestingId(groupId);
    try {
      const res = await fetch(`/api/study-groups/${groupId}/join`, { method: "POST" });
      if (res.ok) {
        toast.success("Join request sent!");
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to send request.");
      }
    } finally {
      setRequestingId(null);
    }
  }

  async function handleRequest(groupId: string, requestId: string, action: "ACCEPTED" | "REJECTED") {
    setActionLoading(requestId);
    try {
      await fetch(`/api/study-groups/${groupId}/join/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: action }),
      });
      setMyGroups((prev) =>
        prev.map((g) =>
          g.id === groupId
            ? { ...g, pendingRequests: g.pendingRequests.filter((r) => r.id !== requestId) }
            : g
        )
      );
      toast.success(action === "ACCEPTED" ? "Member accepted!" : "Request rejected.");
    } finally {
      setActionLoading(null);
    }
  }

  const totalPending = myGroups.reduce((s, g) => s + g.pendingRequests.length, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold">
            Study Groups
          </h1>
          <p className="text-muted-foreground mt-1">
            Join subject-based study groups and learn together
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Group
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
        <button
          onClick={() => setTab("browse")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === "browse" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Browse Groups
        </button>
        <button
          onClick={() => setTab("mine")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
            tab === "mine" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          My Groups
          {totalPending > 0 && (
            <span className="bg-primary text-primary-foreground text-xs rounded-full px-2 py-0.5 min-w-[20px] text-center">
              {totalPending}
            </span>
          )}
        </button>
      </div>

      {tab === "browse" ? (
        <>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search study groups..."
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-48 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-muted-foreground">No study groups found.</p>
                <Button className="mt-4" onClick={() => setShowCreate(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create the first one!
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filtered.map((group) => (
                <Card
                  key={group.id}
                  className="group hover:shadow-lg hover:border-primary/30 transition-all"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-heading text-lg font-semibold group-hover:text-primary transition-colors">
                          {group.name}
                        </h3>
                        <Badge variant="secondary" className="text-xs mt-1">
                          {group.subject}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-3">
                    {group.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {group.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {group.memberCount}/{group.maxMembers} members
                      </span>
                    </div>
                  </CardContent>
                  <CardFooter className="pt-3 border-t">
                    <div className="flex items-center justify-between w-full">
                      <div className="flex -space-x-2">
                        {group.avatars.slice(0, 3).map((avatar, i) => (
                          <Avatar key={i} className="h-7 w-7 border-2 border-background">
                            <AvatarImage src={avatar} />
                            <AvatarFallback>U</AvatarFallback>
                          </Avatar>
                        ))}
                        {group.memberCount > 3 && (
                          <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-muted text-[10px] font-medium">
                            +{group.memberCount - 3}
                          </div>
                        )}
                      </div>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleJoinRequest(group.id)}
                        disabled={group.memberCount >= group.maxMembers || requestingId === group.id}
                      >
                        {requestingId === group.id ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-1" />
                        ) : group.memberCount >= group.maxMembers ? null : (
                          <Clock className="h-3.5 w-3.5 mr-1" />
                        )}
                        {group.memberCount >= group.maxMembers ? "Full" : "Request to Join"}
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </>
      ) : (
        /* My Groups Tab */
        myLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-48 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : myGroups.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">You haven&apos;t created any study groups yet.</p>
              <Button className="mt-4" onClick={() => setShowCreate(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create your first group
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {myGroups.map((group) => (
              <Card key={group.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <h3 className="font-heading text-lg font-semibold">{group.name}</h3>
                      <Badge variant="secondary" className="text-xs">{group.subject}</Badge>
                    </div>
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {group.memberCount}/{group.maxMembers}
                    </span>
                  </div>
                </CardHeader>
                {group.pendingRequests.length > 0 ? (
                  <CardContent className="pt-0">
                    <div className="border rounded-lg">
                      <div className="px-4 py-2.5 bg-muted/50 border-b flex items-center gap-2">
                        <Inbox className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">
                          Pending Requests ({group.pendingRequests.length})
                        </span>
                      </div>
                      <div className="divide-y">
                        {group.pendingRequests.map((req) => (
                          <div key={req.id} className="p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                            <Avatar className="h-10 w-10 shrink-0">
                              <AvatarImage src={req.user.image || ""} />
                              <AvatarFallback>{req.user.name?.charAt(0)?.toUpperCase() || "U"}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm">{req.user.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {req.user.university || ""} {req.user.uid ? `· #${req.user.uid}` : ""}
                              </p>
                            </div>
                            <div className="flex gap-2 w-full sm:w-auto sm:shrink-0">
                              <Button
                                size="sm"
                                onClick={() => handleRequest(group.id, req.id, "ACCEPTED")}
                                disabled={actionLoading === req.id}
                                className="bg-emerald-600 hover:bg-emerald-700"
                              >
                                {actionLoading === req.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="h-4 w-4 mr-1" />
                                )}
                                Accept
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRequest(group.id, req.id, "REJECTED")}
                                disabled={actionLoading === req.id}
                                className="border-red-300 text-red-600 hover:bg-red-50"
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                ) : (
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground">No pending join requests</p>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Study Group</DialogTitle>
            <DialogDescription>
              Start a new study group. You must have uploaded at least 1 resource to the Knowledge Hub.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Group Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Data Structures Study Circle"
              />
            </div>
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="e.g. Data Structures & Algorithms"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="What will the group focus on?"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Max Members</Label>
              <Input
                type="number"
                min="2"
                max="50"
                value={form.maxMembers}
                onChange={(e) => setForm({ ...form, maxMembers: e.target.value })}
              />
            </div>
            <div className="p-3 bg-muted/50 rounded-lg flex items-start gap-2">
              <Upload className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">
                Prerequisite: You must have uploaded at least 1 resource to the <Link href="/knowledge" className="text-primary underline">Knowledge Hub</Link> before creating a group.
              </p>
            </div>
            <Button onClick={handleCreate} className="w-full" disabled={creating || !form.name || !form.subject}>
              {creating ? "Creating..." : "Create Group"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
