"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  Loader2,
  MessageSquare,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type NotificationData = {
  groupConversationId?: string;
  projectId?: string;
  requestId?: string;
};

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  data: NotificationData | null;
  read: boolean;
  createdAt: string;
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.max(0, Math.floor(diff / 60000));
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function getNotificationIcon(type: string) {
  if (type === "PROJECT_ACCEPTED") return CheckCircle2;
  if (type === "PROJECT_REJECTED") return XCircle;
  if (type === "PROJECT_JOIN_REQUEST") return MessageSquare;
  return Bell;
}

function getNotificationTone(type: string) {
  if (type === "PROJECT_ACCEPTED") {
    return "bg-emerald-500/10 text-emerald-600";
  }
  if (type === "PROJECT_REJECTED") {
    return "bg-red-500/10 text-red-600";
  }
  return "bg-primary/10 text-primary";
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const [error, setError] = useState("");

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications]
  );

  const loadNotifications = useCallback(async () => {
    setError("");
    try {
      const res = await fetch("/api/notifications?limit=50", {
        cache: "no-store",
      });
      if (!res.ok) {
        setError("Could not load notifications.");
        return;
      }

      const data = await res.json();
      setNotifications(data.notifications || []);
    } catch {
      setError("Could not load notifications.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  async function markAllRead() {
    setMarkingAllRead(true);
    try {
      const res = await fetch("/api/notifications", { method: "PATCH" });
      if (res.ok) {
        setNotifications((current) =>
          current.map((notification) => ({ ...notification, read: true }))
        );
      }
    } finally {
      setMarkingAllRead(false);
    }
  }

  async function markOneRead(notificationId: string) {
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === notificationId
          ? { ...notification, read: true }
          : notification
      )
    );
    await fetch(`/api/notifications/${notificationId}`, { method: "PATCH" });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold md:text-3xl">
            Notifications
          </h1>
          <p className="mt-1 text-muted-foreground">
            Stay updated on project requests, approvals, and team activity.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full sm:w-auto"
          disabled={markingAllRead || unreadCount === 0}
          onClick={markAllRead}
        >
          {markingAllRead ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <CheckCheck className="mr-2 h-4 w-4" />
          )}
          Mark All Read
        </Button>
      </div>

      <Card>
        <CardContent className="divide-y p-0">
          {loading && (
            <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading notifications
            </div>
          )}

          {!loading && error && (
            <div className="p-6 text-sm text-destructive">{error}</div>
          )}

          {!loading && !error && notifications.length === 0 && (
            <div className="mobile-empty-card">
              <p className="text-sm text-muted-foreground">
                No notifications yet.
              </p>
            </div>
          )}

          {notifications.map((notification) => {
            const Icon = getNotificationIcon(notification.type);
            const tone = getNotificationTone(notification.type);
            const groupHref = notification.data?.groupConversationId
              ? `/messages?group=${notification.data.groupConversationId}`
              : null;
            const projectHref = notification.data?.projectId
              ? `/projects/${notification.data.projectId}`
              : null;

            return (
              <div
                key={notification.id}
                className={`flex items-start gap-4 p-4 transition-colors hover:bg-muted/50 ${
                  !notification.read ? "bg-primary/5" : ""
                }`}
              >
                <div className={`rounded-lg p-2.5 ${tone}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium">{notification.title}</p>
                    {!notification.read && (
                      <Badge className="h-5 px-1.5 text-[10px]">New</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {notification.message}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs text-muted-foreground">
                      {timeAgo(notification.createdAt)}
                    </p>
                    {groupHref && (
                      <Button
                        size="sm"
                        className="h-8"
                        onClick={() => markOneRead(notification.id)}
                        render={<Link href={groupHref} />}
                      >
                        <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
                        Open Group Chat
                      </Button>
                    )}
                    {projectHref && !groupHref && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8"
                        onClick={() => markOneRead(notification.id)}
                        render={<Link href={projectHref} />}
                      >
                        View Project
                      </Button>
                    )}
                  </div>
                </div>
                {!notification.read && (
                  <button
                    type="button"
                    className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary"
                    aria-label="Mark notification as read"
                    onClick={() => markOneRead(notification.id)}
                  />
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
