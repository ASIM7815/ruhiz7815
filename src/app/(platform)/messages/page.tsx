"use client";

import { Suspense, useEffect, useState, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
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

export default function MessagesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <MessagesContent />
    </Suspense>
  );
}

function MessagesContent() {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const searchParams = useSearchParams();

  // State
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<
    string | null
  >(null);
  const [selectedParticipant, setSelectedParticipant] =
    useState<Participant | null>(null);
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const lastPollTimestamp = useRef<string>(new Date(0).toISOString());
  const oldestCursor = useRef<string | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const convPollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );
  const initialChatHandled = useRef(false);

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

  // ── Fetch messages for a conversation ──────────────────────────

  const fetchMessages = useCallback(async (conversationId: string) => {
    try {
      const res = await fetch(
        `/api/messages/conversations/${conversationId}?take=30`
      );
      if (res.ok) {
        const data = await res.json();
        // Messages come in desc order, reverse for display
        const reversed = data.messages.reverse();
        setMessages(reversed);
        setSelectedParticipant(data.participant);
        setHasMoreMessages(!!data.nextCursor);
        oldestCursor.current = data.nextCursor;
        lastPollTimestamp.current = new Date().toISOString();
      }
    } catch {
      // silently fail
    }
  }, []);

  // ── Load older messages on scroll up ───────────────────────────

  const loadOlderMessages = useCallback(async () => {
    if (!selectedConversation || !oldestCursor.current || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const res = await fetch(
        `/api/messages/conversations/${selectedConversation}?cursor=${oldestCursor.current}&take=30`
      );
      if (res.ok) {
        const data = await res.json();
        const olderMsgs = data.messages.reverse();
        setMessages((prev) => [...olderMsgs, ...prev]);
        setHasMoreMessages(!!data.nextCursor);
        oldestCursor.current = data.nextCursor;
      }
    } catch {
      // silently fail
    } finally {
      setLoadingOlder(false);
    }
  }, [selectedConversation, loadingOlder]);

  // ── Poll for new messages ──────────────────────────────────────

  const pollMessages = useCallback(async () => {
    if (!selectedConversation) return;
    try {
      const res = await fetch(
        `/api/messages/poll?conversationId=${selectedConversation}&since=${encodeURIComponent(lastPollTimestamp.current)}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.messages.length > 0) {
          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m.id));
            const newMsgs = data.messages.filter(
              (m: MessageData) => !existingIds.has(m.id)
            );
            return [...prev, ...newMsgs];
          });
          // Mark messages as read
          fetch(`/api/messages/${selectedConversation}/read`, {
            method: "PATCH",
          });
        }
        lastPollTimestamp.current = data.timestamp;
      }
    } catch {
      // silently fail
    }
  }, [selectedConversation]);

  // ── Initial load ───────────────────────────────────────────────

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    fetchConversations().finally(() => setLoading(false));
  }, [userId, fetchConversations]);

  // ── Poll conversations (every 3s) ─────────────────────────────

  useEffect(() => {
    if (!userId) return;
    convPollIntervalRef.current = setInterval(fetchConversations, 3000);
    return () => {
      if (convPollIntervalRef.current)
        clearInterval(convPollIntervalRef.current);
    };
  }, [userId, fetchConversations]);

  // ── Poll messages (every 1s when a conversation is selected) ──

  useEffect(() => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    if (!selectedConversation) return;

    pollIntervalRef.current = setInterval(pollMessages, 1000);
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [selectedConversation, pollMessages]);

  // ── Auto-scroll to bottom (only if near bottom) ────────────────

  const isNearBottom = useRef(true);

  useEffect(() => {
    if (isNearBottom.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // ── Handle ?chat= URL param ────────────────────────────────────

  useEffect(() => {
    if (!userId || initialChatHandled.current) return;
    const chatId = searchParams.get("chat");
    if (chatId) {
      initialChatHandled.current = true;
      setSelectedConversation(chatId);
      setShowMobileChat(true);
      lastPollTimestamp.current = new Date(0).toISOString();
      fetchMessages(chatId);
    }
  }, [userId, searchParams, fetchMessages]);

  // ── Select conversation ────────────────────────────────────────

  const selectConversation = useCallback(
    (conv: Conversation) => {
      setSelectedConversation(conv.id);
      setSelectedParticipant(conv.participant);
      setShowMobileChat(true);
      lastPollTimestamp.current = new Date(0).toISOString();
      fetchMessages(conv.id);

      // Mark as read
      fetch(`/api/messages/${conv.id}/read`, { method: "PATCH" });
    },
    [fetchMessages]
  );

  // ── Send message ───────────────────────────────────────────────

  const sendMessage = useCallback(async () => {
    if (!messageInput.trim() || !selectedConversation || sendingMessage) return;

    const content = messageInput.trim();
    setMessageInput("");
    setSendingMessage(true);

    // Optimistic update
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

    try {
      const res = await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: selectedConversation,
          content,
        }),
      });

      if (res.ok) {
        const saved = await res.json();
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...saved, reactions: [] } : m))
        );
        lastPollTimestamp.current = new Date().toISOString();
        fetchConversations();
      } else {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
      }
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      setSendingMessage(false);
    }
  }, [
    messageInput,
    selectedConversation,
    sendingMessage,
    userId,
    fetchConversations,
  ]);

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
          lastPollTimestamp.current = new Date(0).toISOString();
          fetchMessages(data.conversationId);
          fetchConversations();
        }
      } catch {
        // silently fail
      }
    },
    [fetchMessages, fetchConversations]
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
              ? {
                  ...m,
                  reactions: m.reactions.filter((r) => r.id !== existing.id),
                }
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

  if (!session) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────

  return (
    <TooltipProvider>
      <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
        {/* ── Left Panel: Conversations ── */}
        <div
          className={`w-full md:w-80 lg:w-96 border-r border-border flex flex-col bg-background ${
            showMobileChat ? "hidden md:flex" : "flex"
          }`}
        >
          {/* Search */}
          <div className="p-4 border-b border-border space-y-3">
            <h2 className="text-lg font-semibold">Messages</h2>
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
          </div>

          {/* Conversation List */}
          <ScrollArea className="flex-1">
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
          </ScrollArea>
        </div>

        {/* ── Right Panel: Chat ── */}
        <div
          className={`flex-1 flex flex-col bg-background ${
            showMobileChat ? "flex" : "hidden md:flex"
          }`}
        >
          {selectedConversation && selectedParticipant ? (
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
                <div>
                  <p className="text-sm font-medium">
                    {selectedParticipant.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    UID: {selectedParticipant.uid}
                  </p>
                </div>
              </div>

              {/* Messages */}
              <div
                ref={scrollAreaRef}
                className="flex-1 overflow-y-auto p-4"
                onScroll={(e) => {
                  const el = e.currentTarget;
                  // Track if user is near bottom for auto-scroll
                  isNearBottom.current =
                    el.scrollHeight - el.scrollTop - el.clientHeight < 100;
                  // Load older messages when scrolled to top
                  if (el.scrollTop < 50 && hasMoreMessages && !loadingOlder) {
                    const prevHeight = el.scrollHeight;
                    loadOlderMessages().then(() => {
                      // Maintain scroll position after prepending
                      requestAnimationFrame(() => {
                        el.scrollTop = el.scrollHeight - prevHeight;
                      });
                    });
                  }
                }}
              >
                <div className="space-y-3">
                  {loadingOlder && (
                    <div className="flex justify-center py-2">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  )}
                  {hasMoreMessages && !loadingOlder && (
                    <button
                      onClick={() => {
                        const el = scrollAreaRef.current;
                        const prevHeight = el?.scrollHeight || 0;
                        loadOlderMessages().then(() => {
                          requestAnimationFrame(() => {
                            if (el) el.scrollTop = el.scrollHeight - prevHeight;
                          });
                        });
                      }}
                      className="w-full text-center text-xs text-muted-foreground hover:text-foreground py-2"
                    >
                      Load older messages
                    </button>
                  )}
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
                    disabled={sendingMessage}
                  />
                  <Tooltip>
                    <TooltipTrigger
                      className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium h-9 w-9 bg-primary text-primary-foreground hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
                      onClick={sendMessage}
                      disabled={!messageInput.trim() || sendingMessage}
                    >
                      {sendingMessage ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </TooltipTrigger>
                    <TooltipContent>Send message</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </>
          ) : (
            /* Empty state */
            <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
              <div className="rounded-full bg-muted p-6 mb-4">
                <UserIcon className="h-12 w-12 text-muted-foreground/50" />
              </div>
              <h3 className="text-lg font-semibold mb-1">Your Messages</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Search for a student using their 5-digit UID to start a
                conversation, or select an existing chat from the left.
              </p>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
