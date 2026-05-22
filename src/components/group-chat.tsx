"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSupabaseUser } from "@/hooks/use-supabase-user";
import NextImage from "next/image";
import { supabase } from "@/lib/supabase-client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Send,
  Image as ImageIcon,
  FileText,
  MapPin,
  Users,
  LogOut,
  Shield,
  ShieldOff,
  UserX,
  Lock,
  Unlock,
} from "lucide-react";
import { cn } from "@/lib/utils";

const GROUP_MESSAGES_POLL_MS = 2500;

interface GroupMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  message_type: string;
  file_url: string | null;
  created_at: string;
}

interface GroupMember {
  user_id: string;
  role: string;
  can_share_media: boolean;
  user: { id: string; name: string; image: string | null; uid: string | null };
}

interface GroupConvDetails {
  id: string;
  name: string;
  type: string;
  entity_id: string;
  myRole: string;
  canShareMedia: boolean;
}

interface GroupChatProps {
  groupId: string;
  onBack?: () => void;
}

function sortMessages(messages: GroupMessage[]) {
  return [...messages].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
}

function isOptimisticMessage(message: GroupMessage) {
  return message.id.startsWith("temp-");
}

function matchesOptimisticMessage(optimistic: GroupMessage, saved: GroupMessage) {
  if (!isOptimisticMessage(optimistic)) return false;
  const sentCloseTogether =
    Math.abs(new Date(optimistic.created_at).getTime() - new Date(saved.created_at).getTime()) < 30000;

  return (
    sentCloseTogether &&
    optimistic.sender_id === saved.sender_id &&
    optimistic.message_type === saved.message_type &&
    optimistic.content === saved.content
  );
}

function mergeFetchedMessages(current: GroupMessage[], fetched: GroupMessage[]) {
  const pendingMessages = current.filter(
    (message) =>
      isOptimisticMessage(message) &&
      !fetched.some((savedMessage) => matchesOptimisticMessage(message, savedMessage))
  );

  return sortMessages([...fetched, ...pendingMessages]);
}

function mergeIncomingMessage(current: GroupMessage[], incoming: GroupMessage) {
  let replacedOptimisticMessage = false;
  const withoutDuplicates = current.filter((message) => {
    if (message.id === incoming.id) return false;
    if (!replacedOptimisticMessage && matchesOptimisticMessage(message, incoming)) {
      replacedOptimisticMessage = true;
      return false;
    }
    return true;
  });

  return sortMessages([...withoutDuplicates, incoming]);
}

export function GroupChat({ groupId, onBack }: GroupChatProps) {
  const { user } = useSupabaseUser();
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [group, setGroup] = useState<GroupConvDetails | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [memberCount, setMemberCount] = useState(0);
  const [showMembers, setShowMembers] = useState(false);
  const [sending, setSending] = useState(false);
  const [userNames, setUserNames] = useState<Record<string, { name: string; image: string | null }>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<GroupMessage[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const loadMessages = useCallback(async () => {
    if (!groupId) return;

    const res = await fetch(`/api/groups/${groupId}/messages`);
    if (!res.ok) return;

    const data = await res.json();
    const fetchedMessages = (data.messages || []) as GroupMessage[];
    const previousLastId = messagesRef.current.at(-1)?.id;
    const fetchedLastId = fetchedMessages.at(-1)?.id;

    setMessages((prev) => mergeFetchedMessages(prev, fetchedMessages));

    if (fetchedLastId && fetchedLastId !== previousLastId) {
      setTimeout(scrollToBottom, 100);
    }
  }, [groupId, scrollToBottom]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Load group details
  useEffect(() => {
    if (!groupId) return;
    fetch(`/api/groups/${groupId}`)
      .then((r) => r.json())
      .then(setGroup)
      .catch(console.error);
  }, [groupId]);

  // Load messages
  useEffect(() => {
    if (!groupId) return;
    const timeoutId = window.setTimeout(() => {
      loadMessages().catch(console.error);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [groupId, loadMessages]);

  // Load members
  useEffect(() => {
    if (!groupId) return;
    fetch(`/api/groups/${groupId}/members`)
      .then((r) => r.json())
      .then((data) => {
        setMembers(data.members || []);
        setMemberCount(data.count || 0);
        // Build userNames from members
        const names: Record<string, { name: string; image: string | null }> = {};
        (data.members || []).forEach((m: GroupMember) => {
          if (m.user) names[m.user_id] = { name: m.user.name, image: m.user.image };
        });
        setUserNames((prev) => ({ ...prev, ...names }));
      })
      .catch(console.error);
  }, [groupId]);

  // Real-time subscription
  useEffect(() => {
    if (!groupId) return;
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function subscribeToGroupMessages() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.access_token) {
        supabase.realtime.setAuth(session.access_token);
      }

      if (cancelled) return;

      channel = supabase
        .channel(`group-${groupId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "group_messages", filter: `conversation_id=eq.${groupId}` },
          (payload) => {
            const msg = payload.new as GroupMessage;
            setMessages((prev) => mergeIncomingMessage(prev, msg));
            setTimeout(scrollToBottom, 100);
          }
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            loadMessages().catch(console.error);
          }
        });
    }

    subscribeToGroupMessages().catch(console.error);

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [groupId, loadMessages, scrollToBottom]);

  // Realtime is ideal, but this keeps chats live when Supabase Realtime is delayed
  // or not enabled for the table in a local/project environment.
  useEffect(() => {
    if (!groupId) return;

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        loadMessages().catch(console.error);
      }
    }, GROUP_MESSAGES_POLL_MS);

    return () => window.clearInterval(intervalId);
  }, [groupId, loadMessages]);

  async function handleSend() {
    if (!newMessage.trim() || sending) return;
    setSending(true);
    const content = newMessage.trim();
    setNewMessage("");

    // Optimistic update
    const optimistic: GroupMessage = {
      id: `temp-${Date.now()}`,
      conversation_id: groupId,
      sender_id: user?.id || "",
      content,
      message_type: "TEXT",
      file_url: null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setTimeout(scrollToBottom, 50);

    try {
      const res = await fetch(`/api/groups/${groupId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        const real = await res.json();
        setMessages((prev) => mergeIncomingMessage(prev, real));
      } else {
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      }
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
    }
    setSending(false);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", "groupChat");
    formData.append("entityId", groupId);

    try {
      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
      if (!uploadRes.ok) {
        console.error("Upload failed");
        return;
      }
      const { url } = await uploadRes.json();

      const messageType = file.type.startsWith("image/") ? "IMAGE" : "PDF";
      const messageRes = await fetch(`/api/groups/${groupId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: file.name, messageType, fileUrl: url }),
      });

      if (messageRes.ok) {
        const real = await messageRes.json();
        setMessages((prev) => mergeIncomingMessage(prev, real));
        setTimeout(scrollToBottom, 100);
      }
    } catch {
      console.error("Upload failed");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleLeaveGroup() {
    if (!confirm("Are you sure you want to leave this group?")) return;
    const res = await fetch(`/api/groups/${groupId}/leave`, { method: "POST" });
    if (res.ok) onBack?.();
  }

  async function handleMakeAdmin(userId: string) {
    await fetch(`/api/groups/${groupId}/members/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "ADMIN" }),
    });
    setMembers((prev) => prev.map((m) => (m.user_id === userId ? { ...m, role: "ADMIN" } : m)));
  }

  async function handleRemoveAdmin(userId: string) {
    await fetch(`/api/groups/${groupId}/members/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "MEMBER" }),
    });
    setMembers((prev) => prev.map((m) => (m.user_id === userId ? { ...m, role: "MEMBER" } : m)));
  }

  async function handleRemoveMember(userId: string) {
    if (!confirm("Remove this member?")) return;
    const res = await fetch(`/api/groups/${groupId}/members/${userId}`, { method: "DELETE" });
    if (res.ok) {
      setMembers((prev) => prev.filter((m) => m.user_id !== userId));
      setMemberCount((c) => c - 1);
    }
  }

  async function handleToggleMedia(userId: string, current: boolean) {
    await fetch(`/api/groups/${groupId}/members/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ canShareMedia: !current }),
    });
    setMembers((prev) =>
      prev.map((m) => (m.user_id === userId ? { ...m, can_share_media: !current } : m))
    );
  }

  function getSenderName(senderId: string) {
    if (senderId === user?.id) return "You";
    return userNames[senderId]?.name || "Unknown";
  }

  function getSenderImage(senderId: string) {
    return userNames[senderId]?.image || null;
  }

  const isAdmin = group?.myRole === "ADMIN";

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b bg-card/50 backdrop-blur-sm">
        {onBack && (
          <Button variant="ghost" size="sm" onClick={onBack}>
            ←
          </Button>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate">{group?.name || "Group"}</h3>
          <p className="text-xs text-muted-foreground">{memberCount} members</p>
        </div>
        <div className="flex gap-1">
          <Dialog open={showMembers} onOpenChange={setShowMembers}>
            <DialogTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8" />}>
              <Users className="h-4 w-4" />
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Group Members</DialogTitle>
                <DialogDescription>{memberCount} members</DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-80">
                <div className="space-y-2">
                  {members.map((m) => (
                    <div key={m.user_id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={m.user?.image || undefined} />
                        <AvatarFallback>{m.user?.name?.charAt(0) || "?"}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{m.user?.name}</p>
                        <div className="flex gap-1">
                          <Badge variant={m.role === "ADMIN" ? "default" : "secondary"} className="text-[10px] h-4">
                            {m.role}
                          </Badge>
                        </div>
                      </div>
                      {isAdmin && m.user_id !== user?.id && (
                        <div className="flex gap-1">
                          {m.role === "MEMBER" ? (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleMakeAdmin(m.user_id)} title="Make Admin">
                              <Shield className="h-3.5 w-3.5" />
                            </Button>
                          ) : (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleRemoveAdmin(m.user_id)} title="Remove Admin">
                              <ShieldOff className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleToggleMedia(m.user_id, m.can_share_media)} title={m.can_share_media ? "Disable media" : "Enable media"}>
                            {m.can_share_media ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleRemoveMember(m.user_id)} title="Remove">
                            <UserX className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={handleLeaveGroup} title="Leave group">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-3">
          {messages.map((msg) => {
            const isMe = msg.sender_id === user?.id;
            return (
              <div key={msg.id} className={cn("flex gap-2", isMe ? "flex-row-reverse" : "flex-row")}>
                {!isMe && (
                  <Avatar className="h-7 w-7 mt-1">
                    <AvatarImage src={getSenderImage(msg.sender_id) || undefined} />
                    <AvatarFallback className="text-[10px]">{getSenderName(msg.sender_id).charAt(0)}</AvatarFallback>
                  </Avatar>
                )}
                <div className={cn("max-w-[70%] space-y-0.5", isMe ? "items-end" : "items-start")}>
                  {!isMe && (
                    <p className="text-[10px] text-muted-foreground px-1">{getSenderName(msg.sender_id)}</p>
                  )}
                  <div
                    className={cn(
                      "rounded-2xl px-3 py-2 text-sm",
                      isMe
                        ? "bg-primary text-primary-foreground rounded-tr-sm"
                        : "bg-muted rounded-tl-sm"
                    )}
                  >
                    {msg.message_type === "IMAGE" && msg.file_url && (
                      <NextImage
                        src={msg.file_url}
                        alt={msg.content || "Image"}
                        width={320}
                        height={240}
                        className="mb-1 h-auto max-h-60 w-auto max-w-full rounded-lg object-contain"
                      />
                    )}
                    {msg.message_type === "PDF" && msg.file_url && (
                      <a
                        href={msg.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 underline"
                      >
                        <FileText className="h-4 w-4" />
                        {msg.content || "Document"}
                      </a>
                    )}
                    {msg.message_type === "LOCATION" && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {msg.content}
                      </div>
                    )}
                    {msg.message_type === "TEXT" && <p>{msg.content}</p>}
                  </div>
                  <p className="text-[9px] text-muted-foreground px-1">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-3 border-t bg-card/50 backdrop-blur-sm">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*,.pdf"
            onChange={handleFileUpload}
          />
          {(isAdmin || group?.canShareMedia) && (
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => fileInputRef.current?.click()}>
              <ImageIcon className="h-4 w-4" />
            </Button>
          )}
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 h-9 bg-muted/50 border-0"
          />
          <Button type="submit" size="icon" className="h-8 w-8 shrink-0" disabled={!newMessage.trim() || sending}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
