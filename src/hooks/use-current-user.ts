"use client";

import { useEffect, useState } from "react";
import { useProfileSync } from "./use-profile-sync";

interface CurrentUser {
  id: string;
  uid: string | null;
  username: string | null;
  name: string;
  email: string;
  image: string | null;
  coverImage: string | null;
  headline: string | null;
  bio: string | null;
  university: string | null;
  role: string;
  reputation: number;
  collegeVerified: boolean;
  onboardingComplete: boolean;
  createdAt: string;
  skills: string[];
  interests: string[];
  stats: {
    followers: number;
    following: number;
    projects: number;
    resources: number;
    studyGroups: number;
  };
}

/**
 * Hook to get the current authenticated user with real-time profile sync
 * This hook fetches user data from /api/user/me and automatically updates
 * when profile changes are broadcast
 */
export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Listen for profile updates once we have the user ID
  const profileUpdates = useProfileSync(user?.id || "");

  // Fetch current user on mount
  useEffect(() => {
    let mounted = true;

    async function fetchUser() {
      try {
        const res = await fetch("/api/user/me");
        if (!mounted) return;

        if (res.ok) {
          const data = await res.json();
          setUser(data);
          setError(null);
        } else {
          setError("Failed to fetch user");
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Failed to fetch user");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchUser();

    return () => {
      mounted = false;
    };
  }, []);

  // Apply real-time profile updates
  useEffect(() => {
    if (profileUpdates && user) {
      setUser((current) => {
        if (!current) return current;
        return {
          ...current,
          ...profileUpdates.updates,
          // Preserve skills and interests if they're updated
          skills: profileUpdates.updates.skills || current.skills,
          interests: profileUpdates.updates.interests || current.interests,
        };
      });
    }
  }, [profileUpdates, user?.id]);

  return { user, loading, error };
}
