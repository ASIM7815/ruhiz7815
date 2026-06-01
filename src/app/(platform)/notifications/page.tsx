import type React from "react";
import { CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const notifications: {
  id: string;
  type: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  avatar: string;
}[] = [];

export default function NotificationsPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold">
            Notifications
          </h1>
          <p className="text-muted-foreground mt-1">
            Stay updated on your projects and activities
          </p>
        </div>
        <Button variant="outline" size="sm" className="w-full sm:w-auto">
          <CheckCheck className="mr-2 h-4 w-4" />
          Mark All Read
        </Button>
      </div>

      <Card>
        <CardContent className="p-0 divide-y">
          {notifications.length === 0 && (
            <div className="mobile-empty-card">
              <p className="text-sm text-muted-foreground">
                No notifications yet.
              </p>
            </div>
          )}
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`flex items-start gap-4 p-4 hover:bg-muted/50 transition-colors ${
                !notification.read ? "bg-primary/5" : ""
              }`}
            >
              <div className={`${notification.bg} p-2.5 rounded-xl shrink-0`}>
                <notification.icon
                  className={`h-4 w-4 ${notification.color}`}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{notification.title}</p>
                  {!notification.read && (
                    <div className="h-2 w-2 rounded-full bg-primary" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {notification.message}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {notification.time}
                </p>
              </div>
              {notification.avatar && (
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarImage src={notification.avatar} />
                  <AvatarFallback>U</AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
