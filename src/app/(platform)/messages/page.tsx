"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  Search,
  Send,
  Smile,
  Lock,
  Loader2,
  ArrowLeft,
  MessageSquarePlus,
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
import { useEncryptionKeys } from "@/hooks/useEncryptionKeys";
import { useSocket } from "@/hooks/useSocket";
import {
  encryptMessage,
  decryptMessage,
  importPublicKeyFromJWK,
} from "@/lib/crypto";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";

// ── Types ──────────────────────────────────────────────────────────

interface Participant {
  id: string;
  uid: string | null;
  name: string;
  image: string | null;
  publicKey?: JsonWebKey | null;
}

interface ConversationMessage {
  id: string;
  conversationId?: string;
  senderId: string;
  encryptedContent: string;
  encryptedKeySender: string;
  encryptedKeyRecipient: string;
  iv: string;
  isRead: boolean;
  createdAt: string;
  reactions: { id?: string; userId: string; emoji: string }[];
}

interface DecryptedMessage extends ConversationMessage {
  plaintext: string | null;
}

interface Conversation {
  id: string;
  participant: Participant | null;
  lastMessage: ConversationMessage | null;
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
    .toUpperCase();
}

const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

// ── Main Component ────────────────────────────────────────────────

export default function MessagesPage() {
  const { data: session } = useSession();
  const userId = (session?.user as { id?: string })?.id;
  const {
    publicKey,
    privateKey,
    isReady: keysReady,
    isGenerating,
  } = useEncryptionKeys();
  const {
    socket,
    isConnected,
    onlineUsers,
    joinConversation,
    leaveConversation,
    emitTyping,
    emitStopTyping,
  } = useSocket(userId);

  // ── State ──
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConvo, setSelectedConvo] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<DecryptedMessage[]>([]);
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messageInput, setMessageInput] = useState("");
  const [sending, setSending] = useState(false);
  const [searchUid, setSearchUid] = useState("");
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [recipientPubKey, setRecipientPubKey] = useState<CryptoKey | null>(
    null
  );
  const [participantInfo, setParticipantInfo] = useState<Participant | null>(
    null
  );
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const prevConvoRef = useRef<string | null>(null);

  // ── Fetch conversations ──
  const fetchConversations = useCallback(async () => {
    const res = await fetch("/api/messages/conversations");
    if (!res.ok) return;
    const json = await res.json();
    setConversations(json.conversations || []);
    setLoadingConvos(false);
  }, []);

  useEffect(() => {
    if (userId) fetchConversations();
  }, [userId, fetchConversations]);

  // ── Decrypt a single message ──
  const decryptMsg = useCallback(
    async (msg: ConversationMessage): Promise<DecryptedMessage> => {
      if (!privateKey) return { ...msg, plaintext: null };
      try {
        const encKey =
          msg.senderId === userId
            ? msg.encryptedKeySender
            : msg.encryptedKeyRecipient;
        const plaintext = await decryptMessage(
          msg.encryptedContent,
          encKey,
          msg.iv,
          privateKey
        );
        return { ...msg, plaintext };
      } catch {
        return { ...msg, plaintext: "[Unable to decrypt]" };
      }
    },
    [privateKey, userId]
  );

  // ── Select conversation and load messages ──
  const selectConversation = useCallback(
    async (convo: Conversation) => {
      if (prevConvoRef.current) {
        leaveConversation(prevConvoRef.current);
      }

      setSelectedConvo(convo);
      setMessages([]);
      setLoadingMessages(true);
      setShowSearch(false);

      joinConversation(convo.id);
      prevConvoRef.current = convo.id;

      const res = await fetch(`/api/messages/conversations/${convo.id}`);
      if (!res.ok) {
        setLoadingMessages(false);
        return;
      }
      const json = await res.json();
      setParticipantInfo(json.participant);

      if (json.participant?.publicKey) {
        try {
          const pk = await importPublicKeyFromJWK(json.participant.publicKey);
          setRecipientPubKey(pk);
        } catch {
          setRecipientPubKey(null);
        }
      }

      const raw: ConversationMessage[] = (json.messages || []).reverse();
      const decrypted = await Promise.all(raw.map(decryptMsg));
      setMessages(decrypted);
      setLoadingMessages(false);

      if (raw.length > 0) {
        const lastFromOther = raw.filter((m) => m.senderId !== userId).pop();
        if (lastFromOther && !lastFromOther.isRead) {
          fetch(`/api/messages/${lastFromOther.id}/read`, { method: "PATCH" });
        }
      }

      setConversations((prev) =>
        prev.map((c) => (c.id === convo.id ? { ...c, unreadCount: 0 } : c))
      );
    },
    [joinConversation, leaveConversation, decryptMsg, userId]
  );

  // ── Socket: real-time events ──
  useEffect(() => {
    if (!socket) return;

    function handleNewMessage(msg: ConversationMessage) {
      if (msg.conversationId === selectedConvo?.id) {
        decryptMsg(msg).then((decrypted) => {
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, decrypted];
          });
        });
        if (msg.senderId !== userId) {
          fetch(`/api/messages/${msg.id}/read`, { method: "PATCH" });
        }
      }
    }

    function handleConversationMessage(d: {
      conversationId: string;
      senderId: string;
    }) {
      fetchConversations();
      if (d.conversationId !== selectedConvo?.id) {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === d.conversationId
              ? { ...c, unreadCount: c.unreadCount + 1 }
              : c
          )
        );
      }
    }

    function handleMessagesRead(d: {
      conversationId: string;
      readBy: string;
    }) {
      if (d.conversationId === selectedConvo?.id && d.readBy !== userId) {
        setMessages((prev) =>
          prev.map((m) =>
            m.senderId === userId ? { ...m, isRead: true } : m
          )
        );
      }
    }

    function handleReactionUpdate(d: {
      messageId: string;
      reaction: { id?: string; userId: string; emoji: string };
      action: "add" | "remove";
    }) {
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== d.messageId) return m;
          if (d.action === "add") {
            const exists = m.reactions.some(
              (r) => r.userId === d.reaction.userId && r.emoji === d.reaction.emoji
            );
            if (exists) return m;
            return { ...m, reactions: [...m.reactions, d.reaction] };
          }
          return {
            ...m,
            reactions: m.reactions.filter(
              (r) =>
                !(r.userId === d.reaction.userId && r.emoji === d.reaction.emoji)
            ),
          };
        })
      );
    }

    function handleTyping(d: { userId: string }) {
      if (d.userId !== userId) setTypingUser(d.userId);
    }

    function handleStopTyping(d: { userId: string }) {
      if (d.userId !== userId) setTypingUser(null);
    }

    socket.on("new-message", handleNewMessage);
    socket.on("new-conversation-message", handleConversationMessage);
    socket.on("messages-read", handleMessagesRead);
    socket.on("reaction-update", handleReactionUpdate);
    socket.on("typing", handleTyping);
    socket.on("stop-typing", handleStopTyping);

    return () => {
      socket.off("new-message", handleNewMessage);
      socket.off("new-conversation-message", handleConversationMessage);
      socket.off("messages-read", handleMessagesRead);
      socket.off("reaction-update", handleReactionUpdate);
      socket.off("typing", handleTyping);
      socket.off("stop-typing", handleStopTyping);
    };
  }, [socket, selectedConvo, userId, decryptMsg, fetchConversations]);

  // ── Auto-scroll ──
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Search user by UID ──
  async function handleSearch() {
    if (!searchUid || searchUid.length !== 5) return;
    setSearchLoading(true);
    setSearchError("");
    setSearchResult(null);

    const res = await fetch(`/api/users/search?uid=${searchUid}`);
    if (!res.ok) {
      setSearchError("User not found");
      setSearchLoading(false);
      return;
    }
    const user = await res.json();
    if (user.id === userId) {
      setSearchError("That's you!");
      setSearchLoading(false);
      return;
    }
    setSearchResult(user);
    setSearchLoading(false);
  }

  // ── Start conversation ──
  async function startConversation(participantId: string) {
    const res = await fetch("/api/messages/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participantId }),
    });
    if (!res.ok) return;
    const json = await res.json();
    await fetchConversations();

    const convo: Conversation = {
      id: json.conversationId,
      participant: json.participant,
      lastMessage: null,
      unreadCount: 0,
      updatedAt: new Date().toISOString(),
    };
    selectConversation(convo);
    setShowSearch(false);
    setSearchUid("");
    setSearchResult(null);
  }

  // ── Send message ──
  async function handleSend() {
    if (
      !messageInput.trim() ||
      !selectedConvo ||
      !recipientPubKey ||
      !publicKey ||
      sending
    )
      return;

    const plaintext = messageInput.trim();
    setMessageInput("");
    setSending(true);

    try {
      const encrypted = await encryptMessage(plaintext, recipientPubKey, publicKey);

      const optimistic: DecryptedMessage = {
        id: `temp-${Date.now()}`,
        senderId: userId!,
        encryptedContent: encrypted.encryptedContent,
        encryptedKeySender: encrypted.encryptedKeySender,
        encryptedKeyRecipient: encrypted.encryptedKeyRecipient,
        iv: encrypted.iv,
        isRead: false,
        createdAt: new Date().toISOString(),
        reactions: [],
        plaintext,
      };
      setMessages((prev) => [...prev, optimistic]);

      const res = await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: selectedConvo.id, ...encrypted }),
      });

      if (res.ok) {
        const saved = await res.json();
        setMessages((prev) =>
          prev.map((m) => (m.id === optimistic.id ? { ...saved, plaintext } : m))
        );
      }
    } catch {
      // Encryption or send failed
    }

    setSending(false);
    if (selectedConvo) emitStopTyping(selectedConvo.id);
  }

  // ── Typing indicator ──
  function handleInputChange(value: string) {
    setMessageInput(value);
    if (selectedConvo) {
      emitTyping(selectedConvo.id);
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        if (selectedConvo) emitStopTyping(selectedConvo.id);
      }, 2000);
    }
  }

  // ── Reactions ──
  async function handleReaction(messageId: string, emoji: string) {
    const msg = messages.find((m) => m.id === messageId);
    if (!msg) return;
    const alreadyReacted = msg.reactions.some(
      (r) => r.userId === userId && r.emoji === emoji
    );
    if (alreadyReacted) {
      await fetch(`/api/messages/${messageId}/react`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      });
    } else {
      await fetch(`/api/messages/${messageId}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      });
    }
    setHoveredMessageId(null);
  }

  // ── Emoji picker ──
  function handleEmojiSelect(emojiData: { native: string }) {
    setMessageInput((prev) => prev + emojiData.native);
    setShowEmojiPicker(false);
  }

  // ── Render: loading key generation ──
  if (isGenerating) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-130px)]">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="font-medium">Setting up encryption keys...</p>
          <p className="text-sm text-muted-foreground">
            This only happens once. Your private key stays on this device.
          </p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex h-[calc(100vh-130px)] gap-0 -m-4 lg:-m-6">
        {/* ── Left Panel: Conversation List ── */}
        <div
          className={`w-full sm:w-80 border-r flex flex-col shrink-0 ${
            selectedConvo ? "hidden sm:flex" : "flex"
          }`}
        >
          <div className="p-4 border-b space-y-3">
            <div className="flex items-center justify-between">
              <h1 className="font-heading text-lg font-bold">Messages</h1>
              <div className="flex items-center gap-2">
                {isConnected && (
                  <div
                    className="h-2 w-2 rounded-full bg-emerald-500"
                    title="Connected"
                  />
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowSearch(!showSearch)}
                >
                  <MessageSquarePlus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {showSearch && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter 5-digit UID..."
                    value={searchUid}
                    onChange={(e) => setSearchUid(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    maxLength={5}
                    className="h-9"
                  />
                  <Button
                    size="sm"
                    onClick={handleSearch}
                    disabled={searchLoading || searchUid.length !== 5}
                  >
                    {searchLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {searchError && (
                  <p className="text-xs text-destructive">{searchError}</p>
                )}
                {searchResult && (
                  <div className="p-3 bg-muted rounded-lg space-y-2">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={searchResult.image || ""} />
                        <AvatarFallback>
                          {getInitials(searchResult.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {searchResult.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          @{searchResult.uid} ·{" "}
                          {searchResult.university || "—"}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => startConversation(searchResult.id)}
                    >
                      Start Conversation
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          <ScrollArea className="flex-1">
            <div className="divide-y">
              {loadingConvos ? (
                <div className="p-8 text-center">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                </div>
              ) : conversations.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  <p>No conversations yet.</p>
                  <p className="mt-1">Search by UID to start chatting!</p>
                </div>
              ) : (
                conversations.map((convo) => {
                  if (!convo.participant) return null;
                  const isOnline = onlineUsers.has(convo.participant.id);
                  return (
                    <button
                      key={convo.id}
                      onClick={() => selectConversation(convo)}
                      className={`w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors text-left ${
                        selectedConvo?.id === convo.id ? "bg-muted/50" : ""
                      }`}
                    >
                      <div className="relative">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={convo.participant.image || ""} />
                          <AvatarFallback>
                            {getInitials(convo.participant.name)}
                          </AvatarFallback>
                        </Avatar>
                        {isOnline && (
                          <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-background" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium truncate">
                            {convo.participant.name}
                          </p>
                          {convo.lastMessage && (
                            <span className="text-[10px] text-muted-foreground shrink-0">
                              {timeAgo(convo.lastMessage.createdAt)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Lock className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                          <p className="text-xs text-muted-foreground truncate">
                            {convo.lastMessage
                              ? "Encrypted message"
                              : "Start chatting"}
                          </p>
                        </div>
                      </div>
                      {convo.unreadCount > 0 && (
                        <Badge className="h-5 w-5 p-0 flex items-center justify-center text-[10px]">
                          {convo.unreadCount}
                        </Badge>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>

        {/* ── Right Panel: Chat Area ── */}
        <div
          className={`flex-1 flex flex-col ${
            selectedConvo ? "flex" : "hidden sm:flex"
          }`}
        >
          {!selectedConvo ? (
            <div className="flex-1 flex items-center justify-center text-center p-8">
              <div className="space-y-3">
                <Lock className="h-12 w-12 mx-auto text-muted-foreground/40" />
                <h2 className="font-heading text-xl font-semibold">
                  End-to-End Encrypted
                </h2>
                <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                  Select a conversation or search for a user by their 5-digit
                  UID to start messaging securely.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="flex items-center gap-3 p-4 border-b">
                <Button
                  variant="ghost"
                  size="icon"
                  className="sm:hidden shrink-0"
                  onClick={() => setSelectedConvo(null)}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <Avatar className="h-9 w-9">
                  <AvatarImage
                    src={
                      (participantInfo || selectedConvo.participant)?.image || ""
                    }
                  />
                  <AvatarFallback>
                    {getInitials(
                      (participantInfo || selectedConvo.participant)?.name || "U"
                    )}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium text-sm">
                    {(participantInfo || selectedConvo.participant)?.name}
                  </p>
                  <div className="flex items-center gap-1.5">
                    {typingUser ? (
                      <p className="text-xs text-primary">typing...</p>
                    ) : onlineUsers.has(
                        (participantInfo || selectedConvo.participant)?.id || ""
                      ) ? (
                      <p className="text-xs text-emerald-600">Online</p>
                    ) : (
                      <p className="text-xs text-muted-foreground">Offline</p>
                    )}
                  </div>
                </div>
                <Tooltip>
                  <TooltipTrigger>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                      <Lock className="h-3 w-3" />
                      <span>E2EE</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Messages are end-to-end encrypted.</p>
                    <p>Only you and the recipient can read them.</p>
                  </TooltipContent>
                </Tooltip>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-3">
                  {loadingMessages ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center py-12 space-y-2">
                      <Lock className="h-8 w-8 mx-auto text-muted-foreground/40" />
                      <p className="text-sm text-muted-foreground">
                        No messages yet. Say hello!
                      </p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isOwn = msg.senderId === userId;
                      const grouped = msg.reactions.reduce<
                        Record<string, string[]>
                      >((acc, r) => {
                        if (!acc[r.emoji]) acc[r.emoji] = [];
                        acc[r.emoji].push(r.userId);
                        return acc;
                      }, {});

                      return (
                        <div
                          key={msg.id}
                          className={`flex gap-2 group ${
                            isOwn ? "flex-row-reverse" : ""
                          }`}
                          onMouseEnter={() => setHoveredMessageId(msg.id)}
                          onMouseLeave={() => setHoveredMessageId(null)}
                        >
                          <div
                            className={`max-w-[75%] relative ${
                              isOwn ? "text-right" : ""
                            }`}
                          >
                            <div
                              className={`rounded-2xl px-4 py-2.5 text-sm inline-block ${
                                isOwn
                                  ? "bg-primary text-primary-foreground rounded-tr-sm"
                                  : "bg-muted rounded-tl-sm"
                              }`}
                            >
                              {msg.plaintext || "[Encrypted]"}
                            </div>

                            <div
                              className={`flex items-center gap-1 mt-0.5 ${
                                isOwn ? "justify-end" : ""
                              }`}
                            >
                              <span className="text-[10px] text-muted-foreground">
                                {timeAgo(msg.createdAt)}
                              </span>
                              {isOwn && (
                                <span className="text-[10px]">
                                  {msg.isRead ? "✓✓" : "✓"}
                                </span>
                              )}
                            </div>

                            {Object.keys(grouped).length > 0 && (
                              <div
                                className={`flex gap-1 mt-1 flex-wrap ${
                                  isOwn ? "justify-end" : ""
                                }`}
                              >
                                {Object.entries(grouped).map(
                                  ([emoji, users]) => (
                                    <button
                                      key={emoji}
                                      onClick={() =>
                                        handleReaction(msg.id, emoji)
                                      }
                                      className={`text-xs px-1.5 py-0.5 rounded-full border inline-flex items-center gap-0.5 hover:bg-muted transition-colors ${
                                        users.includes(userId || "")
                                          ? "border-primary/50 bg-primary/5"
                                          : "border-border"
                                      }`}
                                    >
                                      <span>{emoji}</span>
                                      {users.length > 1 && (
                                        <span className="text-muted-foreground">
                                          {users.length}
                                        </span>
                                      )}
                                    </button>
                                  )
                                )}
                              </div>
                            )}

                            {hoveredMessageId === msg.id &&
                              !msg.id.startsWith("temp-") && (
                                <div
                                  className={`absolute top-0 ${
                                    isOwn
                                      ? "left-0 -translate-x-full"
                                      : "right-0 translate-x-full"
                                  } flex items-center gap-0.5 bg-background border rounded-full px-1 py-0.5 shadow-sm z-10`}
                                >
                                  {REACTION_EMOJIS.map((emoji) => (
                                    <button
                                      key={emoji}
                                      onClick={() =>
                                        handleReaction(msg.id, emoji)
                                      }
                                      className="hover:scale-125 transition-transform text-sm p-0.5"
                                    >
                                      {emoji}
                                    </button>
                                  ))}
                                </div>
                              )}
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Input area */}
              <div className="border-t p-3">
                {!recipientPubKey ? (
                  <div className="text-center py-2">
                    <p className="text-sm text-muted-foreground">
                      Recipient hasn&apos;t set up encryption keys yet.
                      Messaging will be available once they open the Messages
                      page.
                    </p>
                  </div>
                ) : (
                  <div className="flex gap-2 items-end">
                    <Popover
                      open={showEmojiPicker}
                      onOpenChange={setShowEmojiPicker}
                    >
                      <PopoverTrigger>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="shrink-0"
                        >
                          <Smile className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-auto p-0 border-none"
                        side="top"
                        align="start"
                      >
                        <Picker
                          data={data}
                          onEmojiSelect={handleEmojiSelect}
                          theme="auto"
                          set="native"
                          previewPosition="none"
                          skinTonePosition="none"
                        />
                      </PopoverContent>
                    </Popover>
                    <Input
                      placeholder="Type a message..."
                      className="flex-1"
                      value={messageInput}
                      onChange={(e) => handleInputChange(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                    />
                    <Button
                      size="icon"
                      className="shrink-0"
                      onClick={handleSend}
                      disabled={!messageInput.trim() || sending}
                    >
                      {sending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
