"use client";

import { Suspense, useEffect, useState, useRef, useCallback } from "react";
import { useSupabaseUser } from "@/hooks/use-supabase-user";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase-client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import {
  Search,
  Send,
  Smile,
  Loader2,
  ArrowLeft,
  MessageSquarePlus,
  Check,
  CheckCheck,
  User as UserIcon,
  Users,
  Phone,
  Video,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { GroupChat } from "@/components/group-chat";
import { CallInterface } from "@/components/messaging/call-interface";
import { useWebRTCCall, type CallMessage } from "@/hooks/use-webrtc-call";

// ── Types ──────────────────────────────────────────────────────────

interface Participant {
  id: string;
  uid: string | null;
  name: string;
  image: string | null;
}

interface MessageData {
  id: string;
  content: string;
  senderId: string;
  isRead: boolean;
  createdAt: string;
  reactions: { id: string; userId: string; emoji: string }[];
}

interface Conversation {
  id: string;
  participant: Participant | null;
  lastMessage: {
    id: string;
    content: string;
    senderId: string;
    isRead: boolean;
    createdAt: string;
  } | null;
  unreadCount: number;
  updatedAt: string;
}

interface SearchResult {
  id: string;
  uid: string;
  name: string;
  image: string | null;
  bio: string | null;
  university: string | null;
  role: string;
  reputation: number;
  skills: string[];
}

interface GroupConversation {
  id: string;
  name: string;
  image_url: string | null;
  source_type: string | null;
  type?: string | null;
  member_count: number;
  memberCount?: number;
  last_message: string | null;
  last_message_at: string | null;
}

// ── Helpers ────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

// ── Component ──────────────────────────────────────────────────────

function MessagesPageContent() {
  const { user } = useSupabaseUser();
  const userId = user?.id;
  const searchParams = useSearchParams();
  const initialConversation = searchParams.get("conversation");
  const initialGroup = searchParams.get("group");
  const initialTab = searchParams.get("tab");

  // State
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [msgTab, setMsgTab] = useState<"chats" | "groups">(
    initialTab === "groups" || initialGroup ? "groups" : "chats"
  );
  const [groupConversations, setGroupConversations] = useState<GroupConversation[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [groupsLoading, setGroupsLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const convPollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetch conversations ────────────────────────────────────────

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/messages/conversations");
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
      }
    } catch {
      // silently fail for polling
    }
  }, []);

  const handleCallMessage = useCallback(
    (conversationId: string, message: CallMessage) => {
      if (selectedConversation === conversationId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === message.id)) return prev;
          return [...prev, message];
        });
      }
      fetchConversations();
    },
    [fetchConversations, selectedConversation]
  );

  const call = useWebRTCCall({
    currentUser: userId
      ? {
          id: userId,
          image: user?.user_metadata?.avatar_url ?? null,
          name: user?.user_metadata?.full_name ?? "Unknown",
        }
      : null,
    onCallMessage: handleCallMessage,
  });

  const fetchGroupConversations = useCallback(async () => {
    setGroupsLoading(true);
    try {
      const res = await fetch("/api/groups");
      if (res.ok) {
        const data = await res.json();
        setGroupConversations(data);
      }
    } catch {
      // silently fail
    } finally {
      setGroupsLoading(false);
    }
  }, []);

  // ── Fetch messages for a conversation ──────────────────────────

  const fetchMessages = useCallback(async (conversationId: string) => {
    try {
      const res = await fetch(`/api/messages/conversations/${conversationId}`);
      if (res.ok) {
        const data = await res.json();
        // Messages come in desc order, reverse for display
        setMessages(data.messages.reverse());
        setSelectedParticipant(data.participant);
      }
    } catch {
      // silently fail
    }
  }, []);

  // ── Subscribe to Supabase Realtime for a conversation ──────────

  const subscribeToConversation = useCallback(
    (conversationId: string) => {
      // Cleanup previous subscription
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      const channel = supabase
        .channel(`chat-${conversationId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "direct_messages",
            filter: `conversation_id=eq.${conversationId}`,
          },
          (payload) => {
            const row = payload.new as {
              id: string;
              content: string;
              sender_id: string;
              is_read: boolean;
              created_at: string;
              conversation_id: string;
            };

            // Only add messages from the OTHER user
            // (own messages are already shown via optimistic update)
            if (row.sender_id !== userId) {
              const msg: MessageData = {
                id: row.id,
                content: row.content,
                senderId: row.sender_id,
                isRead: row.is_read,
                createdAt: row.created_at,
                reactions: [],
              };

              setMessages((prev) => {
                if (prev.some((m) => m.id === msg.id)) return prev;
                return [...prev, msg];
              });

              // Mark as read since we're viewing the conversation
              fetch(`/api/messages/${conversationId}/read`, { method: "PATCH" });
              // Refresh conversation list
              fetchConversations();
            }
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "direct_messages",
            filter: `conversation_id=eq.${conversationId}`,
          },
          (payload) => {
            const row = payload.new as {
              id: string;
              is_read: boolean;
              sender_id: string;
            };

            // Update read status (for WhatsApp-style double ticks)
            setMessages((prev) =>
              prev.map((m) =>
                m.id === row.id ? { ...m, isRead: row.is_read } : m
              )
            );
          }
        )
        .subscribe();

      channelRef.current = channel;
    },
    [userId, fetchConversations]
  );

  // ── Initial load ───────────────────────────────────────────────

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    fetchConversations().finally(() => setLoading(false));
  }, [userId, fetchConversations]);

  useEffect(() => {
    if (msgTab === "groups" && userId) {
      fetchGroupConversations();
    }
  }, [msgTab, userId, fetchGroupConversations]);

  // ── Auto-open conversation from URL param ─────────────────────

  const didAutoOpen = useRef(false);
  useEffect(() => {
    if (!initialConversation || didAutoOpen.current || loading) return;
    didAutoOpen.current = true;
    setMsgTab("chats");
    setSelectedConversation(initialConversation);
    setShowMobileChat(true);
    fetchMessages(initialConversation);
    subscribeToConversation(initialConversation);
    fetch(`/api/messages/${initialConversation}/read`, { method: "PATCH" });
  }, [initialConversation, loading, fetchMessages, subscribeToConversation]);

  const didAutoOpenGroup = useRef(false);
  useEffect(() => {
    if (!initialGroup || didAutoOpenGroup.current) return;
    didAutoOpenGroup.current = true;
    setMsgTab("groups");
    setSelectedConversation(null);
    setSelectedGroupId(initialGroup);
    setShowMobileChat(true);
  }, [initialGroup]);

  // ── Poll conversations (every 5s — less critical than messages) ──

  useEffect(() => {
    if (!userId) return;
    convPollIntervalRef.current = setInterval(fetchConversations, 5000);
    return () => {
      if (convPollIntervalRef.current)
        clearInterval(convPollIntervalRef.current);
    };
  }, [userId, fetchConversations]);

  // ── Cleanup Realtime on unmount ────────────────────────────────

  useEffect(() => {
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  // ── Auto-scroll to bottom ─────────────────────────────────────

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Select conversation ────────────────────────────────────────

  const selectConversation = useCallback(
    (conv: Conversation) => {
      setSelectedConversation(conv.id);
      setSelectedParticipant(conv.participant);
      setShowMobileChat(true);
      fetchMessages(conv.id);
      subscribeToConversation(conv.id);

      // Mark as read
      fetch(`/api/messages/${conv.id}/read`, { method: "PATCH" });
    },
    [fetchMessages, subscribeToConversation]
  );

  // ── Send message ───────────────────────────────────────────────

  const sendMessage = useCallback(async () => {
    if (!messageInput.trim() || !selectedConversation) return;

    const content = messageInput.trim();
    setMessageInput("");

    // Optimistic update — shows immediately with single tick
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: MessageData = {
      id: tempId,
      content,
      senderId: userId!,
      isRead: false,
      createdAt: new Date().toISOString(),
      reactions: [],
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    // Fire and forget — no loading state, message already visible
    fetch("/api/messages/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId: selectedConversation, content }),
    })
      .then((res) => {
        if (res.ok) {
          return res.json().then((saved) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === tempId ? { ...saved, reactions: [] } : m
              )
            );
            fetchConversations();
          });
        } else {
          setMessages((prev) => prev.filter((m) => m.id !== tempId));
        }
      })
      .catch(() => {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
      });
  }, [messageInput, selectedConversation, userId, fetchConversations]);

  // ── Search users by UID ────────────────────────────────────────

  const searchUser = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchError("");
    setSearchResult(null);

    try {
      const res = await fetch(
        `/api/users/search?uid=${encodeURIComponent(searchQuery.trim())}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.id === userId) {
          setSearchError("That's your own UID!");
        } else {
          setSearchResult(data);
        }
      } else {
        const err = await res.json();
        setSearchError(err.error || "User not found");
      }
    } catch {
      setSearchError("Search failed");
    } finally {
      setSearching(false);
    }
  }, [searchQuery, userId]);

  // ── Start conversation with search result ──────────────────────

  const startConversation = useCallback(
    async (targetUserId: string) => {
      try {
        const res = await fetch("/api/messages/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetUserId }),
        });
        if (res.ok) {
          const data = await res.json();
          setSelectedConversation(data.conversationId);
          setSelectedParticipant(data.participant);
          setShowMobileChat(true);
          setSearchResult(null);
          setSearchQuery("");
          fetchMessages(data.conversationId);
          subscribeToConversation(data.conversationId);
          fetchConversations();
        }
      } catch {
        // silently fail
      }
    },
    [fetchMessages, subscribeToConversation, fetchConversations]
  );

  // ── Toggle reaction ────────────────────────────────────────────

  const toggleReaction = useCallback(
    async (messageId: string, emoji: string) => {
      if (!userId) return;

      const msg = messages.find((m) => m.id === messageId);
      if (!msg) return;

      const existing = msg.reactions.find(
        (r) => r.userId === userId && r.emoji === emoji
      );

      if (existing) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? { ...m, reactions: m.reactions.filter((r) => r.id !== existing.id) }
              : m
          )
        );
        await fetch(`/api/messages/${messageId}/react`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ emoji }),
        });
      } else {
        const tempReaction = { id: `temp-${Date.now()}`, userId, emoji };
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? { ...m, reactions: [...m.reactions, tempReaction] }
              : m
          )
        );
        const res = await fetch(`/api/messages/${messageId}/react`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ emoji }),
        });
        if (res.ok) {
          const saved = await res.json();
          setMessages((prev) =>
            prev.map((m) =>
              m.id === messageId
                ? {
                    ...m,
                    reactions: m.reactions.map((r) =>
                      r.id === tempReaction.id ? saved : r
                    ),
                  }
                : m
            )
          );
        }
      }
    },
    [messages, userId]
  );

  // ── Handle key press ───────────────────────────────────────────

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      searchUser();
    }
  };

  // ── Loading state ──────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────

  return (
    <TooltipProvider>
      <CallInterface
        activeCall={call.activeCall}
        cameraEnabled={call.cameraEnabled}
        localStream={call.localStream}
        micEnabled={call.micEnabled}
        onAccept={call.acceptCall}
        onEnd={call.endCall}
        onReject={call.rejectCall}
        onToggleCamera={call.toggleCamera}
        onToggleMic={call.toggleMic}
        onToggleScreenShare={call.toggleScreenShare}
        remoteStream={call.remoteStream}
        screenSharing={call.screenSharing}
      />
      <div className="flex h-[calc(100dvh-4rem)] overflow-hidden -m-3 sm:-m-4 lg:-m-6">
        {/* ── Left Panel: Conversations ── */}
        <div
          className={`w-full md:w-80 lg:w-96 border-r border-border flex flex-col bg-background ${
            showMobileChat ? "hidden md:flex" : "flex"
          }`}
        >
          {/* Search */}
          <div className="p-4 border-b border-border space-y-3">
            <h2 className="text-lg font-semibold">Messages</h2>
            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-muted rounded-lg">
              <button
                onClick={() => { setMsgTab("chats"); setSelectedGroupId(null); }}
                className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  msgTab === "chats" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Chats
              </button>
              <button
                onClick={() => { setMsgTab("groups"); setSelectedConversation(null); }}
                className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
                  msgTab === "groups" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Users className="h-3 w-3" />
                Groups
              </button>
            </div>
            {msgTab === "chats" && (
            <>
            <div className="flex gap-2">
              <Input
                placeholder="Search by 5-digit UID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="flex-1"
                maxLength={5}
              />
              <Button
                size="sm"
                onClick={searchUser}
                disabled={searching || !searchQuery.trim()}
              >
                {searching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* Search Error */}
            {searchError && (
              <p className="text-sm text-destructive">{searchError}</p>
            )}

            {/* Search Result - Profile Card */}
            {searchResult && (
              <div className="rounded-lg border border-border p-3 bg-card">
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={searchResult.image ?? undefined} />
                    <AvatarFallback>
                      {getInitials(searchResult.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {searchResult.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      UID: {searchResult.uid}
                    </p>
                    {searchResult.university && (
                      <p className="text-xs text-muted-foreground truncate">
                        {searchResult.university}
                      </p>
                    )}
                    {searchResult.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {searchResult.skills.slice(0, 3).map((s) => (
                          <Badge
                            key={s}
                            variant="secondary"
                            className="text-[10px] px-1.5 py-0"
                          >
                            {s}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  className="w-full mt-2"
                  onClick={() => startConversation(searchResult.id)}
                >
                  <MessageSquarePlus className="h-4 w-4 mr-2" />
                  Message
                </Button>
              </div>
            )}
            </>
            )}
          </div>

          {/* Conversation List */}
          <ScrollArea className="flex-1">
            {msgTab === "chats" ? (
            <>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <MessageSquarePlus className="h-12 w-12 text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">
                  No conversations yet
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Search a student&apos;s UID to start messaging
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => selectConversation(conv)}
                    className={`w-full flex items-center gap-3 p-3 hover:bg-accent/50 transition-colors text-left ${
                      selectedConversation === conv.id ? "bg-accent" : ""
                    }`}
                  >
                    <Avatar className="h-10 w-10 flex-shrink-0">
                      <AvatarImage
                        src={conv.participant?.image ?? undefined}
                      />
                      <AvatarFallback>
                        {conv.participant
                          ? getInitials(conv.participant.name)
                          : "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium truncate">
                          {conv.participant?.name ?? "Unknown"}
                        </p>
                        {conv.lastMessage && (
                          <span className="text-[10px] text-muted-foreground ml-2 flex-shrink-0">
                            {timeAgo(conv.lastMessage.createdAt)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground truncate">
                          {conv.lastMessage
                            ? conv.lastMessage.senderId === userId
                              ? `You: ${conv.lastMessage.content}`
                              : conv.lastMessage.content
                            : "Start a conversation"}
                        </p>
                        {conv.unreadCount > 0 && (
                          <Badge className="ml-2 h-5 min-w-[20px] px-1.5 text-[10px] flex-shrink-0">
                            {conv.unreadCount}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
            </>
            ) : (
              /* Groups List */
              groupsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : groupConversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <Users className="h-12 w-12 text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    No group chats yet
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Join a project, study group, or startup to get group chats
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {groupConversations.map((gc) => (
                    <button
                      key={gc.id}
                      onClick={() => { setSelectedGroupId(gc.id); setShowMobileChat(true); }}
                      className={`w-full flex items-center gap-3 p-3 hover:bg-accent/50 transition-colors text-left ${
                        selectedGroupId === gc.id ? "bg-accent" : ""
                      }`}
                    >
                      <Avatar className="h-10 w-10 flex-shrink-0">
                        <AvatarImage src={gc.image_url ?? undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          <Users className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium truncate">{gc.name}</p>
                          {gc.last_message_at && (
                            <span className="text-[10px] text-muted-foreground ml-2 flex-shrink-0">
                              {timeAgo(gc.last_message_at)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground truncate">
                            {gc.last_message || `${gc.member_count ?? gc.memberCount ?? 0} members`}
                          </p>
                          {gc.source_type && (
                            <Badge variant="secondary" className="text-[9px] px-1.5 py-0 ml-1 flex-shrink-0">
                              {gc.source_type.replace("_", " ")}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )
            )}
          </ScrollArea>
        </div>

        {/* ── Right Panel: Chat ── */}
        <div
          className={`flex-1 flex flex-col bg-background ${
            showMobileChat ? "flex" : "hidden md:flex"
          }`}
        >
          {msgTab === "groups" && selectedGroupId ? (
            <div className="flex-1 flex flex-col">
              <div className="md:hidden p-2 border-b">
                <Button variant="ghost" size="sm" onClick={() => { setSelectedGroupId(null); setShowMobileChat(false); }}>
                  <ArrowLeft className="h-4 w-4 mr-2" /> Back
                </Button>
              </div>
              <div className="flex-1">
                <GroupChat groupId={selectedGroupId} onBack={() => { setSelectedGroupId(null); setShowMobileChat(false); }} />
              </div>
            </div>
          ) : selectedConversation && selectedParticipant ? (
            <>
              {/* Chat Header */}
              <div className="flex items-center gap-3 p-4 border-b border-border">
                <Button
                  variant="ghost"
                  size="sm"
                  className="md:hidden"
                  onClick={() => setShowMobileChat(false)}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <Avatar className="h-9 w-9">
                  <AvatarImage
                    src={selectedParticipant.image ?? undefined}
                  />
                  <AvatarFallback>
                    {getInitials(selectedParticipant.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {selectedParticipant.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    UID: {selectedParticipant.uid}
                  </p>
                </div>
                <div className="ml-auto flex items-center gap-1">
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={!!call.activeCall}
                          onClick={() =>
                            call.startCall(
                              selectedConversation,
                              selectedParticipant,
                              "audio"
                            )
                          }
                        >
                          <Phone className="h-4 w-4" />
                        </Button>
                      }
                    />
                    <TooltipContent>Start audio call</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={!!call.activeCall}
                          onClick={() =>
                            call.startCall(
                              selectedConversation,
                              selectedParticipant,
                              "video"
                            )
                          }
                        >
                          <Video className="h-4 w-4" />
                        </Button>
                      }
                    />
                    <TooltipContent>Start video call</TooltipContent>
                  </Tooltip>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-3">
                  {messages.map((msg, idx) => {
                    const isOwn = msg.senderId === userId;
                    const showAvatar =
                      !isOwn &&
                      (idx === 0 ||
                        messages[idx - 1].senderId !== msg.senderId);

                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`flex items-end gap-2 max-w-[75%] ${
                            isOwn ? "flex-row-reverse" : ""
                          }`}
                        >
                          {!isOwn && showAvatar ? (
                            <Avatar className="h-7 w-7 flex-shrink-0">
                              <AvatarImage
                                src={selectedParticipant.image ?? undefined}
                              />
                              <AvatarFallback className="text-[10px]">
                                {getInitials(selectedParticipant.name)}
                              </AvatarFallback>
                            </Avatar>
                          ) : !isOwn ? (
                            <div className="w-7" />
                          ) : null}

                          <div className="group relative">
                            <div
                              className={`px-3 py-2 rounded-2xl text-sm break-words ${
                                isOwn
                                  ? "bg-primary text-primary-foreground rounded-br-md"
                                  : "bg-muted rounded-bl-md"
                              }`}
                            >
                              {msg.content}
                            </div>

                            {/* Timestamp + read status */}
                            <div
                              className={`flex items-center gap-1 mt-0.5 ${
                                isOwn ? "justify-end" : "justify-start"
                              }`}
                            >
                              <span className="text-[10px] text-muted-foreground">
                                {timeAgo(msg.createdAt)}
                              </span>
                              {isOwn && (
                                <span className="text-muted-foreground">
                                  {msg.isRead ? (
                                    <CheckCheck className="h-3 w-3 text-blue-500" />
                                  ) : (
                                    <Check className="h-3 w-3" />
                                  )}
                                </span>
                              )}
                            </div>

                            {/* Reactions */}
                            {msg.reactions.length > 0 && (
                              <div
                                className={`flex flex-wrap gap-1 mt-1 ${isOwn ? "justify-end" : ""}`}
                              >
                                {Object.entries(
                                  msg.reactions.reduce(
                                    (acc, r) => {
                                      acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                                      return acc;
                                    },
                                    {} as Record<string, number>
                                  )
                                ).map(([emoji, count]) => (
                                  <button
                                    key={emoji}
                                    onClick={() =>
                                      toggleReaction(msg.id, emoji)
                                    }
                                    className={`text-xs px-1.5 py-0.5 rounded-full border transition-colors ${
                                      msg.reactions.some(
                                        (r) =>
                                          r.userId === userId &&
                                          r.emoji === emoji
                                      )
                                        ? "bg-primary/10 border-primary/30"
                                        : "bg-muted border-border hover:bg-accent"
                                    }`}
                                  >
                                    {emoji}{" "}
                                    {count > 1 && (
                                      <span className="text-muted-foreground">
                                        {count}
                                      </span>
                                    )}
                                  </button>
                                ))}
                              </div>
                            )}

                            {/* Quick emoji reaction picker */}
                            <div
                              className={`absolute top-0 ${
                                isOwn ? "right-full mr-1" : "left-full ml-1"
                              } hidden group-hover:flex items-center`}
                            >
                              <Popover>
                                <PopoverTrigger className="p-1 rounded-full hover:bg-accent text-muted-foreground">
                                  <Smile className="h-3.5 w-3.5" />
                                </PopoverTrigger>
                                <PopoverContent
                                  className="w-auto p-2"
                                  side={isOwn ? "left" : "right"}
                                >
                                  <div className="flex gap-1">
                                    {QUICK_EMOJIS.map((emoji) => (
                                      <button
                                        key={emoji}
                                        onClick={() =>
                                          toggleReaction(msg.id, emoji)
                                        }
                                        className="text-lg hover:scale-125 transition-transform p-1"
                                      >
                                        {emoji}
                                      </button>
                                    ))}
                                  </div>
                                </PopoverContent>
                              </Popover>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-border">
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Type a message..."
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="flex-1"
                    maxLength={5000}
                  />
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          size="icon"
                          onClick={sendMessage}
                          disabled={!messageInput.trim()}
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      }
                    />
                    <TooltipContent>Send message</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </>
          ) : (
            /* Empty state */
            <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
              <div className="rounded-full bg-muted p-6 mb-4">
                {msgTab === "groups" ? (
                  <Users className="h-12 w-12 text-muted-foreground/50" />
                ) : (
                  <UserIcon className="h-12 w-12 text-muted-foreground/50" />
                )}
              </div>
              <h3 className="text-lg font-semibold mb-1">
                {msgTab === "groups" ? "Project Group Chats" : "Your Messages"}
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                {msgTab === "groups"
                  ? "Select a project group from the left to start collaborating with your team."
                  : "Search for a student using their 5-digit UID to start a conversation, or select an existing chat from the left."}
              </p>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

export default function MessagesPage() {
  return (
    <Suspense>
      <MessagesPageContent />
    </Suspense>
  );
}
