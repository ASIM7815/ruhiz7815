"use client";

import { useState } from "react";
import { Smile, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DeliveryStatus } from "./delivery-status";
import { LinkPreview } from "./link-preview";
import { formatMessageTime } from "../utils/date-formatting";
import { getFirstUrl, hasUrls } from "../utils/link-detection";
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

interface Reaction {
  id: string;
  userId: string;
  emoji: string;
}

interface MessageBubbleProps {
  id: string;
  content: string;
  senderId: string;
  createdAt: string;
  isRead: boolean;
  reactions: Reaction[];
  isOwn: boolean;
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
  senderName?: string;
  senderImage?: string | null;
  currentUserId: string;
  onReact?: (messageId: string, emoji: string) => void;
  onEdit?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
}

const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// Render message content with clickable links
function renderMessageContent(content: string, isOwn: boolean) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = content.split(urlRegex);
  
  return parts.map((part, index) => {
    if (part.match(urlRegex)) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className={`underline hover:no-underline ${
            isOwn ? "text-primary-foreground" : "text-primary"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      );
    }
    return part;
  });
}

export function MessageBubble({
  id,
  content,
  senderId,
  createdAt,
  isRead,
  reactions,
  isOwn,
  isFirstInGroup,
  isLastInGroup,
  senderName,
  senderImage,
  currentUserId,
  onReact,
  onEdit,
  onDelete,
}: MessageBubbleProps) {
  const [showTimestamp, setShowTimestamp] = useState(false);
  
  // Determine delivery status
  const getDeliveryStatus = () => {
    if (id.startsWith("temp-")) return "sending";
    if (isRead) return "read";
    return "sent"; // Simplified - could add "delivered" state
  };
  
  const deliveryStatus = getDeliveryStatus();
  
  // Group reactions by emoji
  const groupedReactions = reactions.reduce((acc, r) => {
    acc[r.emoji] = acc[r.emoji] || [];
    acc[r.emoji].push(r);
    return acc;
  }, {} as Record<string, Reaction[]>);
  
  const hasReactedWith = (emoji: string) => {
    return reactions.some((r) => r.userId === currentUserId && r.emoji === emoji);
  };
  
  return (
    <div
      className={`flex items-end gap-2 ${isOwn ? "flex-row-reverse" : "flex-row"} group`}
      onMouseEnter={() => setShowTimestamp(true)}
      onMouseLeave={() => setShowTimestamp(false)}
    >
      {/* Avatar (only show on first message in group for other user) */}
      {!isOwn && isLastInGroup ? (
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarImage src={senderImage ?? undefined} alt={senderName} />
          <AvatarFallback className="text-xs">
            {senderName ? getInitials(senderName) : "?"}
          </AvatarFallback>
        </Avatar>
      ) : !isOwn ? (
        <div className="w-8 flex-shrink-0" />
      ) : null}
      
      {/* Message Content */}
      <div className={`flex flex-col ${isOwn ? "items-end" : "items-start"} max-w-[75%] sm:max-w-[65%]`}>
        {/* Bubble */}
        <div className="relative">
          <div
            className={`px-3 py-2 rounded-2xl break-words ${
              isOwn
                ? `bg-primary text-primary-foreground ${
                    isLastInGroup ? "rounded-br-md" : ""
                  } ${isFirstInGroup ? "" : "rounded-tr-md"}`
                : `bg-muted ${isLastInGroup ? "rounded-bl-md" : ""} ${
                    isFirstInGroup ? "" : "rounded-tl-md"
                  }`
            }`}
          >
            <p className="text-sm whitespace-pre-wrap">
              {renderMessageContent(content, isOwn)}
            </p>
          </div>
          
          {/* Hover Actions */}
          <div
            className={`absolute top-0 ${
              isOwn ? "right-full mr-1" : "left-full ml-1"
            } hidden group-hover:flex items-center gap-1`}
          >
            {/* React */}
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className="p-1.5 rounded-full hover:bg-accent text-muted-foreground transition-colors"
                  title="React"
                >
                  <Smile className="h-4 w-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent
                className="w-auto p-2"
                side={isOwn ? "left" : "right"}
              >
                <div className="flex gap-1">
                  {QUICK_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => onReact?.(id, emoji)}
                      className={`text-xl hover:scale-125 transition-transform p-1 rounded ${
                        hasReactedWith(emoji) ? "bg-accent" : ""
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            
            {/* More Options (own messages only) */}
            {isOwn && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="p-1.5 rounded-full hover:bg-accent text-muted-foreground transition-colors"
                    title="More"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align={isOwn ? "end" : "start"}>
                  <DropdownMenuItem onClick={() => onEdit?.(id)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onDelete?.(id)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
        
        {/* Reactions */}
        {Object.keys(groupedReactions).length > 0 && (
          <div className={`flex flex-wrap gap-1 mt-1 ${isOwn ? "justify-end" : ""}`}>
            {Object.entries(groupedReactions).map(([emoji, reactionList]) => (
              <button
                key={emoji}
                onClick={() => onReact?.(id, emoji)}
                className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                  hasReactedWith(emoji)
                    ? "bg-primary/10 border-primary/30"
                    : "bg-muted border-border hover:bg-accent"
                }`}
              >
                {emoji}{" "}
                {reactionList.length > 1 && (
                  <span className="text-muted-foreground ml-0.5">
                    {reactionList.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
        
        {/* Timestamp and Status (show on last message in group or on hover) */}
        {(isLastInGroup || showTimestamp) && (
          <div
            className={`flex items-center gap-1 mt-1 text-[10px] text-muted-foreground ${
              isOwn ? "flex-row-reverse" : ""
            }`}
          >
            <span>{formatMessageTime(createdAt)}</span>
            {isOwn && <DeliveryStatus status={deliveryStatus} />}
          </div>
        )}
      </div>
    </div>
  );
}
