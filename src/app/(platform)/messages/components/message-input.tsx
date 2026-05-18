"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Smile, Paperclip, X } from "lucide-react";
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
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-resize textarea with mobile optimization
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      const maxHeight = window.innerWidth < 768 ? 100 : 120; // Smaller max on mobile
      textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
    }
  }, [message]);

  // Handle mobile keyboard visibility
  useEffect(() => {
    if (!isFocused) return;

    const handleResize = () => {
      // Scroll to input when keyboard opens on mobile
      if (window.innerWidth < 768) {
        setTimeout(() => {
          containerRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
        }, 100);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isFocused]);

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

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    // Keep focus on mobile for continuous messaging
    if (window.innerWidth < 768) {
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // On mobile, Enter should add new line, not send (better UX)
    // On desktop, Enter sends, Shift+Enter adds new line
    if (e.key === "Enter" && !e.shiftKey && window.innerWidth >= 768) {
      e.preventDefault();
      handleSend();
    }
  };

  const insertEmoji = (emoji: string) => {
    setMessage((prev) => prev + emoji);
    textareaRef.current?.focus();
  };

  const clearMessage = () => {
    setMessage("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    textareaRef.current?.focus();
  };

  const isNearLimit = message.length > maxLength * 0.9;
  const canSend = message.trim().length > 0 && !disabled;

  return (
    <div 
      ref={containerRef}
      className="sticky bottom-0 z-10 border-t border-border bg-background/95 backdrop-blur-sm supports-[backdrop-filter]:bg-background/80 p-2 sm:p-3 md:p-4 safe-area-inset-bottom"
    >
      {/* Mobile: Show character count when typing */}
      {isFocused && message.length > 0 && (
        <div className="flex items-center justify-between mb-2 px-1 md:hidden">
          <span className="text-xs text-muted-foreground">
            {message.length}/{maxLength}
          </span>
          {isNearLimit && (
            <span className="text-xs text-amber-500 font-medium">
              Character limit approaching
            </span>
          )}
        </div>
      )}

      <div className="flex items-end gap-1.5 sm:gap-2">
        {/* Emoji Picker - Hide on mobile when typing */}
        <Popover>
          <PopoverTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className={`flex-shrink-0 h-9 w-9 sm:h-10 sm:w-10 transition-all ${
                  isFocused && window.innerWidth < 768 ? "hidden" : ""
                }`}
                type="button"
              >
                <Smile className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            }
          />
          <PopoverContent className="w-auto p-2" side="top" align="start">
            <div className="flex gap-1 flex-wrap max-w-[280px]">
              {QUICK_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => insertEmoji(emoji)}
                  className="text-2xl hover:scale-125 active:scale-110 transition-transform p-1.5 rounded hover:bg-accent touch-manipulation"
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
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            disabled={disabled}
            maxLength={maxLength}
            rows={1}
            className="min-h-[40px] max-h-[100px] md:max-h-[120px] resize-none pr-10 text-base md:text-sm touch-manipulation"
            style={{ fontSize: "16px" }} // Prevent iOS zoom on focus
          />
          
          {/* Clear button (mobile only, when typing) */}
          {message.length > 0 && isFocused && (
            <button
              onClick={clearMessage}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-accent md:hidden touch-manipulation"
              type="button"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}

          {/* Character Count (desktop, when near limit) */}
          {isNearLimit && !isFocused && (
            <span className="absolute bottom-2 right-2 text-xs text-muted-foreground hidden md:block">
              {message.length}/{maxLength}
            </span>
          )}
        </div>

        {/* Attachment Button - Hide on mobile when typing */}
        <Button
          variant="ghost"
          size="icon"
          className={`flex-shrink-0 h-9 w-9 sm:h-10 sm:w-10 transition-all ${
            isFocused && window.innerWidth < 768 ? "hidden" : ""
          }`}
          type="button"
          disabled={disabled}
        >
          <Paperclip className="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>

        {/* Send Button - Prominent on mobile */}
        <Button
          size="icon"
          onClick={handleSend}
          disabled={!canSend}
          className={`flex-shrink-0 h-10 w-10 sm:h-10 sm:w-10 touch-manipulation transition-all ${
            canSend 
              ? "bg-primary hover:bg-primary/90 scale-100" 
              : "scale-95 opacity-50"
          }`}
          type="button"
        >
          <Send className="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>
      </div>

      {/* Mobile hint */}
      {isFocused && message.length === 0 && (
        <p className="text-xs text-muted-foreground mt-2 px-1 md:hidden">
          Tap send button to send message
        </p>
      )}
    </div>
  );
}
