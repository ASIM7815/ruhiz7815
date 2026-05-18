"use client";

import { useCallback, useRef } from "react";

interface UseTypingOptions {
  onStartTyping?: () => void;
  onStopTyping?: () => void;
  debounceMs?: number;
}

export function useTyping(options: UseTypingOptions = {}) {
  const { onStartTyping, onStopTyping, debounceMs = 3000 } = options;
  
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  const startTyping = useCallback(() => {
    // Clear any existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // If not already typing, broadcast start
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      onStartTyping?.();
    }

    // Set timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      onStopTyping?.();
    }, debounceMs);
  }, [onStartTyping, onStopTyping, debounceMs]);

  const stopTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    
    if (isTypingRef.current) {
      isTypingRef.current = false;
      onStopTyping?.();
    }
  }, [onStopTyping]);

  return {
    startTyping,
    stopTyping,
  };
}
