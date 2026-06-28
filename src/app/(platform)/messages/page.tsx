"use client";

import { Suspense, useEffect, useState, useRef, useCallback } from "react";
import { useSupabaseUser } from "@/hooks/use-supabase-user";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase-client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { motion, AnimatePresence } from "framer-motion";
import NextImage from "next/image";
import {
  Search,
  Send,
  Smile,
  Plus,
  Paperclip,
  FileText,
  Image as ImageIcon,
  Loader2,
  ArrowLeft,
  MessageSquarePlus,
  Check,
  CheckCheck,
  User as UserIcon,
  Users,
  Phone,
  Video,
  MoreVertical,
  Edit2,
  Trash2,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { GroupChat } from "@/components/group-chat";
import { CallInterface } from "@/components/messaging/call-interface";
import { useWebRTCCall, type CallMessage } from "@/hooks/use-webrtc-call";
import { toast } from "sonner";

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
  uid: string | null;
  username: string | null;
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

interface DirectAttachment {
  fileName: string;
  mimeType: string;
  size: number;
  url: string;
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

const ATTACHMENT_PREFIX = "__RUHIZ_ATTACHMENT__:";
const QUICK_EMOJIS = ["👍", "❤️", "😂", "😊", "🔥", "🎉", "🙏", "💯", "😮", "😢", "🤝", "✅"];

function encodeAttachment(attachment: DirectAttachment) {
  return `${ATTACHMENT_PREFIX}${JSON.stringify(attachment)}`;
}

function parseAttachment(content: string): DirectAttachment | null {
  if (!content.startsWith(ATTACHMENT_PREFIX)) return null;
  try {
    const parsed = JSON.parse(content.slice(ATTACHMENT_PREFIX.length)) as Partial<DirectAttachment>;
    if (!parsed.fileName || !parsed.url || !parsed.mimeType || typeof parsed.size !== "number") {
      return null;
    }
    return {
      fileName: parsed.fileName,
      mimeType: parsed.mimeType,
      size: parsed.size,
      url: parsed.url,
    };
  } catch {
    return null;
  }
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getMessagePreview(content: string) {
  const attachment = parseAttachment(content);
  if (!attachment) return content;
  return attachment.mimeType.startsWith("image/")
    ? `Photo: ${attachment.fileName}`
    : `File: ${attachment.fileName}`;
}

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
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [peerTyping, setPeerTyping] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const convPollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<number | null>(null);

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

  const fetchGroupConversations = useCallback(async (silent = false) => {
    if (!silent) setGroupsLoading(true);
    try {
      const res = await fetch("/api/groups");
      if (res.ok) {
        const data = await res.json();
        setGroupConversations(data);
      }
    } catch {
      // silently fail
    } finally {
      if (!silent) setGroupsLoading(false);
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
        .channel(`chat-${conversationId}`, {
          config: {
            presence: {
              key: userId || "anonymous",
            },
          },
        })
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
              content: string;
              is_read: boolean;
              sender_id: string;
            };

            // Update message content (for edits) and read status
            setMessages((prev) =>
              prev.map((m) =>
                m.id === row.id
                  ? { ...m, content: row.content, isRead: row.is_read }
                  : m
              )
            );
          }
        )
        .on(
          "postgres_changes",
          {
            event: "DELETE",
            schema: "public",
            table: "direct_messages",
            filter: `conversation_id=eq.${conversationId}`,
          },
          (payload) => {
            const row = payload.old as { id: string };
            setMessages((prev) => prev.filter((m) => m.id !== row.id));
          }
        )
        .on("presence", { event: "sync" }, () => {
          const state = channel.presenceState();
          const keys = Object.keys(state);
          
          // Check if peer is online (anyone except current user)
          const peerOnline = keys.some((key) => key !== userId);
          setIsOnline(peerOnline);

          // Check if peer is typing
          const peerState = keys.find((key) => key !== userId);
          if (peerState && state[peerState]) {
            const presence = state[peerState][0] as { typing?: boolean };
            setPeerTyping(presence.typing ?? false);
          } else {
            setPeerTyping(false);
          }
        })
        .on("presence", { event: "join" }, ({ key }) => {
          if (key !== userId) {
            setIsOnline(true);
          }
        })
        .on("presence", { event: "leave" }, ({ key }) => {
          if (key !== userId) {
            setIsOnline(false);
            setPeerTyping(false);
          }
        })
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED" && userId) {
            // Track this user as present
            await channel.track({ online: true, typing: false });
          }
        });

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

  useEffect(() => {
    if (msgTab !== "groups" || !userId) return;

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchGroupConversations(true); // silent — no loading flash
      }
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, [fetchGroupConversations, msgTab, userId]);

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

  // ── Poll selected conversation as a fallback when Realtime is unavailable ──

  useEffect(() => {
    if (!userId || msgTab !== "chats" || !selectedConversation) return;

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchMessages(selectedConversation);
        fetch(`/api/messages/${selectedConversation}/read`, { method: "PATCH" });
      }
    }, 3000);

    return () => window.clearInterval(intervalId);
  }, [fetchMessages, msgTab, selectedConversation, userId]);

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

  useEffect(() => {
    document.documentElement.classList.toggle("mobile-chat-open", showMobileChat);
    return () => document.documentElement.classList.remove("mobile-chat-open");
  }, [showMobileChat]);

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

  const sendContent = useCallback((content: string) => {
    if (!content.trim() || !selectedConversation || !userId) return;
    // Optimistic update — shows immediately with single tick
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: MessageData = {
      id: tempId,
      content,
      senderId: userId,
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
  }, [selectedConversation, userId, fetchConversations]);

  const sendMessage = useCallback(async () => {
    const content = messageInput.trim();
    if (!content) return;
    setMessageInput("");
    sendContent(content);
  }, [messageInput, sendContent]);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedConversation) return;

    setUploadingAttachment(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "directMessage");
      formData.append("entityId", selectedConversation);

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const uploadData = await uploadRes.json().catch(() => ({}));
      if (!uploadRes.ok) {
        toast.error(uploadData.error || "File upload failed.");
        return;
      }

      sendContent(
        encodeAttachment({
          fileName: uploadData.fileName || file.name,
          mimeType: uploadData.mimeType || file.type || "application/octet-stream",
          size: uploadData.size || file.size,
          url: uploadData.url,
        })
      );
    } catch {
      toast.error("File upload failed. Please try again.");
    } finally {
      setUploadingAttachment(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [selectedConversation, sendContent]);

  // ── Search users by UID ────────────────────────────────────────

  const searchUser = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchError("");
    setSearchResult(null);

    try {
      const res = await fetch(
        `/api/users/search?q=${encodeURIComponent(searchQuery.trim())}`
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

  // ── Handle typing indicator ───────────────────────────────────

  const handleTyping = useCallback(() => {
    if (!channelRef.current || !userId) return;

    // Set typing to true
    if (!isTyping) {
      setIsTyping(true);
      void channelRef.current.track({ online: true, typing: true });
    }

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set typing to false after 2 seconds of inactivity
    typingTimeoutRef.current = window.setTimeout(() => {
      setIsTyping(false);
      if (channelRef.current) {
        void channelRef.current.track({ online: true, typing: false });
      }
    }, 2000);
  }, [isTyping, userId]);

  // ── Edit message ───────────────────────────────────────────────

  const startEditMessage = useCallback((msg: MessageData) => {
    setEditingMessageId(msg.id);
    setEditingContent(msg.content);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingMessageId(null);
    setEditingContent("");
  }, []);

  const saveEdit = useCallback(async () => {
    if (!editingMessageId || !editingContent.trim()) return;

    const originalContent = messages.find((m) => m.id === editingMessageId)?.content;

    // Optimistic update
    setMessages((prev) =>
      prev.map((m) =>
        m.id === editingMessageId ? { ...m, content: editingContent.trim() } : m
      )
    );

    setEditingMessageId(null);
    setEditingContent("");

    try {
      const res = await fetch(`/api/messages/${editingMessageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editingContent.trim() }),
      });

      if (!res.ok) {
        // Revert on error
        setMessages((prev) =>
          prev.map((m) =>
            m.id === editingMessageId ? { ...m, content: originalContent || "" } : m
          )
        );
        toast.error("Failed to edit message");
      }
    } catch {
      // Revert on error
      setMessages((prev) =>
        prev.map((m) =>
          m.id === editingMessageId ? { ...m, content: originalContent || "" } : m
        )
      );
      toast.error("Failed to edit message");
    }
  }, [editingMessageId, editingContent, messages]);

  // ── Delete message ─────────────────────────────────────────────

  const deleteMessage = useCallback(async (messageId: string) => {
    const originalMessages = messages;

    // Optimistic delete
    setMessages((prev) => prev.filter((m) => m.id !== messageId));

    try {
      const res = await fetch(`/api/messages/${messageId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        // Revert on error
        setMessages(originalMessages);
        toast.error("Failed to delete message");
      }
    } catch {
      // Revert on error
      setMessages(originalMessages);
      toast.error("Failed to delete message");
    }
  }, [messages]);

  // ── Handle key press ───────────────────────────────────────────

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (editingMessageId) {
        saveEdit();
      } else {
        sendMessage();
      }
    }
    if (e.key === "Escape" && editingMessageId) {
      cancelEdit();
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
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <Loader2 className="h-8 w-8 text-muted-foreground" />
        </motion.div>
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
      <div
        className={`flex overflow-hidden -m-4 lg:-m-6 ${
          showMobileChat
            ? "h-[calc(100dvh_-_3.5rem)]"
            : "h-[calc(100dvh_-_3.5rem_-_var(--mobile-nav-height)_-_1rem)] md:h-[calc(100dvh_-_3.5rem)]"
        }`}
      >
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
                placeholder="Search UID or @username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="flex-1"
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
                    <p className="max-w-[11rem] truncate text-sm font-medium sm:max-w-[15rem]" title={searchResult.name}>
                      {searchResult.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {searchResult.username
                        ? `@${searchResult.username}`
                        : searchResult.uid
                          ? `UID: ${searchResult.uid}`
                          : "Student"}
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
                <AnimatePresence mode="popLayout">
                {conversations.map((conv, idx) => (
                  <motion.button
                    key={conv.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2, delay: idx * 0.03 }}
                    onClick={() => selectConversation(conv)}
                    className={`w-full flex min-h-[4.5rem] items-center gap-3 p-3 hover:bg-accent/50 transition-colors text-left ${
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
                      <div className="flex min-w-0 items-center justify-between">
                        <p
                          className="max-w-[9rem] truncate text-sm font-medium sm:max-w-[12rem] lg:max-w-[15rem]"
                          title={conv.participant?.name ?? "Unknown"}
                        >
                          {conv.participant?.name ?? "Unknown"}
                        </p>
                        {conv.lastMessage && (
                          <span className="text-[10px] text-muted-foreground ml-2 flex-shrink-0">
                            {timeAgo(conv.lastMessage.createdAt)}
                          </span>
                        )}
                      </div>
                      <div className="flex min-w-0 items-center justify-between">
                        <p className="min-w-0 truncate text-xs text-muted-foreground">
                          {conv.lastMessage
                            ? conv.lastMessage.senderId === userId
                              ? `You: ${getMessagePreview(conv.lastMessage.content)}`
                              : getMessagePreview(conv.lastMessage.content)
                            : "Start a conversation"}
                        </p>
                        {conv.unreadCount > 0 && (
                          <Badge className="ml-2 h-5 min-w-[20px] px-1.5 text-[10px] flex-shrink-0">
                            {conv.unreadCount}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </motion.button>
                ))}
                </AnimatePresence>
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
                      className={`w-full flex min-h-[4.5rem] items-center gap-3 p-3 hover:bg-accent/50 transition-colors text-left ${
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
                        <p
                          className="max-w-[9rem] truncate text-sm font-medium sm:max-w-[12rem] lg:max-w-[15rem]"
                          title={gc.name}
                        >
                          {gc.name}
                        </p>
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
              <div className="flex-1">
                <GroupChat key={selectedGroupId} groupId={selectedGroupId} onBack={() => { setSelectedGroupId(null); setShowMobileChat(false); }} />
              </div>
            </div>
          ) : selectedConversation && selectedParticipant ? (
            <>
              {/* Chat Header */}
              <div className="flex min-h-16 items-center gap-2 border-b border-border p-3 sm:gap-3 sm:p-4">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 md:hidden"
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
                  <p
                    className="max-w-[9.5rem] truncate text-sm font-medium sm:max-w-[16rem] lg:max-w-[24rem]"
                    title={selectedParticipant.name}
                  >
                    {selectedParticipant.name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {peerTyping ? (
                      <span className="text-primary">typing...</span>
                    ) : isOnline ? (
                      <span className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-green-500" />
                        Online
                      </span>
                    ) : (
                      `UID: ${selectedParticipant.uid}`
                    )}
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
                <AnimatePresence mode="sync">
                  {messages.map((msg, idx) => {
                    const isOwn = msg.senderId === userId;
                    const attachment = parseAttachment(msg.content);
                    const showAvatar =
                      !isOwn &&
                      (idx === 0 ||
                        messages[idx - 1].senderId !== msg.senderId);

                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.2 }}
                        className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`flex max-w-[84%] items-end gap-2 sm:max-w-[75%] ${
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
                              {attachment ? (
                                <a
                                  href={attachment.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block min-w-48 max-w-64"
                                >
                                  {attachment.mimeType.startsWith("image/") ? (
                                    <div className="space-y-2">
                                      <NextImage
                                        src={attachment.url}
                                        alt={attachment.fileName}
                                        width={260}
                                        height={180}
                                        className="max-h-56 w-full rounded-xl object-cover"
                                      />
                                      <div className="flex items-center gap-2">
                                        <ImageIcon className="h-4 w-4 shrink-0" />
                                        <span className="truncate text-xs">
                                          {attachment.fileName}
                                        </span>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-3">
                                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background/20">
                                        <FileText className="h-5 w-5" />
                                      </span>
                                      <span className="min-w-0">
                                        <span className="block truncate font-medium">
                                          {attachment.fileName}
                                        </span>
                                        <span className="block text-xs opacity-80">
                                          {formatFileSize(attachment.size)}
                                        </span>
                                      </span>
                                    </div>
                                  )}
                                </a>
                              ) : (
                                msg.content
                              )}
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

                            {/* Quick emoji reaction picker - Always visible */}
                            <div
                              className={`absolute top-0 ${
                                isOwn ? "right-full mr-1" : "left-full ml-1"
                              } flex items-center gap-1`}
                            >
                              {/* Edit/Delete menu for own messages */}
                              {isOwn && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger className="p-1 rounded-full hover:bg-accent text-muted-foreground bg-background/80 backdrop-blur-sm shadow-sm">
                                    <MoreVertical className="h-3.5 w-3.5" />
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      onClick={() => startEditMessage(msg)}
                                      className="gap-2"
                                    >
                                      <Edit2 className="h-3.5 w-3.5" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => deleteMessage(msg.id)}
                                      className="gap-2 text-destructive focus:text-destructive"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                              <Popover>
                                <PopoverTrigger className="p-1 rounded-full hover:bg-accent text-muted-foreground bg-background/80 backdrop-blur-sm shadow-sm">
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
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Message Input */}
              <div className="border-t border-border p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:p-4">
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept="image/*,.pdf,.zip,.doc,.docx,.ppt,.pptx,.txt"
                    onChange={handleFileUpload}
                  />
                  <Popover>
                    <PopoverTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 shrink-0 rounded-full border border-primary/25 bg-primary/10 text-primary hover:bg-primary/15 sm:h-8 sm:w-8"
                          disabled={uploadingAttachment}
                          aria-label="Open emoji and file actions"
                        />
                      }
                    >
                      {uploadingAttachment ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="h-5 w-5 sm:h-4 sm:w-4" />
                      )}
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-2" side="top" align="start">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingAttachment}
                        className="mb-2 flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
                      >
                        <Paperclip className="h-4 w-4" />
                        Share file
                      </button>
                      <div className="flex items-center gap-2 border-t px-3 pb-1 pt-2 text-xs font-medium text-muted-foreground">
                        <Smile className="h-3.5 w-3.5" />
                        Add emoji
                      </div>
                      <div className="grid grid-cols-6 gap-1">
                        {QUICK_EMOJIS.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => setMessageInput((value) => `${value}${emoji}`)}
                            className="flex h-9 w-9 items-center justify-center rounded-lg text-lg transition-colors hover:bg-muted"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                  <Input
                    placeholder="Type a message..."
                    value={editingMessageId ? editingContent : messageInput}
                    onChange={(e) => {
                      if (editingMessageId) {
                        setEditingContent(e.target.value);
                      } else {
                        setMessageInput(e.target.value);
                        handleTyping();
                      }
                    }}
                    onKeyDown={handleKeyDown}
                    className="h-12 min-w-0 flex-1 rounded-xl px-3 text-base sm:h-8 sm:text-sm"
                    maxLength={5000}
                  />
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          size="icon"
                          className="h-11 w-11 shrink-0 sm:h-8 sm:w-8"
                          onClick={editingMessageId ? saveEdit : sendMessage}
                          disabled={
                            editingMessageId
                              ? !editingContent.trim()
                              : !messageInput.trim() || uploadingAttachment
                          }
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      }
                    />
                    <TooltipContent>
                      {editingMessageId ? "Save edit" : "Send message"}
                    </TooltipContent>
                  </Tooltip>
                  {editingMessageId && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-11 w-11 shrink-0 sm:h-8 sm:w-8"
                      onClick={cancelEdit}
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                  )}
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
