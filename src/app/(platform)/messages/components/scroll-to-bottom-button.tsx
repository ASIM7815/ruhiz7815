"use client";

import { ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ScrollToBottomButtonProps {
  onClick: () => void;
  unreadCount?: number;
  show: boolean;
}

export function ScrollToBottomButton({
  onClick,
  unreadCount = 0,
  show,
}: ScrollToBottomButtonProps) {
  if (!show) return null;

  return (
    <div className="absolute bottom-20 right-4 z-10 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <Button
        onClick={onClick}
        size="icon"
        className="h-10 w-10 rounded-full shadow-lg hover:shadow-xl transition-shadow relative"
      >
        <ArrowDown className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 text-[10px]">
            {unreadCount > 99 ? "99+" : unreadCount}
          </Badge>
        )}
      </Button>
    </div>
  );
}
