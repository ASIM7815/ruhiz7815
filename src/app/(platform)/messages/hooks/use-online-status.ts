"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-client";

export function useOnlineStatus(userId: string | null) {
  const [isOnline, setIsOnline] = useState(false);
  const [lastSeen, setLastSeen] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    // Subscribe to user's presence
    const channel = supabase.channel(`presence-${userId}`);

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const userPresence = state[userId];
        
        if (userPresence && userPresence.length > 0) {
          setIsOnline(true);
          setLastSeen(null);
        } else {
          setIsOnline(false);
          // Could fetch last_seen from database here
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return { isOnline, lastSeen };
}
