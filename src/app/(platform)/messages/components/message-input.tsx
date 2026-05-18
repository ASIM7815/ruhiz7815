"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Smile, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface MessageInputProps {
  onSend: (content: string) => void;
  onTyping?: () => void;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
}

const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏", "🔥", "✨"];

export function MessageInput({
  onSend,
  onTyping,
  disabled = false,
  placeholder = "Type a message...",
  maxLength = 5000,
}: MessageInputProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [message]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);

    // Broadcast typing indicator
    if (onTyping) {
      onTyping();
      
      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Stop typing after 3 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        // Could add onStopTyping callback here
      }, 3000);
    }
  };

  const handleSend = () => {
    const trimmed = message.trim();
    if (!trimmed || disabled) return;

    onSend(trimmed);
    setMessage("");

    // Clear typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Focus back on input
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const insertEmoji = (emoji: string) => {
    setMessage((prev) => prev + emoji);
    textareaRef.current?.focus();
  };

  const isNearLimit = message.length > maxLength * 0.9;
  const canSend = message.trim().length > 0 && !disabled;

  return (
    <div className="sticky bottom-0 z-10 border-t border-border bg-background p-3 sm:p-4">
      <div className="flex items-end gap-2">
        {/* Emoji Picker */}
        <Popover>
          <PopoverTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="flex-shrink-0 h-9 w-9"
                type="button"
              >
                <Smile className="h-5 w-5" />
              </Button>
            }
          />
          <PopoverContent className="w-auto p-2" side="top" align="start">
            <div className="flex gap-1">
              {QUICK_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => insertEmoji(emoji)}
                  className="text-2xl hover:scale-125 transition-transform p-1 rounded hover:bg-accent"
                  type="button"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Text Input */}
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            maxLength={maxLength}
            rows={1}
            className="min-h-[40px] max-h-[120px] resize-none pr-12"
          />
          
          {/* Character Count (when near limit) */}
          {isNearLimit && (
            <span className="absolute bottom-2 right-2 text-xs text-muted-foreground">
              {message.length}/{maxLength}
            </span>
          )}
        </div>

        {/* Attachment Button */}
        <Button
          variant="ghost"
          size="icon"
          className="flex-shrink-0 h-9 w-9"
          type="button"
          disabled={disabled}
        >
          <Paperclip className="h-5 w-5" />
        </Button>

        {/* Send Button */}
        <Button
          size="icon"
          onClick={handleSend}
          disabled={!canSend}
          className="flex-shrink-0 h-9 w-9"
          type="button"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
