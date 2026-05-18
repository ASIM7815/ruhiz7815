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
  const [showActions, setShowActions] = useState(false);
  
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

  // Mobile: Long press to show actions
  const handleLongPress = () => {
    setShowActions(true);
    setTimeout(() => setShowActions(false), 3000);
  };

  let pressTimer: NodeJS.Timeout;
  const handleTouchStart = () => {
    pressTimer = setTimeout(handleLongPress, 500);
  };
  const handleTouchEnd = () => {
    clearTimeout(pressTimer);
  };
  
  return (
    <div
      className={`flex items-end gap-2 ${isOwn ? "flex-row-reverse" : "flex-row"} group`}
      onMouseEnter={() => setShowTimestamp(true)}
      onMouseLeave={() => setShowTimestamp(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {/* Avatar (only show on first message in group for other user) */}
      {!isOwn && isLastInGroup ? (
        <Avatar className="h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0">
          <AvatarImage src={senderImage ?? undefined} alt={senderName} />
          <AvatarFallback className="text-xs">
            {senderName ? getInitials(senderName) : "?"}
          </AvatarFallback>
        </Avatar>
      ) : !isOwn ? (
        <div className="w-7 sm:w-8 flex-shrink-0" />
      ) : null}
      
      {/* Message Content */}
      <div className={`flex flex-col ${isOwn ? "items-end" : "items-start"} max-w-[85%] sm:max-w-[75%] md:max-w-[65%]`}>
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
            <p className="text-sm sm:text-base whitespace-pre-wrap leading-relaxed">
              {renderMessageContent(content, isOwn)}
            </p>
          </div>
          
          {/* Hover/Touch Actions - Mobile optimized */}
          <div
            className={`absolute top-0 ${
              isOwn ? "right-full mr-1 sm:mr-2" : "left-full ml-1 sm:ml-2"
            } ${showActions ? "flex" : "hidden"} md:group-hover:flex items-center gap-1`}
          >
            {/* React */}
            <Popover>
              <PopoverTrigger
                render={
                  <button
                    className="p-1.5 sm:p-2 rounded-full hover:bg-accent active:bg-accent/70 text-muted-foreground transition-all touch-manipulation active:scale-95"
                    title="React"
                  >
                    <Smile className="h-4 w-4 sm:h-5 sm:w-5" />
                  </button>
                }
              />
              <PopoverContent
                className="w-auto p-2"
                side={isOwn ? "left" : "right"}
              >
                <div className="flex gap-1 flex-wrap max-w-[200px]">
                  {QUICK_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => onReact?.(id, emoji)}
                      className={`text-2xl hover:scale-125 active:scale-110 transition-transform p-1.5 rounded touch-manipulation ${
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
                <DropdownMenuTrigger
                  render={
                    <button
                      className="p-1.5 sm:p-2 rounded-full hover:bg-accent active:bg-accent/70 text-muted-foreground transition-all touch-manipulation active:scale-95"
                      title="More"
                    >
                      <MoreVertical className="h-4 w-4 sm:h-5 sm:w-5" />
                    </button>
                  }
                />
                <DropdownMenuContent align={isOwn ? "end" : "start"} className="w-40">
                  <DropdownMenuItem 
                    onClick={() => onEdit?.(id)}
                    className="cursor-pointer"
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onDelete?.(id)}
                    className="text-destructive cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
        
        {/* Reactions - Mobile optimized */}
        {Object.keys(groupedReactions).length > 0 && (
          <div className={`flex flex-wrap gap-1 mt-1 ${isOwn ? "justify-end" : ""}`}>
            {Object.entries(groupedReactions).map(([emoji, reactionList]) => (
              <button
                key={emoji}
                onClick={() => onReact?.(id, emoji)}
                className={`text-xs px-2 py-1 rounded-full border transition-all touch-manipulation active:scale-95 ${
                  hasReactedWith(emoji)
                    ? "bg-primary/10 border-primary/30"
                    : "bg-muted border-border hover:bg-accent active:bg-accent/70"
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
        
        {/* Timestamp and Status (show on last message in group or on hover/touch) */}
        {(isLastInGroup || showTimestamp || showActions) && (
          <div
            className={`flex items-center gap-1 mt-1 text-[10px] sm:text-xs text-muted-foreground ${
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
