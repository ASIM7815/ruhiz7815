"use client";

import { useEffect } from "react";
import { MessageBubble } from "./message-bubble";
import { DateSeparator } from "./date-separator";
import { TypingIndicator } from "./typing-indicator";
import { ScrollToBottomButton } from "./scroll-to-bottom-button";
import { groupMessagesByDate } from "../utils/message-grouping";
import { useScroll } from "../hooks/use-scroll";

interface Message {
  id: string;
  content: string;
  senderId: string;
  isRead: boolean;
  createdAt: string;
  reactions: { id: string; userId: string; emoji: string }[];
}

interface Participant {
  id: string;
  name: string;
  image: string | null;
}

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
  participant: Participant;
  isTyping?: boolean;
  unreadCount?: number;
  onReact?: (messageId: string, emoji: string) => void;
  onEdit?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
}

export function MessageList({
  messages,
  currentUserId,
  participant,
  isTyping = false,
  unreadCount = 0,
  onReact,
  onEdit,
  onDelete,
}: MessageListProps) {
  const { scrollAreaRef, showScrollButton, scrollToBottom, autoScrollToBottom } =
    useScroll({ threshold: 200 });

  // Auto-scroll on new messages
  useEffect(() => {
    autoScrollToBottom();
  }, [messages, autoScrollToBottom]);

  // Group messages by date
  const groupedMessages = groupMessagesByDate(messages);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm px-4 text-center">
        No messages yet. Start the conversation!
      </div>
    );
  }

  return (
    <div className="flex-1 relative flex flex-col overflow-hidden">
      {/* Scrollable Messages Area - Mobile optimized */}
      <div
        ref={scrollAreaRef}
        className="flex-1 overflow-y-auto px-3 sm:px-4 py-3 scroll-smooth overscroll-contain"
        style={{
          // Optimize scrolling performance on mobile
          WebkitOverflowScrolling: 'touch',
          scrollBehavior: 'smooth',
        }}
      >
        <div className="space-y-1">
          {groupedMessages.map((msg) => (
            <div key={msg.id}>
              {/* Date Separator */}
              {msg.showDate && <DateSeparator date={msg.createdAt} />}

              {/* Message Bubble */}
              <MessageBubble
                id={msg.id}
                content={msg.content}
                senderId={msg.senderId}
                createdAt={msg.createdAt}
                isRead={msg.isRead}
                reactions={msg.reactions}
                isOwn={msg.senderId === currentUserId}
                isFirstInGroup={msg.isFirstInGroup}
                isLastInGroup={msg.isLastInGroup}
                senderName={participant.name}
                senderImage={participant.image}
                currentUserId={currentUserId}
                onReact={onReact}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            </div>
          ))}

          {/* Typing Indicator */}
          <TypingIndicator userName={participant.name} show={isTyping} />
        </div>
      </div>

      {/* Scroll to Bottom Button - Mobile optimized */}
      <ScrollToBottomButton
        onClick={() => scrollToBottom(true)}
        unreadCount={unreadCount}
        show={showScrollButton}
      />
    </div>
  );
}
