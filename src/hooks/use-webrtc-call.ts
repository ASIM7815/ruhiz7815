"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase-client";

export type CallKind = "audio" | "video";
export type CallStatus =
  | "connected"
  | "connecting"
  | "ended"
  | "incoming"
  | "reconnecting"
  | "ringing";

export type CallMessage = {
  content: string;
  createdAt: string;
  id: string;
  isRead: boolean;
  reactions: { id: string; userId: string; emoji: string }[];
  senderId: string;
};

export type CallPeer = {
  id: string;
  image: string | null;
  name: string;
  uid?: string | null;
};

export type ActiveCall = {
  callId: string;
  connectedAt: number | null;
  conversationId: string;
  direction: "incoming" | "outgoing";
  error: string | null;
  kind: CallKind;
  peer: CallPeer;
  startedAt: number;
  status: CallStatus;
};

type UseWebRTCCallOptions = {
  currentUser: {
    id: string;
    image?: string | null;
    name?: string | null;
  } | null;
  onCallMessage?: (conversationId: string, message: CallMessage) => void;
};

type CallSignal =
  | { callId: string; caller: CallPeer; conversationId: string; kind: CallKind; type: "invite" }
  | { callId: string; conversationId?: string; type: "accept" | "busy" | "cancel" | "end" | "reject" }
  | { callId: string; description: RTCSessionDescriptionInit; type: "answer" }
  | { callId: string; description: RTCSessionDescriptionInit; type: "offer" }
  | { callId: string; candidate: RTCIceCandidateInit; type: "ice-candidate" };

type SignalEnvelope = CallSignal & {
  from: string;
};

type CreateCallResponse = {
  callId: string;
  caller: CallPeer;
  conversationId: string;
  iceServers: RTCIceServer[];
  kind: CallKind;
  peer: CallPeer;
};

type VerifyCallResponse = {
  callId: string;
  caller: CallPeer;
  conversationId: string;
  iceServers: RTCIceServer[];
  kind: CallKind;
};

const CALL_RING_TIMEOUT_MS = 30_000;
const MAX_RECONNECT_ATTEMPTS = 2;
const SIGNAL_SUBSCRIBE_TIMEOUT_MS = 6_000;

function getMediaErrorMessage(error: unknown, kind: CallKind) {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError") {
      return kind === "video"
        ? "Camera and microphone permission was denied."
        : "Microphone permission was denied.";
    }

    if (error.name === "NotFoundError") {
      return kind === "video"
        ? "No camera or microphone was found."
        : "No microphone was found.";
    }

    if (error.name === "NotReadableError") {
      return "Your camera or microphone is already in use by another app.";
    }
  }

  return kind === "video"
    ? "Unable to access camera or microphone."
    : "Unable to access microphone.";
}

function getAudioConstraints(deviceId: string | null): MediaTrackConstraints {
  return {
    autoGainControl: true,
    deviceId: deviceId ? { exact: deviceId } : undefined,
    echoCancellation: true,
    noiseSuppression: true,
  };
}

function getVideoConstraints(deviceId: string | null): MediaTrackConstraints {
  return {
    deviceId: deviceId ? { exact: deviceId } : undefined,
    facingMode: deviceId ? undefined : "user",
    frameRate: { ideal: 24, max: 30 },
    height: { ideal: 720 },
    width: { ideal: 1280 },
  };
}

function getCallMediaConstraints(
  kind: CallKind,
  audioDeviceId: string | null,
  videoDeviceId: string | null
): MediaStreamConstraints {
  return {
    audio: getAudioConstraints(audioDeviceId),
    video: kind === "video" ? getVideoConstraints(videoDeviceId) : false,
  };
}

function hasAudioMediaSection(description: RTCSessionDescriptionInit) {
  return (
    description.sdp
      ?.split(/\r?\n/)
      .some((line) => {
        const [media, port] = line.split(/\s+/);
        return media === "m=audio" && port !== "0";
      }) ?? false
  );
}

function getCallSetupErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Audio could not be negotiated for this call.";
}

export function useWebRTCCall({
  currentUser,
  onCallMessage,
}: UseWebRTCCallOptions) {
  const [activeCall, setActiveCallState] = useState<ActiveCall | null>(null);
  const [audioInputDevices, setAudioInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioOutputDevices, setAudioOutputDevices] = useState<MediaDeviceInfo[]>([]);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [localStream, setLocalStreamState] = useState<MediaStream | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [micEnabled, setMicEnabled] = useState(false);
  const [remoteStream, setRemoteStreamState] = useState<MediaStream | null>(null);
  const [screenSharing, setScreenSharing] = useState(false);
  const [selectedAudioInputId, setSelectedAudioInputId] = useState<string | null>(null);
  const [selectedAudioOutputId, setSelectedAudioOutputId] = useState<string | null>(null);
  const [selectedVideoInputId, setSelectedVideoInputId] = useState<string | null>(null);
  const [videoInputDevices, setVideoInputDevices] = useState<MediaDeviceInfo[]>([]);

  const activeCallRef = useRef<ActiveCall | null>(null);
  const callChannelRef = useRef<RealtimeChannel | null>(null);
  const createAndSendOfferRef = useRef<
    (options?: RTCOfferOptions) => Promise<void>
  >(async () => {});
  const iceServersRef = useRef<RTCIceServer[]>([]);
  const localStreamRef = useRef<MediaStream | null>(null);
  const loggedCallIdsRef = useRef(new Set<string>());
  const pendingIceCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const ringTimeoutRef = useRef<number | null>(null);
  const screenTrackRef = useRef<MediaStreamTrack | null>(null);
  const userChannelRef = useRef<RealtimeChannel | null>(null);

  const setActiveCall = useCallback((next: ActiveCall | null) => {
    activeCallRef.current = next;
    setActiveCallState(next);
  }, []);

  const updateActiveCall = useCallback(
    (updater: (call: ActiveCall) => ActiveCall) => {
      const current = activeCallRef.current;
      if (!current) return;
      setActiveCall(updater(current));
    },
    [setActiveCall]
  );

  const setLocalStream = useCallback((stream: MediaStream | null) => {
    localStreamRef.current = stream;
    setLocalStreamState(stream);
  }, []);

  const setRemoteStream = useCallback((stream: MediaStream | null) => {
    remoteStreamRef.current = stream;
    setRemoteStreamState(stream);
  }, []);

  const clearRingTimeout = useCallback(() => {
    if (ringTimeoutRef.current) {
      clearTimeout(ringTimeoutRef.current);
      ringTimeoutRef.current = null;
    }
  }, []);

  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const removeCallChannel = useCallback(() => {
    if (callChannelRef.current) {
      supabase.removeChannel(callChannelRef.current);
      callChannelRef.current = null;
    }
  }, []);

  const closePeerConnection = useCallback(() => {
    pendingIceCandidatesRef.current = [];
    reconnectAttemptsRef.current = 0;
    clearReconnectTimeout();
    peerConnectionRef.current?.getSenders().forEach((sender) => {
      if (sender.track && sender.track.readyState !== "ended") {
        sender.track.stop();
      }
    });
    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;
  }, [clearReconnectTimeout]);

  const stopMedia = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    remoteStreamRef.current?.getTracks().forEach((track) => track.stop());
    screenTrackRef.current?.stop();
    screenTrackRef.current = null;
    setCameraEnabled(false);
    setLocalStream(null);
    setMicEnabled(false);
    setRemoteStream(null);
    setScreenSharing(false);
  }, [setLocalStream, setRemoteStream]);

  const cleanupCall = useCallback(
    (delay = 0) => {
      clearRingTimeout();
      clearReconnectTimeout();
      const run = () => {
        closePeerConnection();
        removeCallChannel();
        stopMedia();
        setActiveCall(null);
      };

      if (delay > 0) {
        window.setTimeout(run, delay);
      } else {
        run();
      }
    },
    [
      clearRingTimeout,
      clearReconnectTimeout,
      closePeerConnection,
      removeCallChannel,
      setActiveCall,
      stopMedia,
    ]
  );

  const syncRealtimeAuth = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.access_token) {
      supabase.realtime.setAuth(session.access_token);
    }
  }, []);

  const subscribeChannel = useCallback(async (channel: RealtimeChannel) => {
    await syncRealtimeAuth();

    return new Promise<RealtimeChannel>((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        reject(new Error("Realtime signaling channel timed out."));
      }, SIGNAL_SUBSCRIBE_TIMEOUT_MS);

      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          window.clearTimeout(timeout);
          resolve(channel);
        }

        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          window.clearTimeout(timeout);
          reject(new Error("Realtime signaling channel failed."));
        }
      });
    });
  }, [syncRealtimeAuth]);

  const sendToCallChannel = useCallback(
    async (signal: CallSignal) => {
      if (!currentUser?.id || !callChannelRef.current) return;
      await callChannelRef.current.send({
        event: "call-signal",
        payload: { ...signal, from: currentUser.id } satisfies SignalEnvelope,
        type: "broadcast",
      });
    },
    [currentUser?.id]
  );

  const sendToTemporaryCallChannel = useCallback(
    async (callId: string, signal: CallSignal) => {
      if (!currentUser?.id) return;

      const channel = supabase.channel(`call:${callId}`, {
        config: { broadcast: { ack: true, self: false }, private: true },
      });

      try {
        await subscribeChannel(channel);
        await channel.send({
          event: "call-signal",
          payload: { ...signal, from: currentUser.id } satisfies SignalEnvelope,
          type: "broadcast",
        });
      } finally {
        window.setTimeout(() => supabase.removeChannel(channel), 500);
      }
    },
    [currentUser?.id, subscribeChannel]
  );

  const sendToUserChannel = useCallback(
    async (userId: string, signal: CallSignal) => {
      if (!currentUser?.id) return;

      const channel = supabase.channel(`calls:user:${userId}`, {
        config: { broadcast: { ack: true, self: false }, private: true },
      });

      try {
        await subscribeChannel(channel);
        await channel.send({
          event: "call-user-signal",
          payload: { ...signal, from: currentUser.id } satisfies SignalEnvelope,
          type: "broadcast",
        });
      } finally {
        window.setTimeout(() => supabase.removeChannel(channel), 500);
      }
    },
    [currentUser?.id, subscribeChannel]
  );

  const refreshDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;

    const devices = await navigator.mediaDevices.enumerateDevices();
    const audioInputs = devices.filter((device) => device.kind === "audioinput");
    const audioOutputs = devices.filter((device) => device.kind === "audiooutput");
    const videoInputs = devices.filter((device) => device.kind === "videoinput");

    setAudioInputDevices(audioInputs);
    setAudioOutputDevices(audioOutputs);
    setVideoInputDevices(videoInputs);

    setSelectedAudioInputId((current) =>
      current && audioInputs.some((device) => device.deviceId === current)
        ? current
        : audioInputs[0]?.deviceId ?? null
    );
    setSelectedAudioOutputId((current) =>
      current && audioOutputs.some((device) => device.deviceId === current)
        ? current
        : audioOutputs[0]?.deviceId ?? null
    );
    setSelectedVideoInputId((current) =>
      current && videoInputs.some((device) => device.deviceId === current)
        ? current
        : videoInputs[0]?.deviceId ?? null
    );
  }, []);

  const updateCallSession = useCallback(
    async (
      callId: string,
      status:
        | "accepted"
        | "busy"
        | "cancelled"
        | "ended"
        | "failed"
        | "missed"
        | "rejected",
      durationSeconds = 0,
      failureReason?: string
    ) => {
      try {
        const res = await fetch(`/api/messages/calls/${callId}`, {
          body: JSON.stringify({ durationSeconds, failureReason, status }),
          headers: { "Content-Type": "application/json" },
          method: "PATCH",
        });
        return res.ok;
      } catch {
        return false;
      }
    },
    []
  );

  const logCall = useCallback(
    async (
      call: ActiveCall,
      status: "cancelled" | "ended" | "failed" | "missed" | "rejected"
    ) => {
      if (loggedCallIdsRef.current.has(`${call.callId}:${status}`)) return;
      loggedCallIdsRef.current.add(`${call.callId}:${status}`);

      const durationSeconds = call.connectedAt
        ? Math.floor((Date.now() - call.connectedAt) / 1000)
        : 0;

      try {
        await updateCallSession(
          call.callId,
          status,
          durationSeconds,
          call.error ?? undefined
        );

        const res = await fetch("/api/messages/calls/log", {
          body: JSON.stringify({
            callId: call.callId,
            conversationId: call.conversationId,
            durationSeconds,
            kind: call.kind,
            status,
          }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        });

        if (res.ok) {
          const data = (await res.json()) as { message: CallMessage };
          onCallMessage?.(call.conversationId, data.message);
        }
      } catch {
        // Call logging should never break the call cleanup path.
      }
    },
    [onCallMessage, updateCallSession]
  );

  const getLocalMedia = useCallback(async (kind: CallKind) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("This browser does not support audio or video calls.");
    }

    try {
      setMediaError(null);
      const stream = await navigator.mediaDevices.getUserMedia(
        getCallMediaConstraints(
          kind,
          selectedAudioInputId,
          selectedVideoInputId
        )
      );
      const audioTracks = stream.getAudioTracks();

      if (audioTracks.length === 0) {
        stream.getTracks().forEach((track) => track.stop());
        throw new DOMException("No microphone track was returned.", "NotFoundError");
      }

      setLocalStream(stream);
      setMicEnabled(audioTracks.some((track) => track.enabled));
      setCameraEnabled(stream.getVideoTracks().some((track) => track.enabled));

      stream.getTracks().forEach((track) => {
        track.onended = () => {
          if (track.kind === "audio") setMicEnabled(false);
          if (track.kind === "video") setCameraEnabled(false);
        };
      });

      void refreshDevices();
      return stream;
    } catch (error) {
      const message =
        error instanceof Error &&
        error.message === "This browser does not support audio or video calls."
          ? error.message
          : getMediaErrorMessage(error, kind);
      setMediaError(message);
      throw new Error(message);
    }
  }, [
    refreshDevices,
    selectedAudioInputId,
    selectedVideoInputId,
    setLocalStream,
  ]);

  const flushPendingIceCandidates = useCallback(async () => {
    const pc = peerConnectionRef.current;
    if (!pc?.remoteDescription) return;

    const candidates = pendingIceCandidatesRef.current.splice(0);
    for (const candidate of candidates) {
      try {
        await pc.addIceCandidate(candidate);
      } catch {
        updateActiveCall((call) => ({
          ...call,
          error: "A network candidate could not be added.",
        }));
      }
    }
  }, [updateActiveCall]);

  const ensureAudioSender = useCallback((pc: RTCPeerConnection) => {
    const stream = localStreamRef.current;
    const audioTrack = stream
      ?.getAudioTracks()
      .find((track) => track.readyState === "live");

    if (!stream || !audioTrack) {
      throw new Error("No live microphone track is available for this call.");
    }

    const hasLiveAudioSender = pc
      .getSenders()
      .some(
        (sender) =>
          sender.track?.kind === "audio" && sender.track.readyState === "live"
      );

    if (!hasLiveAudioSender) {
      pc.addTrack(audioTrack, stream);
    }
  }, []);

  const appendRemoteTrack = useCallback(
    (event: RTCTrackEvent) => {
      const tracksById = new Map<string, MediaStreamTrack>();

      remoteStreamRef.current?.getTracks().forEach((track) => {
        if (track.readyState === "live") tracksById.set(track.id, track);
      });

      event.streams[0]?.getTracks().forEach((track) => {
        if (track.readyState === "live") tracksById.set(track.id, track);
      });

      if (event.track.readyState === "live") {
        tracksById.set(event.track.id, event.track);
      }

      setRemoteStream(new MediaStream([...tracksById.values()]));

      event.track.onended = () => {
        const remainingTracks =
          remoteStreamRef.current
            ?.getTracks()
            .filter(
              (track) =>
                track.id !== event.track.id && track.readyState === "live"
            ) ?? [];

        setRemoteStream(
          remainingTracks.length > 0 ? new MediaStream(remainingTracks) : null
        );
      };
    },
    [setRemoteStream]
  );

  const createPeerConnection = useCallback(() => {
    const existing = peerConnectionRef.current;
    if (existing) return existing;

    const pc = new RTCPeerConnection({ iceServers: iceServersRef.current });

    localStreamRef.current?.getTracks().forEach((track) => {
      pc.addTrack(track, localStreamRef.current as MediaStream);
    });

    pc.onicecandidate = (event) => {
      if (!event.candidate) return;
      const current = activeCallRef.current;
      if (!current) return;
      void sendToCallChannel({
        callId: current.callId,
        candidate: event.candidate.toJSON(),
        type: "ice-candidate",
      });
    };

    pc.ontrack = (event) => {
      appendRemoteTrack(event);
    };

    pc.onconnectionstatechange = () => {
      const current = activeCallRef.current;
      if (!current) return;

      if (pc.connectionState === "connected") {
        reconnectAttemptsRef.current = 0;
        clearReconnectTimeout();
        updateActiveCall((call) => ({
          ...call,
          connectedAt: call.connectedAt ?? Date.now(),
          error: null,
          status: "connected",
        }));
      }

      if (pc.connectionState === "disconnected") {
        updateActiveCall((call) => ({ ...call, status: "reconnecting" }));
        clearReconnectTimeout();
        reconnectTimeoutRef.current = window.setTimeout(() => {
          const latest = activeCallRef.current;
          if (!latest || latest.status !== "reconnecting") return;
          if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
            updateActiveCall((call) => ({
              ...call,
              error: "The network connection was interrupted.",
              status: "ended",
            }));
            void logCall(latest, "failed");
            cleanupCall(1200);
            return;
          }

          reconnectAttemptsRef.current += 1;
          void createAndSendOfferRef.current({ iceRestart: true });
        }, 2500);
      }

      if (pc.connectionState === "failed") {
        if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current += 1;
          updateActiveCall((call) => ({ ...call, status: "reconnecting" }));
          void createAndSendOfferRef.current({ iceRestart: true });
          return;
        }

        updateActiveCall((call) => ({
          ...call,
          error: "The peer connection failed.",
          status: "ended",
        }));
        void logCall(current, "failed");
        cleanupCall(1200);
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  }, [
    cleanupCall,
    appendRemoteTrack,
    clearReconnectTimeout,
    logCall,
    sendToCallChannel,
    updateActiveCall,
  ]);

  const createAndSendOffer = useCallback(async (options?: RTCOfferOptions) => {
    const current = activeCallRef.current;
    if (!current) return;

    try {
      const pc = createPeerConnection();
      ensureAudioSender(pc);
      const offer = await pc.createOffer(options);

      if (!hasAudioMediaSection(offer)) {
        throw new Error("The call offer did not include an audio channel.");
      }

      await pc.setLocalDescription(offer);

      await sendToCallChannel({
        callId: current.callId,
        description: offer,
        type: "offer",
      });
    } catch (error) {
      const message = getCallSetupErrorMessage(error);
      setMediaError(message);
      updateActiveCall((call) => ({
        ...call,
        error: message,
        status: "ended",
      }));
      void logCall(current, "failed");
      cleanupCall(1200);
    }
  }, [
    cleanupCall,
    createPeerConnection,
    ensureAudioSender,
    logCall,
    sendToCallChannel,
    updateActiveCall,
  ]);
  createAndSendOfferRef.current = createAndSendOffer;

  const handleOffer = useCallback(
    async (signal: Extract<CallSignal, { type: "offer" }>) => {
      const current = activeCallRef.current;
      if (!current) return;

      try {
        if (!hasAudioMediaSection(signal.description)) {
          throw new Error("The incoming call offer did not include audio.");
        }

        const pc = createPeerConnection();
        ensureAudioSender(pc);
        await pc.setRemoteDescription(signal.description);
        await flushPendingIceCandidates();
        const answer = await pc.createAnswer();

        if (!hasAudioMediaSection(answer)) {
          throw new Error("The call answer did not include an audio channel.");
        }

        await pc.setLocalDescription(answer);
        updateActiveCall((call) => ({
          ...call,
          error: null,
          status: call.status === "incoming" ? "connecting" : call.status,
        }));

        await sendToCallChannel({
          callId: current.callId,
          description: answer,
          type: "answer",
        });
      } catch (error) {
        const message = getCallSetupErrorMessage(error);
        setMediaError(message);
        updateActiveCall((call) => ({
          ...call,
          error: message,
          status: "ended",
        }));
        void logCall(current, "failed");
        cleanupCall(1200);
      }
    },
    [
      cleanupCall,
      createPeerConnection,
      ensureAudioSender,
      flushPendingIceCandidates,
      logCall,
      sendToCallChannel,
      updateActiveCall,
    ]
  );

  const handleAnswer = useCallback(
    async (signal: Extract<CallSignal, { type: "answer" }>) => {
      const pc = peerConnectionRef.current;
      if (!pc) return;

      try {
        if (!hasAudioMediaSection(signal.description)) {
          throw new Error("The call answer did not include audio.");
        }

        await pc.setRemoteDescription(signal.description);
        await flushPendingIceCandidates();
        updateActiveCall((call) => ({
          ...call,
          error: null,
          status: "connecting",
        }));
      } catch (error) {
        const current = activeCallRef.current;
        const message = getCallSetupErrorMessage(error);
        setMediaError(message);
        updateActiveCall((call) => ({
          ...call,
          error: message,
          status: "ended",
        }));
        if (current) {
          void logCall(current, "failed");
        }
        cleanupCall(1200);
      }
    },
    [cleanupCall, flushPendingIceCandidates, logCall, updateActiveCall]
  );

  const handleIceCandidate = useCallback(
    async (signal: Extract<CallSignal, { type: "ice-candidate" }>) => {
      const pc = peerConnectionRef.current;
      if (!pc || !signal.candidate) return;
      if (!pc.remoteDescription) {
        pendingIceCandidatesRef.current.push(signal.candidate);
        return;
      }

      try {
        await pc.addIceCandidate(signal.candidate);
      } catch {
        updateActiveCall((call) => ({
          ...call,
          error: "A network candidate could not be added.",
        }));
      }
    },
    [updateActiveCall]
  );

  const handleCallSignal = useCallback(
    async (envelope: SignalEnvelope) => {
      if (!currentUser?.id || envelope.from === currentUser.id) return;
      const current = activeCallRef.current;
      if (!current || envelope.callId !== current.callId) return;

      if (envelope.type === "accept" && current.direction === "outgoing") {
        clearRingTimeout();
        updateActiveCall((call) => ({ ...call, error: null, status: "connecting" }));
        await createAndSendOffer();
        return;
      }

      if (envelope.type === "reject" || envelope.type === "busy") {
        clearRingTimeout();
        updateActiveCall((call) => ({
          ...call,
          error: envelope.type === "busy" ? "The user is on another call." : null,
          status: "ended",
        }));
        cleanupCall(1200);
        return;
      }

      if (envelope.type === "cancel") {
        cleanupCall();
        return;
      }

      if (envelope.type === "end") {
        updateActiveCall((call) => ({ ...call, status: "ended" }));
        cleanupCall(900);
        return;
      }

      if (envelope.type === "offer") {
        await handleOffer(envelope);
        return;
      }

      if (envelope.type === "answer") {
        await handleAnswer(envelope);
        return;
      }

      if (envelope.type === "ice-candidate") {
        await handleIceCandidate(envelope);
      }
    },
    [
      cleanupCall,
      clearRingTimeout,
      createAndSendOffer,
      currentUser?.id,
      handleAnswer,
      handleIceCandidate,
      handleOffer,
      updateActiveCall,
    ]
  );

  const joinCallChannel = useCallback(
    async (callId: string) => {
      removeCallChannel();

      const channel = supabase
        .channel(`call:${callId}`, {
          config: { broadcast: { ack: true, self: false }, private: true },
        })
        .on("broadcast", { event: "call-signal" }, ({ payload }) => {
          void handleCallSignal(payload as SignalEnvelope);
        });

      await subscribeChannel(channel);
      callChannelRef.current = channel;
      return channel;
    },
    [handleCallSignal, removeCallChannel, subscribeChannel]
  );

  const handleIncomingInvite = useCallback(
    async (envelope: SignalEnvelope) => {
      if (!currentUser?.id || envelope.type !== "invite") return;

      const current = activeCallRef.current;
      if (current && current.status !== "ended") {
        await updateCallSession(envelope.callId, "busy");
        await sendToTemporaryCallChannel(envelope.callId, {
          callId: envelope.callId,
          conversationId: envelope.conversationId,
          type: "busy",
        });
        return;
      }

      try {
        const res = await fetch("/api/messages/calls/verify", {
          body: JSON.stringify({
            callerId: envelope.caller.id,
            callId: envelope.callId,
            conversationId: envelope.conversationId,
            kind: envelope.kind,
          }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        });

        if (!res.ok) return;

        const data = (await res.json()) as VerifyCallResponse;
        iceServersRef.current = data.iceServers;

        setActiveCall({
          callId: data.callId,
          connectedAt: null,
          conversationId: data.conversationId,
          direction: "incoming",
          error: null,
          kind: data.kind,
          peer: data.caller,
          startedAt: Date.now(),
          status: "incoming",
        });

        ringTimeoutRef.current = window.setTimeout(() => {
          const latest = activeCallRef.current;
          if (latest?.callId === data.callId && latest.status === "incoming") {
            cleanupCall();
          }
        }, CALL_RING_TIMEOUT_MS);
      } catch {
        // Ignore invalid or stale invites.
      }
    },
    [
      cleanupCall,
      currentUser?.id,
      sendToTemporaryCallChannel,
      setActiveCall,
      updateCallSession,
    ]
  );

  const startCall = useCallback(
    async (conversationId: string, peer: CallPeer | null, kind: CallKind) => {
      if (!currentUser?.id || !peer) return;
      if (activeCallRef.current) return;

      let createdCallId: string | null = null;

      try {
        const res = await fetch("/api/messages/calls", {
          body: JSON.stringify({ conversationId, kind }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        });

        if (!res.ok) {
          throw new Error("Unable to start this call.");
        }

        const data = (await res.json()) as CreateCallResponse;
        createdCallId = data.callId;
        iceServersRef.current = data.iceServers;

        await getLocalMedia(kind);

        const call: ActiveCall = {
          callId: data.callId,
          connectedAt: null,
          conversationId,
          direction: "outgoing",
          error: null,
          kind,
          peer: data.peer,
          startedAt: Date.now(),
          status: "ringing",
        };

        setActiveCall(call);
        await joinCallChannel(data.callId);

        await sendToUserChannel(data.peer.id, {
          callId: data.callId,
          caller: {
            id: currentUser.id,
            image: currentUser.image ?? null,
            name: currentUser.name ?? "Unknown",
          },
          conversationId,
          kind,
          type: "invite",
        });

        ringTimeoutRef.current = window.setTimeout(() => {
          const latest = activeCallRef.current;
          if (latest?.callId === data.callId && latest.status === "ringing") {
            void sendToUserChannel(data.peer.id, {
              callId: data.callId,
              conversationId,
              type: "cancel",
            });
            void logCall(latest, "missed");
            updateActiveCall((currentCall) => ({
              ...currentCall,
              error: "No answer.",
              status: "ended",
            }));
            cleanupCall(1200);
          }
        }, CALL_RING_TIMEOUT_MS);
      } catch (error) {
        if (createdCallId) {
          void updateCallSession(
            createdCallId,
            "failed",
            0,
            error instanceof Error ? error.message : "Unable to start this call."
          );
        }
        stopMedia();
        setActiveCall({
          callId: createdCallId ?? crypto.randomUUID(),
          connectedAt: null,
          conversationId,
          direction: "outgoing",
          error:
            error instanceof Error
              ? error.message
              : "Unable to start this call.",
          kind,
          peer,
          startedAt: Date.now(),
          status: "ended",
        });
        cleanupCall(1800);
      }
    },
    [
      cleanupCall,
      currentUser?.id,
      currentUser?.image,
      currentUser?.name,
      getLocalMedia,
      joinCallChannel,
      logCall,
      sendToUserChannel,
      setActiveCall,
      stopMedia,
      updateActiveCall,
      updateCallSession,
    ]
  );

  const acceptCall = useCallback(async () => {
    const current = activeCallRef.current;
    if (!current || current.direction !== "incoming") return;

    try {
      clearRingTimeout();
      await getLocalMedia(current.kind);
      await joinCallChannel(current.callId);
      await updateCallSession(current.callId, "accepted");
      updateActiveCall((call) => ({ ...call, error: null, status: "connecting" }));
      await sendToCallChannel({
        callId: current.callId,
        conversationId: current.conversationId,
        type: "accept",
      });
    } catch (error) {
      updateActiveCall((call) => ({
        ...call,
        error:
          error instanceof Error
            ? error.message
            : "Unable to access camera or microphone.",
        status: "ended",
      }));
      await sendToTemporaryCallChannel(current.callId, {
        callId: current.callId,
        conversationId: current.conversationId,
        type: "reject",
      });
      await updateCallSession(
        current.callId,
        "rejected",
        0,
        error instanceof Error ? error.message : "Unable to access media."
      );
      cleanupCall(1600);
    }
  }, [
    cleanupCall,
    clearRingTimeout,
    getLocalMedia,
    joinCallChannel,
    sendToCallChannel,
    sendToTemporaryCallChannel,
    updateActiveCall,
    updateCallSession,
  ]);

  const rejectCall = useCallback(async () => {
    const current = activeCallRef.current;
    if (!current) return;

    clearRingTimeout();
    await sendToTemporaryCallChannel(current.callId, {
      callId: current.callId,
      conversationId: current.conversationId,
      type: "reject",
    });
    await logCall(current, "rejected");
    updateActiveCall((call) => ({ ...call, status: "ended" }));
    cleanupCall(600);
  }, [
    cleanupCall,
    clearRingTimeout,
    logCall,
    sendToTemporaryCallChannel,
    updateActiveCall,
  ]);

  const endCall = useCallback(async () => {
    const current = activeCallRef.current;
    if (!current) return;

    clearRingTimeout();

    if (current.status === "ringing") {
      await sendToUserChannel(current.peer.id, {
        callId: current.callId,
        conversationId: current.conversationId,
        type: "cancel",
      });
      await logCall(current, "cancelled");
    } else if (current.status === "incoming") {
      await sendToTemporaryCallChannel(current.callId, {
        callId: current.callId,
        conversationId: current.conversationId,
        type: "reject",
      });
      await logCall(current, "rejected");
    } else {
      await sendToCallChannel({
        callId: current.callId,
        conversationId: current.conversationId,
        type: "end",
      });
      await logCall(current, current.connectedAt ? "ended" : "failed");
    }

    updateActiveCall((call) => ({ ...call, status: "ended" }));
    cleanupCall(500);
  }, [
    cleanupCall,
    clearRingTimeout,
    logCall,
    sendToCallChannel,
    sendToTemporaryCallChannel,
    sendToUserChannel,
    updateActiveCall,
  ]);

  const toggleMic = useCallback(() => {
    const audioTracks = localStreamRef.current?.getAudioTracks() ?? [];
    if (audioTracks.length === 0) {
      setMicEnabled(false);
      return;
    }

    const next = !micEnabled;
    audioTracks.forEach((track) => {
      track.enabled = next;
    });
    setMicEnabled(next);
  }, [micEnabled]);

  const toggleCamera = useCallback(() => {
    if (activeCallRef.current?.kind === "audio") return;

    const next = !cameraEnabled;
    localStreamRef.current
      ?.getVideoTracks()
      .forEach((track) => {
        track.enabled = next;
      });
    setCameraEnabled(next);
  }, [cameraEnabled]);

  const renegotiate = useCallback(async () => {
    const current = activeCallRef.current;
    const pc = peerConnectionRef.current;
    if (!current || !pc || pc.signalingState !== "stable") return;

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await sendToCallChannel({
      callId: current.callId,
      description: offer,
      type: "offer",
    });
  }, [sendToCallChannel]);

  const replaceLocalTrack = useCallback(
    async (track: MediaStreamTrack, stream: MediaStream) => {
      const pc = peerConnectionRef.current;
      const existingStream = localStreamRef.current;
      const oldTracks =
        track.kind === "audio"
          ? existingStream?.getAudioTracks() ?? []
          : existingStream?.getVideoTracks() ?? [];

      const sender = pc
        ?.getSenders()
        .find((item) => item.track?.kind === track.kind);

      if (sender) {
        await sender.replaceTrack(track);
      } else if (pc) {
        pc.addTrack(track, stream);
        await renegotiate();
      }

      const nextStream = new MediaStream(
        track.kind === "audio"
          ? [track, ...(existingStream?.getVideoTracks() ?? [])]
          : [...(existingStream?.getAudioTracks() ?? []), track]
      );

      setLocalStream(nextStream);
      oldTracks.forEach((oldTrack) => {
        if (oldTrack.id !== track.id) oldTrack.stop();
      });
    },
    [renegotiate, setLocalStream]
  );

  const switchAudioInput = useCallback(
    async (deviceId: string) => {
      if (!navigator.mediaDevices?.getUserMedia) return;

      try {
        setMediaError(null);
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: getAudioConstraints(deviceId),
          video: false,
        });
        const track = stream.getAudioTracks()[0];
        if (!track) return;
        track.enabled = micEnabled;
        await replaceLocalTrack(track, stream);
        setSelectedAudioInputId(deviceId);
      } catch (error) {
        setMediaError(getMediaErrorMessage(error, "audio"));
      }
    },
    [micEnabled, replaceLocalTrack]
  );

  const switchVideoInput = useCallback(
    async (deviceId: string) => {
      if (!navigator.mediaDevices?.getUserMedia) return;
      if (activeCallRef.current?.kind === "audio") return;

      try {
        setMediaError(null);
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: getVideoConstraints(deviceId),
        });
        const track = stream.getVideoTracks()[0];
        if (!track) return;
        track.enabled = cameraEnabled;
        if (!screenSharing) {
          await replaceLocalTrack(track, stream);
        } else {
          const existingStream = localStreamRef.current;
          const nextStream = new MediaStream([
            ...(existingStream?.getAudioTracks() ?? []),
            track,
          ]);
          existingStream?.getVideoTracks().forEach((oldTrack) => oldTrack.stop());
          setLocalStream(nextStream);
        }
        setSelectedVideoInputId(deviceId);
      } catch (error) {
        setMediaError(getMediaErrorMessage(error, "video"));
      }
    },
    [cameraEnabled, replaceLocalTrack, screenSharing, setLocalStream]
  );

  const switchAudioOutput = useCallback((deviceId: string) => {
    setSelectedAudioOutputId(deviceId);
  }, []);

  const stopScreenShare = useCallback(async () => {
    const screenTrack = screenTrackRef.current;
    const pc = peerConnectionRef.current;
    const cameraTrack = localStreamRef.current?.getVideoTracks()[0] ?? null;
    const videoSender = pc
      ?.getSenders()
      .find((sender) => sender.track?.kind === "video");

    if (videoSender) {
      await videoSender.replaceTrack(cameraTrack);
    }

    if (screenTrack && screenTrack.readyState !== "ended") {
      screenTrack.stop();
    }

    screenTrackRef.current = null;
    setScreenSharing(false);
  }, []);

  const toggleScreenShare = useCallback(async () => {
    if (screenSharing) {
      await stopScreenShare();
      return;
    }

    const current = activeCallRef.current;
    const pc = peerConnectionRef.current;
    if (
      !current ||
      current.kind !== "video" ||
      !pc ||
      !navigator.mediaDevices?.getDisplayMedia
    ) {
      return;
    }

    let screenStream: MediaStream;
    try {
      setMediaError(null);
      screenStream = await navigator.mediaDevices.getDisplayMedia({
        audio: false,
        video: true,
      });
    } catch {
      setMediaError("Screen sharing permission was denied.");
      return;
    }

    const screenTrack = screenStream.getVideoTracks()[0];
    if (!screenTrack) return;

    const videoSender = pc
      .getSenders()
      .find((sender) => sender.track?.kind === "video");

    if (videoSender) {
      await videoSender.replaceTrack(screenTrack);
    } else {
      pc.addTrack(screenTrack, screenStream);
      await renegotiate();
    }

    screenTrackRef.current = screenTrack;
    setScreenSharing(true);

    screenTrack.onended = () => {
      void stopScreenShare();
    };
  }, [renegotiate, screenSharing, stopScreenShare]);

  useEffect(() => {
    void refreshDevices();

    const handleDeviceChange = () => {
      void refreshDevices();
    };

    navigator.mediaDevices?.addEventListener?.("devicechange", handleDeviceChange);
    return () => {
      navigator.mediaDevices?.removeEventListener?.(
        "devicechange",
        handleDeviceChange
      );
    };
  }, [refreshDevices]);

  useEffect(() => {
    if (!currentUser?.id) return;

    const channel = supabase
      .channel(`calls:user:${currentUser.id}`, {
        config: { broadcast: { ack: true, self: false }, private: true },
      })
      .on("broadcast", { event: "call-user-signal" }, ({ payload }) => {
        const envelope = payload as SignalEnvelope;

        if (envelope.from === currentUser.id) return;

        if (envelope.type === "invite") {
          void handleIncomingInvite(envelope);
        }

        if (envelope.type === "cancel") {
          const current = activeCallRef.current;
          if (current?.callId === envelope.callId) {
            cleanupCall();
          }
        }
      });

    void subscribeChannel(channel).catch(() => {
      setMediaError("Realtime calling channel could not be opened.");
    });
    userChannelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      if (userChannelRef.current === channel) userChannelRef.current = null;
    };
  }, [cleanupCall, currentUser?.id, handleIncomingInvite, subscribeChannel]);

  useEffect(() => {
    return () => {
      clearRingTimeout();
      clearReconnectTimeout();
      closePeerConnection();
      removeCallChannel();
      stopMedia();
      if (userChannelRef.current) {
        supabase.removeChannel(userChannelRef.current);
      }
    };
  }, [
    clearReconnectTimeout,
    clearRingTimeout,
    closePeerConnection,
    removeCallChannel,
    stopMedia,
  ]);

  useEffect(() => {
    const handlePageHide = () => {
      const current = activeCallRef.current;
      if (!current || current.status === "ended") return;

      const durationSeconds = current.connectedAt
        ? Math.floor((Date.now() - current.connectedAt) / 1000)
        : 0;
      const status =
        current.status === "ringing"
          ? "cancelled"
          : current.connectedAt
            ? "ended"
            : "failed";

      void fetch(`/api/messages/calls/${current.callId}`, {
        body: JSON.stringify({ durationSeconds, status }),
        headers: { "Content-Type": "application/json" },
        keepalive: true,
        method: "PATCH",
      });
    };

    window.addEventListener("pagehide", handlePageHide);
    return () => window.removeEventListener("pagehide", handlePageHide);
  }, []);

  return {
    acceptCall,
    activeCall,
    audioInputDevices,
    audioOutputDevices,
    cameraEnabled,
    endCall,
    localStream,
    mediaError,
    micEnabled,
    refreshDevices,
    rejectCall,
    remoteStream,
    screenSharing,
    selectedAudioInputId,
    selectedAudioOutputId,
    selectedVideoInputId,
    startCall,
    switchAudioInput,
    switchAudioOutput,
    switchVideoInput,
    toggleCamera,
    toggleMic,
    toggleScreenShare,
    videoInputDevices,
  };
}
