"use client";

import { useEffect, useState } from "react";
import { StudentProfileView } from "./student-profile-view";
import { useProfileSync } from "@/hooks/use-profile-sync";
import type { StudentProfile } from "@/lib/profile-data";

interface ProfileSyncWrapperProps {
  initialProfile: StudentProfile;
  viewerId: string | null;
  publicShell?: boolean;
}

// Calculate completion items based on profile data
function calculateCompletion(profile: StudentProfile) {
  const items = [
    { label: "Photo", done: Boolean(profile.image) },
    { label: "Bio", done: Boolean(profile.bio?.trim()) },
    { label: "Skills", done: profile.skills.length > 0 },
    { label: "Interests", done: profile.interests.length > 0 },
    { label: "Projects", done: profile.stats.projects > 0 },
  ];
  
  const score = items.length === 0 
    ? 0 
    : Math.round((items.filter((item) => item.done).length / items.length) * 100);
  
  return { items, score };
}

export function ProfileSyncWrapper({
  initialProfile,
  viewerId,
  publicShell = false,
}: ProfileSyncWrapperProps) {
  const [profile, setProfile] = useState<StudentProfile>(initialProfile);
  const profileUpdates = useProfileSync(initialProfile.id);

  // Apply real-time profile updates
  useEffect(() => {
    if (profileUpdates) {
      setProfile((current) => {
        const updated = {
          ...current,
          ...profileUpdates.updates,
          // Preserve skills and interests if they're updated
          skills: profileUpdates.updates.skills || current.skills,
          interests: profileUpdates.updates.interests || current.interests,
        };
        
        // Recalculate completion score
        const completion = calculateCompletion(updated);
        
        return {
          ...updated,
          completion,
        };
      });
    }
  }, [profileUpdates]);

  return (
    <StudentProfileView
      profile={profile}
      viewerId={viewerId}
      publicShell={publicShell}
    />
  );
}
