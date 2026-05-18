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
  Phone,
  Video,
  Trash2,
  Pencil,
  X,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

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
    fetch(`/api/groups/${groupId}/messages`)
      .then((r) => r.json())
      .then((data) => {
        setMessages(data.messages || []);
        setTimeout(scrollToBottom, 100);
      })
      .catch(console.error);
  }, [groupId, scrollToBottom]);

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
    const channel = supabase
      .channel(`group-${groupId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "group_messages", filter: `conversation_id=eq.${groupId}` },
        (payload) => {
          const msg = payload.new as GroupMessage;
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
          setTimeout(scrollToBottom, 100);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [groupId, scrollToBottom]);

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
        setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? real : m)));
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
      await fetch(`/api/groups/${groupId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: file.name, messageType, fileUrl: url }),
      });
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

  async function handleDeleteMessage(messageId: string) {
    if (!confirm("Are you sure you want to delete this message?")) return;
    
    // Optimistic update
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
    
    try {
      const res = await fetch(`/api/groups/${groupId}/messages/${messageId}`, {
        method: "DELETE",
      });
      
      if (!res.ok) {
        // Revert on failure (we would need to fetch messages again to truly revert, but this is simple)
        const refresh = await fetch(`/api/groups/${groupId}/messages`);
        if (refresh.ok) {
          const data = await refresh.json();
          setMessages(data.messages || []);
        }
      }
    } catch (e) {
      console.error("Failed to delete message", e);
    }
  }

  async function handleEditMessage(messageId: string) {
    if (!editContent.trim()) return;
    const previous = messages;
    
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, content: editContent.trim() } : m))
    );
    setEditingMessageId(null);
    setEditContent("");

    try {
      const res = await fetch(`/api/groups/${groupId}/messages/${messageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editContent.trim() }),
      });
      
      if (!res.ok) {
        setMessages(previous);
      }
    } catch (e) {
      console.error("Failed to edit message", e);
      setMessages(previous);
    }
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
    <TooltipProvider>
      <div className="flex flex-col h-full bg-background">
        {/* Header - Mobile optimized */}
        <div className="flex items-center gap-2 sm:gap-3 px-3 py-2.5 sm:px-4 sm:py-3 border-b bg-card/50 backdrop-blur-md safe-area-inset-top">
          {onBack && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onBack}
              className="touch-manipulation active:scale-95 transition-transform"
            >
              ←
            </Button>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate text-sm sm:text-base">{group?.name || "Group"}</h3>
            <p className="text-xs text-muted-foreground">{memberCount} members</p>
          </div>
          <div className="flex gap-0.5 sm:gap-1">
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-9 w-9 touch-manipulation active:scale-95 transition-transform" 
                    onClick={() => alert("Group audio calls coming soon!")}
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
                    className="h-9 w-9 touch-manipulation active:scale-95 transition-transform" 
                    onClick={() => alert("Group video calls coming soon!")}
                  >
                    <Video className="h-4 w-4" />
                  </Button>
                }
              />
              <TooltipContent>Start video call</TooltipContent>
            </Tooltip>
            <Dialog open={showMembers} onOpenChange={setShowMembers}>
              <DialogTrigger
                render={
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-9 w-9 touch-manipulation active:scale-95 transition-transform"
                  >
                    <Users className="h-4 w-4" />
                  </Button>
                }
              />
              <DialogContent className="max-w-md mx-4">
                <DialogHeader>
                  <DialogTitle>Group Members</DialogTitle>
                  <DialogDescription>{memberCount} members</DialogDescription>
              </DialogHeader>
              {isAdmin ? (
                <ScrollArea className="max-h-80 overscroll-contain">
                  <div className="space-y-2">
                    {members.map((m) => (
                      <div key={m.user_id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 active:bg-muted/70 transition-colors">
                        <Avatar className="h-8 w-8 sm:h-9 sm:w-9">
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
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 touch-manipulation active:scale-95 transition-transform" 
                                onClick={() => handleMakeAdmin(m.user_id)} 
                                title="Make Admin"
                              >
                                <Shield className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 touch-manipulation active:scale-95 transition-transform" 
                                onClick={() => handleRemoveAdmin(m.user_id)} 
                                title="Remove Admin"
                              >
                                <ShieldOff className="h-4 w-4" />
                              </Button>
                            )}
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 touch-manipulation active:scale-95 transition-transform" 
                              onClick={() => handleToggleMedia(m.user_id, m.can_share_media)} 
                              title={m.can_share_media ? "Disable media" : "Enable media"}
                            >
                              {m.can_share_media ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-destructive touch-manipulation active:scale-95 transition-transform" 
                              onClick={() => handleRemoveMember(m.user_id)} 
                              title="Remove"
                            >
                              <UserX className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <p className="text-sm text-muted-foreground py-4">
                  Only admins can view the member list for privacy.
                </p>
              )}
            </DialogContent>
          </Dialog>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-9 w-9 text-destructive touch-manipulation active:scale-95 transition-transform" 
            onClick={handleLeaveGroup} 
            title="Leave group"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
        </div>

        {/* Messages - Mobile optimized scrolling */}
        <ScrollArea className="flex-1 p-3 sm:p-4 overscroll-contain" ref={scrollRef}>
        <div className="space-y-2 sm:space-y-3">
          {messages.map((msg) => {
            const isMe = msg.sender_id === user?.id;
            return (
              <div key={msg.id} className={cn("flex gap-2 group", isMe ? "flex-row-reverse" : "flex-row")}>
                {!isMe && (
                  <Avatar className="h-7 w-7 sm:h-8 sm:w-8 mt-1 flex-shrink-0">
                    <AvatarImage src={getSenderImage(msg.sender_id) || undefined} />
                    <AvatarFallback className="text-[10px]">{getSenderName(msg.sender_id).charAt(0)}</AvatarFallback>
                  </Avatar>
                )}
                <div className={cn("max-w-[85%] sm:max-w-[75%] md:max-w-[70%] space-y-0.5", isMe ? "items-end" : "items-start")}>
                  {!isMe && (
                    <p className="text-[10px] text-muted-foreground px-1">{getSenderName(msg.sender_id)}</p>
                  )}
                  <div
                    className={cn(
                      "rounded-2xl px-3 py-2 text-sm sm:text-base",
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
                        className="mb-1 h-auto max-h-60 w-auto max-w-full rounded-lg object-contain touch-manipulation"
                      />
                    )}
                    {msg.message_type === "PDF" && msg.file_url && (
                      <a
                        href={msg.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 underline touch-manipulation active:scale-95 transition-transform"
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
                    {msg.message_type === "TEXT" && (
                      editingMessageId === msg.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            autoFocus
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && window.innerWidth >= 768) {
                                e.preventDefault();
                                handleEditMessage(msg.id);
                              } else if (e.key === "Escape") {
                                setEditingMessageId(null);
                              }
                            }}
                            className={cn(
                              "h-8 text-sm border-0 w-full min-w-[150px] touch-manipulation",
                              isMe ? "bg-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/50" : "bg-background"
                            )}
                            style={{ fontSize: "16px" }}
                          />
                          <button 
                            onClick={() => handleEditMessage(msg.id)} 
                            className="shrink-0 hover:opacity-70 active:scale-95 transition-transform touch-manipulation p-1"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => setEditingMessageId(null)} 
                            className="shrink-0 hover:opacity-70 active:scale-95 transition-transform touch-manipulation p-1"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
                      )
                    )}
                  </div>
                  <div className={cn("flex items-center gap-2", isMe ? "justify-end" : "justify-start")}>
                    <p className="text-[9px] sm:text-[10px] text-muted-foreground px-1">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                    {isMe && msg.message_type === "TEXT" && editingMessageId !== msg.id && (
                      <button 
                        onClick={() => {
                          setEditingMessageId(msg.id);
                          setEditContent(msg.content || "");
                        }}
                        className="text-[9px] text-muted-foreground/50 hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity touch-manipulation p-1"
                        title="Edit message"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {(isMe || isAdmin) && (
                      <button 
                        onClick={() => handleDeleteMessage(msg.id)}
                        className="text-[9px] text-muted-foreground/50 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity touch-manipulation p-1"
                        title="Delete message"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
        </ScrollArea>

        {/* Input - Mobile optimized */}
        <div className="p-2 sm:p-3 border-t bg-card/50 backdrop-blur-md safe-area-inset-bottom">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-1.5 sm:gap-2"
        >
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*,.pdf"
            onChange={handleFileUpload}
          />
          {(isAdmin || group?.canShareMedia) && (
            <Button 
              type="button" 
              variant="ghost" 
              size="icon" 
              className="h-9 w-9 sm:h-10 sm:w-10 shrink-0 touch-manipulation active:scale-95 transition-transform" 
              onClick={() => fileInputRef.current?.click()}
            >
              <ImageIcon className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          )}
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 h-10 bg-muted/50 border-0 text-base touch-manipulation"
            style={{ fontSize: "16px" }}
          />
          <Button 
            type="submit" 
            size="icon" 
            className="h-10 w-10 shrink-0 touch-manipulation active:scale-95 transition-transform" 
            disabled={!newMessage.trim() || sending}
          >
            <Send className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
        </form>
      </div>
      </div>
    </TooltipProvider>
  );
}
