"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface Participant {
  id: string;
  uid: string | null;
  name: string;
  image: string | null;
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

interface ConversationListItemProps {
  conversation: Conversation;
  isSelected: boolean;
  currentUserId: string;
  onClick: () => void;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d`;
  return new Date(dateStr).toLocaleDateString();
}

export function ConversationListItem({
  conversation,
  isSelected,
  currentUserId,
  onClick,
}: ConversationListItemProps) {
  const { participant, lastMessage, unreadCount } = conversation;

  if (!participant) return null;

  const isOwnMessage = lastMessage?.senderId === currentUserId;
  const messagePreview = lastMessage
    ? isOwnMessage
      ? `You: ${lastMessage.content}`
      : lastMessage.content
    : "Start a conversation";

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-3 hover:bg-accent/50 transition-colors text-left ${
        isSelected ? "bg-accent" : ""
      }`}
    >
      {/* Avatar */}
      <Avatar className="h-12 w-12 flex-shrink-0">
        <AvatarImage src={participant.image ?? undefined} alt={participant.name} />
        <AvatarFallback>{getInitials(participant.name)}</AvatarFallback>
      </Avatar>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Name and Time */}
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-semibold truncate">{participant.name}</p>
          {lastMessage && (
            <span className="text-[10px] text-muted-foreground ml-2 flex-shrink-0">
              {formatTime(lastMessage.createdAt)}
            </span>
          )}
        </div>

        {/* Message Preview and Unread Badge */}
        <div className="flex items-center justify-between gap-2">
          <p
            className={`text-xs truncate ${
              unreadCount > 0 && !isOwnMessage
                ? "font-semibold text-foreground"
                : "text-muted-foreground"
            }`}
          >
            {messagePreview}
          </p>
          {unreadCount > 0 && (
            <Badge className="ml-2 h-5 min-w-[20px] px-1.5 text-[10px] flex-shrink-0">
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </div>
      </div>
    </button>
  );
}
