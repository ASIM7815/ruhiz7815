"use client";

import { Suspense, useEffect, useState, useCallback, useRef } from "react";
import { useSupabaseUser } from "@/hooks/use-supabase-user";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase-client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { Loader2 } from "lucide-react";
import { ConversationSidebar } from "./components/conversation-sidebar";
import { ChatContainer } from "./components/chat-container";
import { GroupChat } from "@/components/group-chat";
import { CallInterface } from "@/components/messaging/call-interface";
import { useWebRTCCall, type CallMessage } from "@/hooks/use-webrtc-call";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

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

interface GroupConversation {
  id: string;
  name: string;
  image_url: string | null;
  source_type: string | null;
  member_count: number;
  last_message: string | null;
  last_message_at: string | null;
}

// ── Component ──────────────────────────────────────────────────────

function MessagesPageContent() {
  const { user } = useSupabaseUser();
  const userId = user?.id;
  const searchParams = useSearchParams();
  const initialConversation = searchParams.get("conversation");

  // State
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [msgTab, setMsgTab] = useState<"chats" | "groups">("chats");
  const [groupConversations, setGroupConversations] = useState<GroupConversation[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [isOnline, setIsOnline] = useState(false);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const convPollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
    try {
      const res = await fetch("/api/groups");
      if (res.ok) {
        const data = await res.json();
        setGroupConversations(data);
      }
    } catch {
      // silently fail
    }
  }, []);

  // ── Fetch messages for a conversation ──────────────────────────

  const fetchMessages = useCallback(async (conversationId: string) => {
    try {
      const res = await fetch(`/api/messages/conversations/${conversationId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages.reverse());
        setSelectedParticipant(data.participant);
      }
    } catch {
      // silently fail
    }
  }, []);

  // ── Subscribe to Supabase Realtime ──────────────────────────────

  const subscribeToConversation = useCallback(
    (conversationId: string) => {
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
            };

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

              fetch(`/api/messages/${conversationId}/read`, { method: "PATCH" });
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
            };

            setMessages((prev) =>
              prev.map((m) => (m.id === row.id ? { ...m, isRead: row.is_read } : m))
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

  // ── Auto-open conversation from URL ────────────────────────────

  const didAutoOpen = useRef(false);
  useEffect(() => {
    if (!initialConversation || didAutoOpen.current || loading) return;
    didAutoOpen.current = true;
    setSelectedConversation(initialConversation);
    setShowMobileChat(true);
    fetchMessages(initialConversation);
    subscribeToConversation(initialConversation);
    fetch(`/api/messages/${initialConversation}/read`, { method: "PATCH" });
  }, [initialConversation, loading, fetchMessages, subscribeToConversation]);

  // ── Poll conversations ─────────────────────────────────────────

  useEffect(() => {
    if (!userId) return;
    convPollIntervalRef.current = setInterval(fetchConversations, 5000);
    return () => {
      if (convPollIntervalRef.current) clearInterval(convPollIntervalRef.current);
    };
  }, [userId, fetchConversations]);

  // ── Cleanup ────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  // ── Handlers ───────────────────────────────────────────────────

  const selectConversation = useCallback(
    (conv: Conversation) => {
      setSelectedConversation(conv.id);
      setSelectedParticipant(conv.participant);
      setShowMobileChat(true);
      fetchMessages(conv.id);
      subscribeToConversation(conv.id);
      fetch(`/api/messages/${conv.id}/read`, { method: "PATCH" });
    },
    [fetchMessages, subscribeToConversation]
  );

  const sendMessage = useCallback(
    async (content: string) => {
      if (!selectedConversation || !userId) return;

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

      try {
        const res = await fetch("/api/messages/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversationId: selectedConversation, content }),
        });

        if (res.ok) {
          const saved = await res.json();
          setMessages((prev) =>
            prev.map((m) => (m.id === tempId ? { ...saved, reactions: [] } : m))
          );
          fetchConversations();
        } else {
          setMessages((prev) => prev.filter((m) => m.id !== tempId));
        }
      } catch {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
      }
    },
    [selectedConversation, userId, fetchConversations]
  );

  const handleTabChange = useCallback((tab: "chats" | "groups") => {
    setMsgTab(tab);
    if (tab === "groups") {
      setSelectedConversation(null);
      setSelectedParticipant(null);
    } else {
      setSelectedGroupId(null);
    }
  }, []);

  // ── Reaction handlers ──────────────────────────────────────────

  const toggleReaction = useCallback(
    async (messageId: string, emoji: string) => {
      if (!userId) return;

      const msg = messages.find((m) => m.id === messageId);
      if (!msg) return;

      const existing = msg.reactions.find(
        (r) => r.userId === userId && r.emoji === emoji
      );

      if (existing) {
        // Remove reaction
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
        // Add reaction
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

  const handleEditMessage = useCallback(
    async (messageId: string) => {
      const message = messages.find((m) => m.id === messageId);
      if (!message) return;

      // Find the message and update it
      const newContent = prompt("Edit message:", message.content);
      if (!newContent || newContent === message.content) return;

      // Optimistic update
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, content: newContent } : m))
      );

      try {
        const res = await fetch(`/api/messages/${messageId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: newContent }),
        });
        
        if (!res.ok) {
          // Revert on error
          setMessages((prev) =>
            prev.map((m) => (m.id === messageId ? { ...m, content: message.content } : m))
          );
        }
      } catch (e) {
        console.error("Failed to edit message", e);
        // Revert on error
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, content: message.content } : m))
        );
      }
    },
    [messages]
  );

  const handleDeleteMessage = useCallback(
    async (messageId: string) => {
      if (!confirm("Are you sure you want to delete this message?")) return;

      setMessages((prev) => prev.filter((m) => m.id !== messageId));

      try {
        const res = await fetch(`/api/messages/${messageId}`, {
          method: "DELETE",
        });
        if (!res.ok && selectedConversation) {
          fetchMessages(selectedConversation);
        }
      } catch (e) {
        console.error("Failed to delete message", e);
      }
    },
    [selectedConversation, fetchMessages]
  );

  // ── Typing handler ─────────────────────────────────────────────

  const handleTyping = useCallback(() => {
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Broadcast typing via Supabase channel (simplified - could be enhanced)
    // For now, just a placeholder for the typing indicator logic
    
    // Auto-stop typing after 3 seconds
    typingTimeoutRef.current = setTimeout(() => {
      // Stop typing indicator
    }, 3000);
  }, []);

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
    <>
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

      <div className="flex h-[calc(100dvh-4rem)] overflow-hidden -m-3 sm:-m-4 lg:-m-6 safe-area-inset-bottom">
        {/* Sidebar - Hidden on mobile when chat is open */}
        <div
          className={`w-full md:w-80 lg:w-96 flex-shrink-0 ${
            showMobileChat ? "hidden md:flex" : "flex"
          }`}
        >
          <ConversationSidebar
            conversations={conversations}
            groupConversations={groupConversations}
            selectedConversationId={selectedConversation}
            selectedGroupId={selectedGroupId}
            currentUserId={userId!}
            loading={false}
            activeTab={msgTab}
            onSelectConversation={selectConversation}
            onSelectGroup={(id) => {
              setSelectedGroupId(id);
              setShowMobileChat(true);
            }}
            onTabChange={handleTabChange}
            onSearch={setSearchQuery}
            searchQuery={searchQuery}
          />
        </div>

        {/* Chat Area - Full screen on mobile */}
        <div
          className={`flex-1 min-w-0 ${showMobileChat ? "flex" : "hidden md:flex"}`}
        >
          {msgTab === "groups" && selectedGroupId ? (
            <div className="flex-1 flex flex-col min-w-0">
              <div className="md:hidden p-2 border-b safe-area-inset-top">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedGroupId(null);
                    setShowMobileChat(false);
                  }}
                  className="touch-manipulation active:scale-95 transition-transform"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" /> Back
                </Button>
              </div>
              <div className="flex-1 min-w-0">
                <GroupChat groupId={selectedGroupId} />
              </div>
            </div>
          ) : (
            <ChatContainer
              participant={selectedParticipant}
              messages={messages}
              currentUserId={userId!}
              onBack={() => setShowMobileChat(false)}
              onSendMessage={sendMessage}
              onVoiceCall={() =>
                selectedParticipant &&
                call.startCall(selectedConversation!, selectedParticipant, "audio")
              }
              onVideoCall={() =>
                selectedParticipant &&
                call.startCall(selectedConversation!, selectedParticipant, "video")
              }
              onReact={toggleReaction}
              onEditMessage={handleEditMessage}
              onDeleteMessage={handleDeleteMessage}
              onTyping={handleTyping}
              isTyping={isTyping}
              isOnline={isOnline}
              callDisabled={!!call.activeCall}
              showBackButton={true}
            />
          )}
        </div>
      </div>
    </>
  );
}

export default function MessagesPage() {
  return (
    <Suspense>
      <MessagesPageContent />
    </Suspense>
  );
}
