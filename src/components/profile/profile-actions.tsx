"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { Check, Copy, MessageSquare, QrCode, Share2, UserMinus, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type ProfileActionsProps = {
  userId: string;
  profilePath: string;
  initialFollowers: number;
  initialIsFollowing: boolean;
  isOwnProfile: boolean;
  canInteract: boolean;
};

export function ProfileActions({
  userId,
  profilePath,
  initialFollowers,
  initialIsFollowing,
  isOwnProfile,
  canInteract,
}: ProfileActionsProps) {
  const router = useRouter();
  const [followers, setFollowers] = useState(initialFollowers);
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [busy, setBusy] = useState(false);
  const [messageBusy, setMessageBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [absoluteUrl, setAbsoluteUrl] = useState(profilePath);
  const [qrDataUrl, setQrDataUrl] = useState("");

  useEffect(() => {
    setAbsoluteUrl(new URL(profilePath, window.location.origin).href);
  }, [profilePath]);

  useEffect(() => {
    QRCode.toDataURL(absoluteUrl, {
      width: 220,
      margin: 1,
      color: {
        dark: "#111827",
        light: "#ffffff",
      },
    })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(""));
  }, [absoluteUrl]);

  const followLabel = useMemo(() => {
    if (busy) return "Saving";
    return isFollowing ? "Following" : "Follow";
  }, [busy, isFollowing]);

  async function copyProfileLink() {
    await navigator.clipboard.writeText(absoluteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  async function toggleFollow() {
    if (!canInteract) {
      router.push("/login");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(`/api/users/${userId}/follow`, {
        method: isFollowing ? "DELETE" : "POST",
      });

      if (res.ok) {
        const data = await res.json();
        setIsFollowing(data.isFollowing);
        setFollowers(data.followers);
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  async function startMessage() {
    if (!canInteract) {
      router.push("/login");
      return;
    }

    setMessageBusy(true);
    try {
      const res = await fetch("/api/messages/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: userId }),
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/messages?conversation=${data.conversationId}`);
      }
    } finally {
      setMessageBusy(false);
    }
  }

  return (
    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
      {!isOwnProfile && (
        <>
          <Button onClick={toggleFollow} disabled={busy} className="w-full sm:w-auto">
            {isFollowing ? <UserMinus className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
            {followLabel}
          </Button>
          <Button
            variant="outline"
            onClick={startMessage}
            disabled={messageBusy}
            className="w-full sm:w-auto"
          >
            <MessageSquare className="h-4 w-4" />
            {messageBusy ? "Opening" : "Message"}
          </Button>
        </>
      )}

      {isOwnProfile && (
        <Button variant="outline" className="w-full sm:w-auto" onClick={() => router.push("/settings")}>
          Edit Profile
        </Button>
      )}

      <Dialog>
        <DialogTrigger render={<Button variant="outline" className="w-full sm:w-auto" />}>
          <Share2 className="h-4 w-4" />
          Share
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Profile</DialogTitle>
            <DialogDescription>{absoluteUrl}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="flex items-center justify-center rounded-lg border bg-white p-4">
              {qrDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qrDataUrl} alt="Profile QR code" className="h-44 w-44" />
              ) : (
                <QrCode className="h-24 w-24 text-muted-foreground" />
              )}
            </div>
            <Button onClick={copyProfileLink} className="w-full">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied" : "Copy Link"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <span className="sr-only">{followers} followers</span>
    </div>
  );
}
