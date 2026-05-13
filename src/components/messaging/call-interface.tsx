"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Maximize2,
  Mic,
  MicOff,
  MonitorUp,
  Phone,
  PhoneCall,
  PhoneOff,
  Settings,
  Video,
  VideoOff,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { ActiveCall } from "@/hooks/use-webrtc-call";

type CallInterfaceProps = {
  activeCall: ActiveCall | null;
  audioInputDevices: MediaDeviceInfo[];
  audioOutputDevices: MediaDeviceInfo[];
  cameraEnabled: boolean;
  localStream: MediaStream | null;
  mediaError: string | null;
  micEnabled: boolean;
  onAccept: () => void;
  onEnd: () => void;
  onReject: () => void;
  onSelectAudioInput: (deviceId: string) => void;
  onSelectAudioOutput: (deviceId: string) => void;
  onSelectVideoInput: (deviceId: string) => void;
  onToggleCamera: () => void;
  onToggleMic: () => void;
  onToggleScreenShare: () => void;
  remoteStream: MediaStream | null;
  screenSharing: boolean;
  selectedAudioInputId: string | null;
  selectedAudioOutputId: string | null;
  selectedVideoInputId: string | null;
  videoInputDevices: MediaDeviceInfo[];
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

function DeviceSelect({
  disabled = false,
  label,
  onChange,
  options,
  value,
}: {
  disabled?: boolean;
  label: string;
  onChange: (deviceId: string) => void;
  options: MediaDeviceInfo[];
  value: string | null;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <select
        className="h-9 rounded-md border border-input bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        disabled={disabled}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.length === 0 ? (
          <option value="">Unavailable</option>
        ) : (
          options.map((device, index) => (
            <option key={device.deviceId || index} value={device.deviceId}>
              {device.label || `${label} ${index + 1}`}
            </option>
          ))
        )}
      </select>
    </label>
  );
}

export function CallInterface({
  activeCall,
  audioInputDevices,
  audioOutputDevices,
  cameraEnabled,
  localStream,
  mediaError,
  micEnabled,
  onAccept,
  onEnd,
  onReject,
  onSelectAudioInput,
  onSelectAudioOutput,
  onSelectVideoInput,
  onToggleCamera,
  onToggleMic,
  onToggleScreenShare,
  remoteStream,
  screenSharing,
  selectedAudioInputId,
  selectedAudioOutputId,
  selectedVideoInputId,
  videoInputDevices,
}: CallInterfaceProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [durationTick, setDurationTick] = useState(() => Date.now());

  useEffect(() => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  useEffect(() => {
    const audioElement = remoteAudioRef.current;
    if (!audioElement) return;

    const shouldMuteRemoteAudio =
      activeCall?.kind === "video" && hasLiveTrack(remoteStream, "video");

    audioElement.srcObject = remoteStream;
    audioElement.muted = shouldMuteRemoteAudio;

    if (!shouldMuteRemoteAudio && hasLiveTrack(remoteStream, "audio")) {
      void audioElement.play().catch(() => {
        // Browser autoplay policy can still require a user gesture.
      });
    }
  }, [activeCall?.kind, remoteStream]);

  useEffect(() => {
    if (!remoteAudioRef.current || !selectedAudioOutputId) return;

    const audioElement = remoteAudioRef.current as HTMLAudioElement & {
      setSinkId?: (sinkId: string) => Promise<void>;
    };

    if (!audioElement.setSinkId) return;

    void audioElement.setSinkId(selectedAudioOutputId).catch(() => {
      // Some browsers/devices reject speaker routing changes.
    });
  }, [selectedAudioOutputId]);

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
      return `Incoming ${activeCall.kind} call`;
    }
    if (activeCall.status === "ringing") return "Ringing...";
    if (activeCall.status === "connecting") return "Connecting...";
    if (activeCall.status === "reconnecting") return "Reconnecting...";
    if (activeCall.status === "ended") return activeCall.error ?? "Call ended";
    return duration;
  }, [activeCall, duration]);

  if (!activeCall) return null;

  const showRemoteVideo =
    activeCall.kind === "video" && hasLiveTrack(remoteStream, "video");

  const showLocalVideo = hasLiveTrack(localStream, "video");

  if (activeCall.status === "incoming") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-xl">
        <div className="w-full max-w-sm rounded-lg border bg-card p-6 text-center shadow-2xl">
          <Avatar className="mx-auto h-20 w-20">
            <AvatarImage src={activeCall.peer.image ?? undefined} />
            <AvatarFallback className="text-xl">
              {getInitials(activeCall.peer.name)}
            </AvatarFallback>
          </Avatar>
          <h2 className="mt-4 text-xl font-semibold">{activeCall.peer.name}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{statusText}</p>
          <div className="mt-6 flex items-center justify-center gap-4">
            <Button
              size="icon"
              variant="destructive"
              className="h-14 w-14 rounded-full"
              onClick={onReject}
            >
              <PhoneOff className="h-6 w-6" />
            </Button>
            <Button
              size="icon"
              className="h-14 w-14 rounded-full bg-emerald-600 hover:bg-emerald-700"
              onClick={onAccept}
            >
              <PhoneCall className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background text-foreground">
      <audio
        ref={remoteAudioRef}
        autoPlay
        playsInline
        muted={showRemoteVideo}
        className="hidden"
      />
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src={activeCall.peer.image ?? undefined} />
            <AvatarFallback>{getInitials(activeCall.peer.name)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium">{activeCall.peer.name}</p>
            <p className="text-xs text-muted-foreground">
              {mediaError ?? statusText}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {activeCall.kind === "video" && screenSharing && (
            <Badge variant="secondary" className="gap-1">
              <MonitorUp className="h-3 w-3" />
              Sharing
            </Badge>
          )}
          <Badge variant="outline" className="capitalize">
            {activeCall.kind}
          </Badge>
        </div>
      </div>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-zinc-950">
        {showRemoteVideo ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="h-full w-full object-contain"
          />
        ) : (
          <div className="flex flex-col items-center text-center text-white">
            <Avatar className="h-28 w-28 border border-white/20">
              <AvatarImage src={activeCall.peer.image ?? undefined} />
              <AvatarFallback className="bg-white/10 text-3xl text-white">
                {getInitials(activeCall.peer.name)}
              </AvatarFallback>
            </Avatar>
            <p className="mt-5 text-lg font-medium">{activeCall.peer.name}</p>
            <p className="mt-1 text-sm text-white/60">{statusText}</p>
          </div>
        )}

        <div className="absolute bottom-4 right-4 h-36 w-28 overflow-hidden rounded-lg border border-white/20 bg-zinc-900 shadow-xl sm:h-44 sm:w-36">
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
                <VideoOff className="h-7 w-7" />
              ) : (
                <Phone className="h-7 w-7" />
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-center gap-3 border-t bg-background px-4 py-4">
        <Button
          size="icon"
          variant={micEnabled ? "secondary" : "outline"}
          className="h-12 w-12 rounded-full"
          onClick={onToggleMic}
        >
          {micEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
        </Button>
        {activeCall.kind === "video" && (
          <Button
            size="icon"
            variant={cameraEnabled ? "secondary" : "outline"}
            className="h-12 w-12 rounded-full"
            onClick={onToggleCamera}
          >
            {cameraEnabled ? (
              <Video className="h-5 w-5" />
            ) : (
              <VideoOff className="h-5 w-5" />
            )}
          </Button>
        )}
        {activeCall.kind === "video" && (
          <Button
            size="icon"
            variant={screenSharing ? "default" : "outline"}
            className="hidden h-12 w-12 rounded-full sm:inline-flex"
            onClick={onToggleScreenShare}
          >
            {screenSharing ? (
              <Maximize2 className="h-5 w-5" />
            ) : (
              <MonitorUp className="h-5 w-5" />
            )}
          </Button>
        )}
        <Popover>
          <PopoverTrigger
            render={
              <Button
                size="icon"
                variant="outline"
                className="h-12 w-12 rounded-full"
              />
            }
          >
            <Settings className="h-5 w-5" />
          </PopoverTrigger>
          <PopoverContent side="top" className="w-72 gap-3">
            <DeviceSelect
              disabled={audioInputDevices.length === 0}
              label="Microphone"
              onChange={onSelectAudioInput}
              options={audioInputDevices}
              value={selectedAudioInputId}
            />
            {activeCall.kind === "video" && (
              <DeviceSelect
                disabled={videoInputDevices.length === 0}
                label="Camera"
                onChange={onSelectVideoInput}
                options={videoInputDevices}
                value={selectedVideoInputId}
              />
            )}
            {audioOutputDevices.length > 0 && (
              <DeviceSelect
                label="Speaker"
                onChange={onSelectAudioOutput}
                options={audioOutputDevices}
                value={selectedAudioOutputId}
              />
            )}
          </PopoverContent>
        </Popover>
        <Button
          size="icon"
          variant="destructive"
          className="h-12 w-12 rounded-full"
          onClick={onEnd}
        >
          <PhoneOff className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
