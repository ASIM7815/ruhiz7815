"use client";

import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useProfileSync } from "@/hooks/use-profile-sync";

interface AvatarWithSyncProps {
  userId: string;
  initialImage: string | null;
  name: string;
  className?: string;
}

/**
 * Avatar component that automatically updates when profile image changes
 * Use this anywhere you display a user's avatar for real-time synchronization
 */
export function AvatarWithSync({
  userId,
  initialImage,
  name,
  className,
}: AvatarWithSyncProps) {
  const [image, setImage] = useState(initialImage);
  const profileUpdates = useProfileSync(userId);

  // Update image when profile changes
  useEffect(() => {
    if (profileUpdates?.updates.image !== undefined) {
      setImage(profileUpdates.updates.image);
    }
  }, [profileUpdates]);

  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Avatar className={className}>
      <AvatarImage src={image || undefined} alt={name} />
      <AvatarFallback>{initials || "U"}</AvatarFallback>
    </Avatar>
  );
}
