"use client";

import { useEffect, useState, useRef, useCallback } from "react";

interface UseScrollOptions {
  threshold?: number; // Distance from bottom to consider "at bottom"
  onScrollUp?: () => void;
  onScrollDown?: () => void;
}

export function useScroll(options: UseScrollOptions = {}) {
  const { threshold = 200, onScrollUp, onScrollDown } = options;
  
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const lastScrollTop = useRef(0);

  // Check if scrolled to bottom
  const checkIfAtBottom = useCallback(() => {
    const element = scrollAreaRef.current;
    if (!element) return true;

    const { scrollTop, scrollHeight, clientHeight } = element;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    
    return distanceFromBottom < threshold;
  }, [threshold]);

  // Handle scroll events
  const handleScroll = useCallback(() => {
    const element = scrollAreaRef.current;
    if (!element) return;

    const atBottom = checkIfAtBottom();
    setIsAtBottom(atBottom);
    setShowScrollButton(!atBottom);

    // Detect scroll direction
    const currentScrollTop = element.scrollTop;
    if (currentScrollTop > lastScrollTop.current) {
      onScrollDown?.();
    } else if (currentScrollTop < lastScrollTop.current) {
      onScrollUp?.();
    }
    lastScrollTop.current = currentScrollTop;
  }, [checkIfAtBottom, onScrollDown, onScrollUp]);

  // Scroll to bottom smoothly
  const scrollToBottom = useCallback((smooth = true) => {
    const element = scrollAreaRef.current;
    if (!element) return;

    element.scrollTo({
      top: element.scrollHeight,
      behavior: smooth ? "smooth" : "auto",
    });
  }, []);

  // Auto-scroll to bottom when at bottom
  const autoScrollToBottom = useCallback(() => {
    if (isAtBottom) {
      scrollToBottom(true);
    }
  }, [isAtBottom, scrollToBottom]);

  // Set up scroll listener
  useEffect(() => {
    const element = scrollAreaRef.current;
    if (!element) return;

    element.addEventListener("scroll", handleScroll);
    return () => element.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  return {
    scrollAreaRef,
    isAtBottom,
    showScrollButton,
    scrollToBottom,
    autoScrollToBottom,
  };
}
