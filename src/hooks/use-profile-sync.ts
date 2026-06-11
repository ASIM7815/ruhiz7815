"use client";

import { useEffect, useState } from "react";

export interface ProfileUpdateEvent {
  userId: string;
  updates: {
    image?: string | null;
    coverImage?: string | null;
    name?: string;
    headline?: string | null;
    bio?: string | null;
    username?: string | null;
    university?: string | null;
    skills?: string[];
    interests?: string[];
    githubUsername?: string | null;
    linkedinUrl?: string | null;
    twitterUsername?: string | null;
    portfolioUrl?: string | null;
    customBadges?: any;
  };
}

const PROFILE_UPDATE_CHANNEL = "profile-updates";

/**
 * Hook to listen for real-time profile updates
 * Automatically updates local state when profile changes are broadcast
 */
export function useProfileSync(userId: string) {
  const [profileUpdates, setProfileUpdates] = useState<ProfileUpdateEvent | null>(null);

  useEffect(() => {
    const handleProfileUpdate = (event: CustomEvent<ProfileUpdateEvent>) => {
      // Only process updates for the current user
      if (event.detail.userId === userId) {
        setProfileUpdates(event.detail);
      }
    };

    // Listen for profile update events
    window.addEventListener(PROFILE_UPDATE_CHANNEL, handleProfileUpdate as EventListener);

    return () => {
      window.removeEventListener(PROFILE_UPDATE_CHANNEL, handleProfileUpdate as EventListener);
    };
  }, [userId]);

  return profileUpdates;
}

/**
 * Broadcast a profile update event
 * Call this after updating a user's profile
 */
export function broadcastProfileUpdate(userId: string, updates: ProfileUpdateEvent["updates"]) {
  const event = new CustomEvent<ProfileUpdateEvent>(PROFILE_UPDATE_CHANNEL, {
    detail: { userId, updates },
  });
  window.dispatchEvent(event);
}
