"use client";

import { User as UserIcon } from "lucide-react";
import { ChatHeader } from "./chat-header";
import { MessageInput } from "./message-input";
import { MessageList } from "./message-list";

interface Participant {
  id: string;
  uid: string | null;
  name: string;
  image: string | null;
}

interface Message {
  id: string;
  content: string;
  senderId: string;
  isRead: boolean;
  createdAt: string;
  reactions: { id: string; userId: string; emoji: string }[];
}

interface ChatContainerProps {
  participant: Participant | null;
  messages: Message[];
  currentUserId: string;
  onBack?: () => void;
  onSendMessage: (content: string) => void;
  onVoiceCall?: () => void;
  onVideoCall?: () => void;
  onReact?: (messageId: string, emoji: string) => void;
  onEditMessage?: (messageId: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onTyping?: () => void;
  isTyping?: boolean;
  isOnline?: boolean;
  lastSeen?: string;
  callDisabled?: boolean;
  showBackButton?: boolean;
}

export function ChatContainer({
  participant,
  messages,
  currentUserId,
  onBack,
  onSendMessage,
  onVoiceCall,
  onVideoCall,
  onReact,
  onEditMessage,
  onDeleteMessage,
  onTyping,
  isTyping = false,
  isOnline = false,
  lastSeen,
  callDisabled = false,
  showBackButton = true,
}: ChatContainerProps) {
  // Empty state
  if (!participant) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center px-6 bg-muted/20">
        <div className="rounded-full bg-muted p-6 mb-4">
          <UserIcon className="h-12 w-12 text-muted-foreground/50" />
        </div>
        <h3 className="text-lg font-semibold mb-1">Your Messages</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Search for a student using their 5-digit UID to start a conversation,
          or select an existing chat from the left.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-background">
      {/* Fixed Header */}
      <ChatHeader
        participant={participant}
        isOnline={isOnline}
        lastSeen={lastSeen}
        onBack={onBack}
        onVoiceCall={onVoiceCall}
        onVideoCall={onVideoCall}
        callDisabled={callDisabled}
        showBackButton={showBackButton}
      />

      {/* Messages Area with new MessageList */}
      <MessageList
        messages={messages}
        currentUserId={currentUserId}
        participant={participant}
        isTyping={isTyping}
        onReact={onReact}
        onEdit={onEditMessage}
        onDelete={onDeleteMessage}
      />

      {/* Fixed Input */}
      <MessageInput onSend={onSendMessage} onTyping={onTyping} />
    </div>
  );
}
