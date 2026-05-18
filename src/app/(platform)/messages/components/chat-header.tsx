"use client";

import { ArrowLeft, Phone, Video, MoreVertical } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ChatHeaderProps {
  participant: {
    id: string;
    name: string;
    image: string | null;
    uid: string | null;
  };
  isOnline?: boolean;
  lastSeen?: string;
  onBack?: () => void;
  onVoiceCall?: () => void;
  onVideoCall?: () => void;
  onMute?: () => void;
  onBlock?: () => void;
  callDisabled?: boolean;
  showBackButton?: boolean;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function ChatHeader({
  participant,
  isOnline = false,
  lastSeen,
  onBack,
  onVoiceCall,
  onVideoCall,
  onMute,
  onBlock,
  callDisabled = false,
  showBackButton = true,
}: ChatHeaderProps) {
  return (
    <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* Back Button (Mobile) */}
      {showBackButton && onBack && (
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden flex-shrink-0 h-9 w-9"
          onClick={onBack}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      )}

      {/* Avatar with Online Status */}
      <div className="relative flex-shrink-0">
        <Avatar className="h-10 w-10">
          <AvatarImage src={participant.image ?? undefined} alt={participant.name} />
          <AvatarFallback>{getInitials(participant.name)}</AvatarFallback>
        </Avatar>
        {isOnline && (
          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
        )}
      </div>

      {/* Name and Status */}
      <div className="flex-1 min-w-0 overflow-hidden">
        <h2 className="text-sm font-semibold truncate">{participant.name}</h2>
        <p className="text-xs text-muted-foreground truncate">
          {isOnline ? "Online" : lastSeen ? `Last seen ${lastSeen}` : `UID: ${participant.uid}`}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {/* Voice Call */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 flex-shrink-0"
          onClick={onVoiceCall}
          disabled={callDisabled}
          title="Voice call"
        >
          <Phone className="h-5 w-5" />
        </Button>

        {/* Video Call */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 flex-shrink-0"
          onClick={onVideoCall}
          disabled={callDisabled}
          title="Video call"
        >
          <Video className="h-5 w-5" />
        </Button>

        {/* More Options */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 flex-shrink-0"
              >
                <MoreVertical className="h-5 w-5" />
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onMute}>
              Mute notifications
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onBlock} className="text-destructive">
              Block user
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
