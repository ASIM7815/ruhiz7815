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
    <div className="sticky top-0 z-10 flex items-center gap-2 sm:gap-3 px-3 py-2.5 sm:px-4 sm:py-3 border-b border-border bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80 safe-area-inset-top">
      {/* Back Button (Mobile) */}
      {showBackButton && onBack && (
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden flex-shrink-0 h-9 w-9 touch-manipulation active:scale-95 transition-transform"
          onClick={onBack}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      )}

      {/* Avatar with Online Status */}
      <div className="relative flex-shrink-0">
        <Avatar className="h-9 w-9 sm:h-10 sm:w-10">
          <AvatarImage src={participant.image ?? undefined} alt={participant.name} />
          <AvatarFallback className="text-sm">{getInitials(participant.name)}</AvatarFallback>
        </Avatar>
        {isOnline && (
          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-green-500 border-2 border-background ring-1 ring-green-500/20" />
        )}
      </div>

      {/* Name and Status */}
      <div className="flex-1 min-w-0 overflow-hidden">
        <h2 className="text-sm sm:text-base font-semibold truncate leading-tight">{participant.name}</h2>
        <p className="text-xs text-muted-foreground truncate leading-tight mt-0.5">
          {isOnline ? (
            <span className="flex items-center gap-1">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
              Online
            </span>
          ) : lastSeen ? (
            `Last seen ${lastSeen}`
          ) : (
            `UID: ${participant.uid}`
          )}
        </p>
      </div>

      {/* Action Buttons - Responsive */}
      <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
        {/* Voice Call */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 flex-shrink-0 touch-manipulation active:scale-95 transition-transform"
          onClick={onVoiceCall}
          disabled={callDisabled}
          title="Voice call"
        >
          <Phone className="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>

        {/* Video Call */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 flex-shrink-0 touch-manipulation active:scale-95 transition-transform"
          onClick={onVideoCall}
          disabled={callDisabled}
          title="Video call"
        >
          <Video className="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>

        {/* More Options */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 flex-shrink-0 touch-manipulation active:scale-95 transition-transform"
              >
                <MoreVertical className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={onMute} className="cursor-pointer">
              Mute notifications
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onBlock} className="text-destructive cursor-pointer">
              Block user
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
