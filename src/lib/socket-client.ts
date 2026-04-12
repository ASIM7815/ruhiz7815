import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket(userId: string): Socket {
  if (socket?.connected) return socket;

  socket = io({
    path: "/api/socketio",
    auth: { userId },
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
  });

  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
