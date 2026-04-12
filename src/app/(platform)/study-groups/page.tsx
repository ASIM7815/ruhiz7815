"use client";

import { useEffect, useState } from "react";
import {
  Search,
  Plus,
  Users,
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

interface StudyGroup {
  id: string;
  name: string;
  subject: string;
  description: string | null;
  maxMembers: number;
  memberCount: number;
  avatars: string[];
}

export default function StudyGroupsPage() {
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
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
      setShowCreate(false);
      setForm({ name: "", subject: "", description: "", maxMembers: "10" });
      // Refresh
      const listRes = await fetch("/api/study-groups");
      const data = await listRes.json();
      setGroups(data.groups || []);
    }
    setCreating(false);
  }

  async function handleJoin(id: string) {
    const res = await fetch(`/api/study-groups/${id}/join`, { method: "POST" });
    if (res.ok) {
      // Refresh
      const listRes = await fetch("/api/study-groups");
      const data = await listRes.json();
      setGroups(data.groups || []);
    }
  }

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
                    onClick={() => handleJoin(group.id)}
                    disabled={group.memberCount >= group.maxMembers}
                  >
                    {group.memberCount >= group.maxMembers ? "Full" : "Join Group"}
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Study Group</DialogTitle>
            <DialogDescription>
              Start a new study group for your subject
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
            <Button onClick={handleCreate} className="w-full" disabled={creating || !form.name || !form.subject}>
              {creating ? "Creating..." : "Create Group"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
