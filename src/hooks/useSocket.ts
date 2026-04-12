"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { getSocket, disconnectSocket } from "@/lib/socket-client";
import type { Socket } from "socket.io-client";

export function useSocket(userId: string | undefined) {
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!userId) return;

    const socket = getSocket(userId);
    socketRef.current = socket;

    function onConnect() {
      setIsConnected(true);
      // Fetch initial online users
      socket.emit(
        "get-online-users",
        (users: string[]) => {
          setOnlineUsers(new Set(users));
        }
      );
    }

    function onDisconnect() {
      setIsConnected(false);
    }

    function onUserOnline({ userId: uid }: { userId: string }) {
      setOnlineUsers((prev) => new Set(prev).add(uid));
    }

    function onUserOffline({ userId: uid }: { userId: string }) {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        next.delete(uid);
        return next;
      });
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("user-online", onUserOnline);
    socket.on("user-offline", onUserOffline);

    if (socket.connected) onConnect();

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("user-online", onUserOnline);
      socket.off("user-offline", onUserOffline);
      disconnectSocket();
    };
  }, [userId]);

  const joinConversation = useCallback((conversationId: string) => {
    socketRef.current?.emit("join-conversation", conversationId);
  }, []);

  const leaveConversation = useCallback((conversationId: string) => {
    socketRef.current?.emit("leave-conversation", conversationId);
  }, []);

  const emitTyping = useCallback(
    (conversationId: string) => {
      socketRef.current?.emit("typing", { conversationId, userId });
    },
    [userId]
  );

  const emitStopTyping = useCallback(
    (conversationId: string) => {
      socketRef.current?.emit("stop-typing", { conversationId, userId });
    },
    [userId]
  );

  return {
    socket: socketRef.current,
    isConnected,
    onlineUsers,
    joinConversation,
    leaveConversation,
    emitTyping,
    emitStopTyping,
  };
}
