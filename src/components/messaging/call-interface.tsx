"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Maximize2,
  Mic,
  MicOff,
  MonitorUp,
  Phone,
  PhoneCall,
  PhoneOff,
  Video,
  VideoOff,
  Volume2,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ActiveCall } from "@/hooks/use-webrtc-call";

type CallInterfaceProps = {
  activeCall: ActiveCall | null;
  cameraEnabled: boolean;
  localStream: MediaStream | null;
  micEnabled: boolean;
  onAccept: () => void;
  onEnd: () => void;
  onReject: () => void;
  onToggleCamera: () => void;
  onToggleMic: () => void;
  onToggleScreenShare: () => void;
  remoteStream: MediaStream | null;
  screenSharing: boolean;
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatDuration(startedAt: number | null, now: number) {
  if (!startedAt) return "00:00";
  const seconds = Math.max(0, Math.floor((now - startedAt) / 1000));
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs
    .toString()
    .padStart(2, "0")}`;
}

function hasLiveTrack(stream: MediaStream | null, kind: MediaStreamTrack["kind"]) {
  return (
    stream?.getTracks().some(
      (track) => track.kind === kind && track.readyState === "live"
    ) ?? false
  );
}

export function CallInterface({
  activeCall,
  cameraEnabled,
  localStream,
  micEnabled,
  onAccept,
  onEnd,
  onReject,
  onToggleCamera,
  onToggleMic,
  onToggleScreenShare,
  remoteStream,
  screenSharing,
}: CallInterfaceProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [durationTick, setDurationTick] = useState(() => Date.now());
  const [remoteAudioBlocked, setRemoteAudioBlocked] = useState(false);

  const setRemoteAudioBlockedSoon = useCallback((blocked: boolean) => {
    window.setTimeout(() => setRemoteAudioBlocked(blocked), 0);
  }, []);

  useEffect(() => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.muted = true;
      void remoteVideoRef.current.play().catch(() => {
        // Muted remote video should autoplay; the audio element handles sound.
      });
    }
  }, [remoteStream]);

  const playRemoteAudio = useCallback(async () => {
    const audioElement = remoteAudioRef.current;
    if (!audioElement || !hasLiveTrack(remoteStream, "audio")) {
      return;
    }

    try {
      audioElement.muted = false;
      audioElement.volume = 1;
      await audioElement.play();
      setRemoteAudioBlockedSoon(false);
    } catch {
      setRemoteAudioBlockedSoon(true);
    }
  }, [remoteStream, setRemoteAudioBlockedSoon]);

  useEffect(() => {
    const audioElement = remoteAudioRef.current;
    if (!audioElement) return;

    audioElement.srcObject = remoteStream;
    audioElement.muted = false;
    audioElement.volume = 1;

    const retryPlayback = () => {
      void playRemoteAudio();
    };

    audioElement.addEventListener("canplay", retryPlayback);
    audioElement.addEventListener("loadedmetadata", retryPlayback);

    if (hasLiveTrack(remoteStream, "audio")) {
      void playRemoteAudio();
    } else {
      setRemoteAudioBlockedSoon(false);
    }

    return () => {
      audioElement.removeEventListener("canplay", retryPlayback);
      audioElement.removeEventListener("loadedmetadata", retryPlayback);
    };
  }, [playRemoteAudio, remoteStream, setRemoteAudioBlockedSoon]);

  useEffect(() => {
    if (!activeCall?.connectedAt) return;

    const interval = window.setInterval(() => {
      setDurationTick(Date.now());
    }, 1000);

    return () => window.clearInterval(interval);
  }, [activeCall?.connectedAt]);

  const duration = activeCall?.connectedAt
    ? formatDuration(activeCall.connectedAt, durationTick)
    : "00:00";

  const statusText = useMemo(() => {
    if (!activeCall) return "";
    if (activeCall.status === "incoming") {
      // Show "Audio call" or "Video call" based on isAudioOnly flag
      const callType = activeCall.isAudioOnly ? "audio" : activeCall.kind;
      return `Incoming ${callType} call`;
    }
    if (activeCall.status === "ringing") return "Ringing...";
    if (activeCall.status === "connecting") return "Connecting...";
    if (activeCall.status === "reconnecting") return "Reconnecting...";
    if (activeCall.status === "ended") return activeCall.error ?? "Call ended";
    return duration;
  }, [activeCall, duration]);

  if (!activeCall) return null;

  // Hide video for audio-only calls
  const isAudioOnly = activeCall.isAudioOnly ?? false;

  const showRemoteVideo =
    !isAudioOnly &&
    activeCall.kind === "video" &&
    hasLiveTrack(remoteStream, "video");

  const showLocalVideo = !isAudioOnly && hasLiveTrack(localStream, "video");
  const showRemoteAudioRetry =
    remoteAudioBlocked && hasLiveTrack(remoteStream, "audio");

  if (activeCall.status === "incoming") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-xl safe-area-inset">
        <div className="w-full max-w-sm rounded-2xl border bg-card p-6 sm:p-8 text-center shadow-2xl">
          <Avatar className="mx-auto h-24 w-24 sm:h-28 sm:w-28 ring-4 ring-primary/10">
            <AvatarImage src={activeCall.peer.image ?? undefined} />
            <AvatarFallback className="text-2xl sm:text-3xl">
              {getInitials(activeCall.peer.name)}
            </AvatarFallback>
          </Avatar>
          <h2 className="mt-6 text-2xl sm:text-3xl font-semibold">{activeCall.peer.name}</h2>
          <p className="mt-2 text-base sm:text-lg text-muted-foreground">{statusText}</p>
          <div className="mt-8 sm:mt-10 flex items-center justify-center gap-6 sm:gap-8">
            <div className="flex flex-col items-center gap-2">
              <Button
                size="icon"
                variant="destructive"
                className="h-16 w-16 sm:h-18 sm:w-18 rounded-full shadow-lg touch-manipulation active:scale-95 transition-transform"
                onClick={onReject}
              >
                <PhoneOff className="h-7 w-7 sm:h-8 sm:w-8" />
              </Button>
              <span className="text-xs text-muted-foreground">Decline</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Button
                size="icon"
                className="h-16 w-16 sm:h-18 sm:w-18 rounded-full bg-emerald-600 hover:bg-emerald-700 shadow-lg touch-manipulation active:scale-95 transition-transform"
                onClick={onAccept}
              >
                <PhoneCall className="h-7 w-7 sm:h-8 sm:w-8" />
              </Button>
              <span className="text-xs text-emerald-600 font-medium">Accept</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-background text-foreground safe-area-inset"
      onPointerDownCapture={() => {
        if (showRemoteAudioRetry) void playRemoteAudio();
      }}
    >
      <audio
        ref={remoteAudioRef}
        autoPlay
        playsInline
        muted={false}
        className="hidden"
      />
      
      {/* Header - Mobile optimized */}
      <div className="flex items-center justify-between border-b px-3 py-2.5 sm:px-4 sm:py-3 bg-background/95 backdrop-blur-sm">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <Avatar className="h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0">
            <AvatarImage src={activeCall.peer.image ?? undefined} />
            <AvatarFallback className="text-xs">{getInitials(activeCall.peer.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{activeCall.peer.name}</p>
            <p className="text-xs text-muted-foreground truncate">{statusText}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          {screenSharing && (
            <Badge variant="secondary" className="gap-1 text-xs px-2 py-0.5">
              <MonitorUp className="h-3 w-3" />
              <span className="hidden sm:inline">Sharing</span>
            </Badge>
          )}
          <Badge variant="outline" className="capitalize text-xs px-2 py-0.5">
            {isAudioOnly ? "audio" : activeCall.kind}
          </Badge>
        </div>
      </div>

      {/* Video/Avatar Area - Full screen on mobile */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-zinc-950">
        {showRemoteVideo ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            muted
            playsInline
            className="h-full w-full object-contain"
          />
        ) : (
          <div className="flex flex-col items-center text-center text-white px-4">
            <Avatar className="h-24 w-24 sm:h-32 sm:w-32 border-2 border-white/20">
              <AvatarImage src={activeCall.peer.image ?? undefined} />
              <AvatarFallback className="bg-white/10 text-2xl sm:text-4xl text-white">
                {getInitials(activeCall.peer.name)}
              </AvatarFallback>
            </Avatar>
            <p className="mt-4 sm:mt-6 text-lg sm:text-xl font-medium">{activeCall.peer.name}</p>
            <p className="mt-1 sm:mt-2 text-sm text-white/60">{statusText}</p>
          </div>
        )}

        {/* Local Video Preview - Responsive positioning */}
        <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 h-28 w-20 sm:h-36 sm:w-28 md:h-44 md:w-36 overflow-hidden rounded-lg border-2 border-white/20 bg-zinc-900 shadow-xl touch-manipulation">
          {showLocalVideo ? (
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-white/70">
              {activeCall.kind === "video" ? (
                <VideoOff className="h-6 w-6 sm:h-7 sm:w-7" />
              ) : (
                <Phone className="h-6 w-6 sm:h-7 sm:w-7" />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Controls - Mobile optimized with larger touch targets */}
      <div className="flex items-center justify-center gap-2 sm:gap-3 md:gap-4 border-t bg-background/95 backdrop-blur-sm px-3 py-3 sm:px-4 sm:py-4 safe-area-inset-bottom">
        {showRemoteAudioRetry && (
          <Button
            size="icon"
            variant="outline"
            className="h-12 w-12 sm:h-14 sm:w-14 rounded-full border-amber-500 text-amber-500 touch-manipulation active:scale-95 transition-transform"
            onClick={playRemoteAudio}
            aria-label="Play remote audio"
          >
            <Volume2 className="h-5 w-5 sm:h-6 sm:w-6" />
          </Button>
        )}
        
        {/* Microphone Toggle */}
        <Button
          size="icon"
          variant={micEnabled ? "secondary" : "outline"}
          className="h-12 w-12 sm:h-14 sm:w-14 rounded-full touch-manipulation active:scale-95 transition-transform"
          onClick={onToggleMic}
        >
          {micEnabled ? <Mic className="h-5 w-5 sm:h-6 sm:w-6" /> : <MicOff className="h-5 w-5 sm:h-6 sm:w-6" />}
        </Button>
        
        {/* Camera Toggle - Only for video calls */}
        {!isAudioOnly && activeCall.kind === "video" && (
          <Button
            size="icon"
            variant={cameraEnabled ? "secondary" : "outline"}
            className="h-12 w-12 sm:h-14 sm:w-14 rounded-full touch-manipulation active:scale-95 transition-transform"
            onClick={onToggleCamera}
          >
            {cameraEnabled ? (
              <Video className="h-5 w-5 sm:h-6 sm:w-6" />
            ) : (
              <VideoOff className="h-5 w-5 sm:h-6 sm:w-6" />
            )}
          </Button>
        )}
        
        {/* Screen Share - Hidden on small mobile, visible on tablet+ */}
        {!isAudioOnly && (
          <Button
            size="icon"
            variant={screenSharing ? "default" : "outline"}
            className="hidden sm:inline-flex h-12 w-12 sm:h-14 sm:w-14 rounded-full touch-manipulation active:scale-95 transition-transform"
            onClick={onToggleScreenShare}
          >
            {screenSharing ? (
              <Maximize2 className="h-5 w-5 sm:h-6 sm:w-6" />
            ) : (
              <MonitorUp className="h-5 w-5 sm:h-6 sm:w-6" />
            )}
          </Button>
        )}
        
        {/* End Call - Prominent */}
        <Button
          size="icon"
          variant="destructive"
          className="h-14 w-14 sm:h-16 sm:w-16 rounded-full touch-manipulation active:scale-95 transition-transform shadow-lg"
          onClick={onEnd}
        >
          <PhoneOff className="h-6 w-6 sm:h-7 sm:w-7" />
        </Button>
      </div>
    </div>
  );
}
