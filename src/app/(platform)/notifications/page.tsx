"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type React from "react";
import {
  Bell,
  CheckCheck,
  MessageSquare,
  Shield,
  UserPlus,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: string;
};

const iconMap: Record<string, React.ElementType> = {
  PROJECT_JOIN_REQUEST_CREATED: UserPlus,
  PROJECT_JOIN_REQUEST_APPROVED: Shield,
  PROJECT_JOIN_REQUEST_REJECTED: XCircle,
  PROJECT_MEMBER_REMOVED: XCircle,
  PROJECT_ROLE_CHANGED: Shield,
  GROUP_MESSAGE_CREATED: MessageSquare,
};

function timeAgo(dateString: string) {
  const diff = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadNotifications() {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNotifications();
  }, []);

  async function openNotification(notification: NotificationItem) {
    if (!notification.read) {
      await fetch(`/api/notifications/${notification.id}`, { method: "PATCH" });
      setNotifications((current) =>
        current.map((item) => (item.id === notification.id ? { ...item, read: true } : item))
      );
    }
    if (notification.link) router.push(notification.link);
  }

  async function markAllRead() {
    await fetch("/api/notifications", { method: "PATCH" });
    setNotifications((current) => current.map((item) => ({ ...item, read: true })));
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold md:text-3xl">Notifications</h1>
          <p className="mt-1 text-muted-foreground">Stay updated on your projects and activities</p>
        </div>
        <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={markAllRead}>
          <CheckCheck className="mr-2 h-4 w-4" />
          Mark All Read
        </Button>
      </div>

      <Card>
        <CardContent className="divide-y p-0">
          {loading ? (
            <p className="p-8 text-center text-sm text-muted-foreground">Loading notifications...</p>
          ) : notifications.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">No notifications yet.</p>
          ) : (
            notifications.map((notification) => {
              const Icon = iconMap[notification.type] || Bell;
              return (
                <button
                  key={notification.id}
                  className={`flex w-full items-start gap-4 p-4 text-left transition-colors hover:bg-muted/50 ${
                    !notification.read ? "bg-primary/5" : ""
                  }`}
                  onClick={() => openNotification(notification)}
                >
                  <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{notification.title}</p>
                      {!notification.read && <span className="h-2 w-2 rounded-full bg-primary" />}
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">{notification.message}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{timeAgo(notification.createdAt)}</p>
                  </div>
                </button>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
