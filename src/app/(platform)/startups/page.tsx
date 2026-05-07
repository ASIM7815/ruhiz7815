"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  Search,
  Rocket,
  Users,
  Target,
  Lightbulb,
  CheckCircle2,
  XCircle,
  Inbox,
  Loader2,
  Clock,
} from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface Startup {
  id: string;
  name: string;
  problem: string;
  solution: string;
  stage: string;
  lookingFor: string | null;
  founder: { id: string; name: string; image: string | null; university: string | null };
  members: { id: string; name: string; image: string | null; role: string }[];
}

interface JoinRequest {
  id: string;
  userId: string;
  status: string;
  createdAt: string;
  user: { id: string; name: string; image: string | null; uid: string | null; university: string | null };
}

interface MyStartup extends Startup {
  pendingRequests: JoinRequest[];
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

export default function StartupsPage() {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const [tab, setTab] = useState<"browse" | "mine">("browse");
  const [startups, setStartups] = useState<Startup[]>([]);
  const [myStartups, setMyStartups] = useState<MyStartup[]>([]);
  const [loading, setLoading] = useState(true);
  const [myLoading, setMyLoading] = useState(false);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [requestingId, setRequestingId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    problem: "",
    solution: "",
    stage: "IDEA",
    lookingFor: "",
  });

  useEffect(() => {
    const params = new URLSearchParams();
    if (filter === "Idea") params.set("stage", "IDEA");
    if (filter === "Validation") params.set("stage", "VALIDATION");
    if (filter === "Building") params.set("stage", "BUILDING");
    fetch(`/api/startups?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setStartups(data.startups || []);
        setLoading(false);
      });
  }, [filter]);

  const loadMyStartups = useCallback(async () => {
    if (!userId) return;
    setMyLoading(true);
    try {
      const res = await fetch("/api/startups?founder=me");
      const data = await res.json();
      const owned: Startup[] = data.startups || [];
      const withRequests = await Promise.all(
        owned.map(async (s) => {
          const rr = await fetch(`/api/startups/${s.id}/join`);
          const reqs = rr.ok ? await rr.json() : [];
          return { ...s, pendingRequests: reqs } as MyStartup;
        })
      );
      setMyStartups(withRequests);
    } finally {
      setMyLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (tab === "mine") loadMyStartups();
  }, [tab, loadMyStartups]);

  const filtered = search
    ? startups.filter((s) =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.problem.toLowerCase().includes(search.toLowerCase())
      )
    : startups;

  async function handleCreate() {
    if (!form.name || !form.problem || !form.solution) return;
    setCreating(true);
    const res = await fetch("/api/startups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        problem: form.problem,
        solution: form.solution,
        stage: form.stage,
        lookingFor: form.lookingFor || null,
      }),
    });
    if (res.ok) {
      toast.success("Startup pitch created!");
      setShowCreate(false);
      setForm({ name: "", problem: "", solution: "", stage: "IDEA", lookingFor: "" });
      const params = new URLSearchParams();
      if (filter !== "All") params.set("stage", filter.toUpperCase());
      const listRes = await fetch(`/api/startups?${params}`);
      const data = await listRes.json();
      setStartups(data.startups || []);
    } else {
      toast.error("Failed to create startup.");
    }
    setCreating(false);
  }

  async function handleJoinRequest(startupId: string) {
    setRequestingId(startupId);
    try {
      const res = await fetch(`/api/startups/${startupId}/join`, { method: "POST" });
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

  async function handleRequest(startupId: string, requestId: string, action: "ACCEPTED" | "REJECTED") {
    setActionLoading(requestId);
    try {
      await fetch(`/api/startups/${startupId}/join/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: action }),
      });
      setMyStartups((prev) =>
        prev.map((s) =>
          s.id === startupId
            ? { ...s, pendingRequests: s.pendingRequests.filter((r) => r.id !== requestId) }
            : s
        )
      );
      toast.success(action === "ACCEPTED" ? "Co-founder accepted!" : "Request rejected.");
    } finally {
      setActionLoading(null);
    }
  }

  const totalPending = myStartups.reduce((s, st) => s + st.pendingRequests.length, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold">
            Startup Hub
          </h1>
          <p className="text-muted-foreground mt-1">
            Pitch ideas, find co-founders, and build startups
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Rocket className="mr-2 h-4 w-4" />
          Pitch an Idea
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
          Browse Startups
        </button>
        <button
          onClick={() => setTab("mine")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
            tab === "mine" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          My Startups
          {totalPending > 0 && (
            <span className="bg-primary text-primary-foreground text-xs rounded-full px-2 py-0.5 min-w-[20px] text-center">
              {totalPending}
            </span>
          )}
        </button>
      </div>

      {tab === "browse" ? (
        <>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search startup pitches..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              {["All", "Idea", "Validation", "Building"].map((stage) => (
                <Badge
                  key={stage}
                  variant={filter === stage ? "default" : "outline"}
                  className="cursor-pointer hover:bg-primary/10 px-4 py-1.5"
                  onClick={() => setFilter(stage)}
                >
                  {stage}
                </Badge>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-64 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Rocket className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No startup pitches yet.</p>
                <Button className="mt-4" onClick={() => setShowCreate(true)}>
                  <Rocket className="mr-2 h-4 w-4" />
                  Pitch the first idea!
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filtered.map((startup) => {
                const StageIcon = stageIcons[startup.stage] || Lightbulb;
                return (
                  <Card
                    key={startup.id}
                    className="group hover:shadow-lg hover:border-primary/30 transition-all"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className={stageColors[startup.stage]}>
                          <StageIcon className="h-3 w-3 mr-1" />
                          {startup.stage.charAt(0) + startup.stage.slice(1).toLowerCase()}
                        </Badge>
                      </div>
                      <h3 className="font-heading text-lg font-semibold mt-2 group-hover:text-primary transition-colors">
                        {startup.name}
                      </h3>
                    </CardHeader>
                    <CardContent className="pb-3 space-y-3">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Problem</p>
                        <p className="text-sm text-muted-foreground line-clamp-2">{startup.problem}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Solution</p>
                        <p className="text-sm text-muted-foreground line-clamp-2">{startup.solution}</p>
                      </div>
                      {startup.lookingFor && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Looking For</p>
                          <div className="flex flex-wrap gap-1.5">
                            {startup.lookingFor.split(",").map((role) => (
                              <Badge key={role} variant="secondary" className="text-xs">
                                {role.trim()}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                    <CardFooter className="pt-3 border-t">
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <div className="flex -space-x-2">
                            {startup.members.slice(0, 3).map((m) => (
                              <Avatar key={m.id} className="h-7 w-7 border-2 border-background">
                                <AvatarImage src={m.image || undefined} />
                                <AvatarFallback>{m.name?.charAt(0)?.toUpperCase() || "U"}</AvatarFallback>
                              </Avatar>
                            ))}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {startup.members.length} member{startup.members.length > 1 ? "s" : ""}
                          </span>
                        </div>
                        {startup.founder.id !== userId ? (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleJoinRequest(startup.id)}
                            disabled={requestingId === startup.id}
                          >
                            {requestingId === startup.id ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-1" />
                            ) : (
                              <Clock className="h-3.5 w-3.5 mr-1" />
                            )}
                            Request to Join
                          </Button>
                        ) : (
                          <Badge variant="outline" className="text-xs">Your startup</Badge>
                        )}
                      </div>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      ) : (
        /* My Startups Tab */
        myLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-64 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : myStartups.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">You haven&apos;t pitched any startup ideas yet.</p>
              <Button className="mt-4" onClick={() => setShowCreate(true)}>
                <Rocket className="mr-2 h-4 w-4" />
                Pitch your first idea
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {myStartups.map((startup) => {
              const StageIcon = stageIcons[startup.stage] || Lightbulb;
              return (
                <Card key={startup.id} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className={stageColors[startup.stage]}>
                          <StageIcon className="h-3 w-3 mr-1" />
                          {startup.stage.charAt(0) + startup.stage.slice(1).toLowerCase()}
                        </Badge>
                        <h3 className="font-heading text-lg font-semibold">{startup.name}</h3>
                      </div>
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {startup.members.length} members
                      </span>
                    </div>
                  </CardHeader>
                  {startup.pendingRequests.length > 0 ? (
                    <CardContent className="pt-0">
                      <div className="border rounded-lg">
                        <div className="px-4 py-2.5 bg-muted/50 border-b flex items-center gap-2">
                          <Inbox className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium">
                            Pending Requests ({startup.pendingRequests.length})
                          </span>
                        </div>
                        <div className="divide-y">
                          {startup.pendingRequests.map((req) => (
                            <div key={req.id} className="p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                              <Avatar className="h-10 w-10 shrink-0">
                                <AvatarImage src={req.user.image || undefined} />
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
                                  onClick={() => handleRequest(startup.id, req.id, "ACCEPTED")}
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
                                  onClick={() => handleRequest(startup.id, req.id, "REJECTED")}
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
              );
            })}
          </div>
        )
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Pitch a Startup Idea</DialogTitle>
            <DialogDescription>
              Share your idea and find co-founders
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Startup Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. StudyBuddy"
              />
            </div>
            <div className="space-y-2">
              <Label>Stage</Label>
              <Select value={form.stage} onValueChange={(v) => v && setForm({ ...form, stage: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="IDEA">Idea</SelectItem>
                  <SelectItem value="VALIDATION">Validation</SelectItem>
                  <SelectItem value="BUILDING">Building</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Problem</Label>
              <Textarea
                value={form.problem}
                onChange={(e) => setForm({ ...form, problem: e.target.value })}
                placeholder="What problem are you solving?"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Solution</Label>
              <Textarea
                value={form.solution}
                onChange={(e) => setForm({ ...form, solution: e.target.value })}
                placeholder="How will you solve it?"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Looking For (comma-separated)</Label>
              <Input
                value={form.lookingFor}
                onChange={(e) => setForm({ ...form, lookingFor: e.target.value })}
                placeholder="e.g. Frontend Dev, Designer, Marketing"
              />
            </div>
            <Button onClick={handleCreate} className="w-full" disabled={creating || !form.name || !form.problem || !form.solution}>
              {creating ? "Creating..." : "Pitch Idea"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
