import { Server as HTTPServer } from "http";
import { Server, Socket } from "socket.io";

// userId → Set<socketId> (supports multiple tabs)
const onlineUsers = new Map<string, Set<string>>();

let io: Server | null = null;

export function getIO(): Server {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
}

export function initSocketServer(httpServer: HTTPServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      credentials: true,
    },
    path: "/api/socketio",
  });

  io.use((socket, next) => {
    const userId = socket.handshake.auth.userId as string | undefined;
    if (!userId) {
      return next(new Error("Authentication required"));
    }
    (socket as Socket & { userId: string }).userId = userId;
    next();
  });

  io.on("connection", (rawSocket) => {
    const socket = rawSocket as Socket & { userId: string };
    const userId = socket.userId;

    // Track online status
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId)!.add(socket.id);

    // Notify others this user is online
    socket.broadcast.emit("user-online", { userId });

    // Auto-join user's personal room (for targeted messages)
    socket.join(`user-${userId}`);

    // Join a conversation room
    socket.on("join-conversation", (conversationId: string) => {
      socket.join(`conversation-${conversationId}`);
    });

    // Leave a conversation room
    socket.on("leave-conversation", (conversationId: string) => {
      socket.leave(`conversation-${conversationId}`);
    });

    // Typing indicators
    socket.on(
      "typing",
      (data: { conversationId: string; userId: string }) => {
        socket
          .to(`conversation-${data.conversationId}`)
          .emit("typing", { userId: data.userId });
      }
    );

    socket.on(
      "stop-typing",
      (data: { conversationId: string; userId: string }) => {
        socket
          .to(`conversation-${data.conversationId}`)
          .emit("stop-typing", { userId: data.userId });
      }
    );

    // Get online users
    socket.on("get-online-users", (callback: (users: string[]) => void) => {
      callback(Array.from(onlineUsers.keys()));
    });

    socket.on("disconnect", () => {
      const sockets = onlineUsers.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          onlineUsers.delete(userId);
          socket.broadcast.emit("user-offline", { userId });
        }
      }
    });
  });

  return io;
}
