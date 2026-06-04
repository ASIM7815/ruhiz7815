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
  isAudioOnly?: boolean; // Track if this is an audio-only call (video hidden in UI)
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
  | { callId: string; caller: CallPeer; conversationId: string; kind: CallKind; isAudioOnly?: boolean; type: "invite" }
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
const SIGNAL_SUBSCRIBE_TIMEOUT_MS = 6_000;
const SIGNAL_SEND_ERROR = "Realtime signaling message could not be delivered.";

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

function hasLiveAudioTrack(stream: MediaStream | null) {
  return (
    stream?.getAudioTracks().some((track) => track.readyState === "live") ??
    false
  );
}

async function sendBroadcastSignal(
  channel: RealtimeChannel,
  event: "call-signal" | "call-user-signal",
  payload: SignalEnvelope
) {
  const result = await channel.send({
    event,
    payload,
    type: "broadcast",
  });

  return result === "ok";
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
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [localStream, setLocalStreamState] = useState<MediaStream | null>(null);
  const [micEnabled, setMicEnabled] = useState(false);
  const [remoteStream, setRemoteStreamState] = useState<MediaStream | null>(null);
  const [screenSharing, setScreenSharing] = useState(false);

  const activeCallRef = useRef<ActiveCall | null>(null);
  const callChannelRef = useRef<RealtimeChannel | null>(null);
  const iceServersRef = useRef<RTCIceServer[]>([]);
  const localStreamRef = useRef<MediaStream | null>(null);
  const loggedCallIdsRef = useRef(new Set<string>());
  const pendingIceCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
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

  const removeCallChannel = useCallback(() => {
    if (callChannelRef.current) {
      supabase.removeChannel(callChannelRef.current);
      callChannelRef.current = null;
    }
  }, []);

  const closePeerConnection = useCallback(() => {
    pendingIceCandidatesRef.current = [];
    peerConnectionRef.current?.getSenders().forEach((sender) => {
      if (sender.track && sender.track.readyState !== "ended") {
        sender.track.stop();
      }
    });
    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;
  }, []);

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
      if (!currentUser?.id || !callChannelRef.current) return false;

      return sendBroadcastSignal(callChannelRef.current, "call-signal", {
        ...signal,
        from: currentUser.id,
      } satisfies SignalEnvelope);
    },
    [currentUser?.id]
  );

  const sendToTemporaryCallChannel = useCallback(
    async (callId: string, signal: CallSignal) => {
      if (!currentUser?.id) return false;

      const channel = supabase.channel(`call:${callId}`, {
        config: { broadcast: { ack: true, self: false }, private: false },
      });

      try {
        await subscribeChannel(channel);
        return await sendBroadcastSignal(channel, "call-signal", {
          ...signal,
          from: currentUser.id,
        } satisfies SignalEnvelope);
      } finally {
        window.setTimeout(() => supabase.removeChannel(channel), 500);
      }
    },
    [currentUser?.id, subscribeChannel]
  );

  const sendToUserChannel = useCallback(
    async (userId: string, signal: CallSignal) => {
      if (!currentUser?.id) return false;

      const channel = supabase.channel(`calls:user:${userId}`, {
        config: { broadcast: { ack: true, self: false }, private: false },
      });

      try {
        await subscribeChannel(channel);
        return await sendBroadcastSignal(channel, "call-user-signal", {
          ...signal,
          from: currentUser.id,
        } satisfies SignalEnvelope);
      } finally {
        window.setTimeout(() => supabase.removeChannel(channel), 500);
      }
    },
    [currentUser?.id, subscribeChannel]
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
        const res = await fetch("/api/messages/calls/log", {
          body: JSON.stringify({
            conversationId: call.conversationId,
            durationSeconds,
            // Log as "audio" if it was an audio-only call, otherwise use the actual kind
            kind: call.isAudioOnly ? "audio" : call.kind,
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
    [onCallMessage]
  );

  const getLocalMedia = useCallback(async (kind: CallKind, isAudioOnly = false) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("This browser does not support audio or video calls.");
    }

    // Always request video for audio-only calls to ensure reliable audio track acquisition
    const actualKind = isAudioOnly ? "video" : kind;

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        autoGainControl: true,
        echoCancellation: true,
        noiseSuppression: true,
      },
      video:
        actualKind === "video"
          ? {
              facingMode: "user",
              height: { ideal: 720 },
              width: { ideal: 1280 },
            }
          : false,
    });
    const audioTracks = stream.getAudioTracks();

    if (audioTracks.length === 0) {
      stream.getTracks().forEach((track) => track.stop());
      throw new Error("No microphone track is available for this call.");
    }

    // If this is an audio-only call, immediately stop and disable video tracks
    if (isAudioOnly) {
      stream.getVideoTracks().forEach((track) => {
        track.enabled = false;
        track.stop();
      });
    }

    setLocalStream(stream);
    setMicEnabled(audioTracks.some((track) => track.enabled));
    setCameraEnabled(isAudioOnly ? false : stream.getVideoTracks().some((track) => track.enabled));

    stream.getTracks().forEach((track) => {
      track.onended = () => {
        if (track.kind === "audio") setMicEnabled(false);
        if (track.kind === "video") setCameraEnabled(false);
      };
    });

    return stream;
  }, [setLocalStream]);

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

  const markCallConnected = useCallback(() => {
    if (!hasLiveAudioTrack(remoteStreamRef.current)) return;

    updateActiveCall((call) => ({
      ...call,
      connectedAt: call.connectedAt ?? Date.now(),
      error: null,
      status: "connected",
    }));
  }, [updateActiveCall]);

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

      const nextStream = new MediaStream([...tracksById.values()]);
      setRemoteStream(nextStream);

      if (
        hasLiveAudioTrack(nextStream) &&
        (peerConnectionRef.current?.connectionState === "connected" ||
          peerConnectionRef.current?.iceConnectionState === "connected" ||
          peerConnectionRef.current?.iceConnectionState === "completed")
      ) {
        markCallConnected();
      }

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
    [markCallConnected, setRemoteStream]
  );

  const createPeerConnection = useCallback(() => {
    const existing = peerConnectionRef.current;
    if (existing) return existing;

    const pc = new RTCPeerConnection({
      iceCandidatePoolSize: 4,
      iceServers: iceServersRef.current,
    });

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
      })
        .then((sent) => {
          if (!sent) {
            updateActiveCall((call) => ({
              ...call,
              error: "A network candidate could not be sent.",
            }));
          }
        })
        .catch(() => {
          updateActiveCall((call) => ({
            ...call,
            error: "A network candidate could not be sent.",
          }));
        });
    };

    pc.ontrack = (event) => {
      appendRemoteTrack(event);
    };

    pc.onconnectionstatechange = () => {
      const current = activeCallRef.current;
      if (!current) return;

      if (pc.connectionState === "connected") {
        markCallConnected();
      }

      if (pc.connectionState === "disconnected") {
        updateActiveCall((call) => ({ ...call, status: "reconnecting" }));
      }

      if (pc.connectionState === "failed") {
        updateActiveCall((call) => ({
          ...call,
          error: "The peer connection failed.",
          status: "ended",
        }));
        void logCall(current, "failed");
        cleanupCall(1200);
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (
        pc.iceConnectionState === "connected" ||
        pc.iceConnectionState === "completed"
      ) {
        markCallConnected();
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  }, [
    appendRemoteTrack,
    cleanupCall,
    logCall,
    markCallConnected,
    sendToCallChannel,
    updateActiveCall,
  ]);

  const createAndSendOffer = useCallback(async () => {
    const current = activeCallRef.current;
    if (!current) return;

    try {
      const pc = createPeerConnection();
      ensureAudioSender(pc);
      const offer = await pc.createOffer();

      if (!hasAudioMediaSection(offer)) {
        throw new Error("The call offer did not include an audio channel.");
      }

      await pc.setLocalDescription(offer);

      const offerSent = await sendToCallChannel({
        callId: current.callId,
        description: offer,
        type: "offer",
      });

      if (!offerSent) {
        throw new Error(SIGNAL_SEND_ERROR);
      }
    } catch (error) {
      const message = getCallSetupErrorMessage(error);
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

        const answerSent = await sendToCallChannel({
          callId: current.callId,
          description: answer,
          type: "answer",
        });

        if (!answerSent) {
          throw new Error(SIGNAL_SEND_ERROR);
        }

        markCallConnected();
      } catch (error) {
        const message = getCallSetupErrorMessage(error);
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
      markCallConnected,
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
        markCallConnected();
      } catch (error) {
        const current = activeCallRef.current;
        const message = getCallSetupErrorMessage(error);
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
    [
      cleanupCall,
      flushPendingIceCandidates,
      logCall,
      markCallConnected,
      updateActiveCall,
    ]
  );

  const handleIceCandidate = useCallback(
    async (signal: Extract<CallSignal, { type: "ice-candidate" }>) => {
      const pc = peerConnectionRef.current;
      if (!signal.candidate) return;

      if (!pc) {
        pendingIceCandidatesRef.current.push(signal.candidate);
        return;
      }

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
          config: { broadcast: { ack: true, self: false }, private: false },
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
        await sendToTemporaryCallChannel(envelope.callId, {
          callId: envelope.callId,
          conversationId: envelope.conversationId,
          type: "busy",
        }).catch(() => false);
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
          isAudioOnly: envelope.isAudioOnly ?? false, // Track if this is an audio-only call
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
    [cleanupCall, currentUser?.id, sendToTemporaryCallChannel, setActiveCall]
  );

  const startCall = useCallback(
    async (conversationId: string, peer: CallPeer | null, kind: CallKind) => {
      if (!currentUser?.id || !peer) return;
      if (activeCallRef.current) return;

      // Track if this is an audio-only call (user clicked "Audio Call" button)
      const isAudioOnly = kind === "audio";
      // Always use "video" for backend to ensure reliable audio track acquisition
      const backendKind: CallKind = "video";

      try {
        const res = await fetch("/api/messages/calls", {
          body: JSON.stringify({ conversationId, kind: backendKind }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        });

        if (!res.ok) {
          throw new Error("Unable to start this call.");
        }

        const data = (await res.json()) as CreateCallResponse;
        iceServersRef.current = data.iceServers;

        // Get media with video enabled (even for audio-only calls)
        await getLocalMedia(backendKind, isAudioOnly);

        const call: ActiveCall = {
          callId: data.callId,
          connectedAt: null,
          conversationId,
          direction: "outgoing",
          error: null,
          kind: backendKind,
          isAudioOnly, // Track the user's intent
          peer: data.peer,
          startedAt: Date.now(),
          status: "ringing",
        };

        setActiveCall(call);
        await joinCallChannel(data.callId);

        const inviteSent = await sendToUserChannel(data.peer.id, {
          callId: data.callId,
          caller: {
            id: currentUser.id,
            image: currentUser.image ?? null,
            name: currentUser.name ?? "Unknown",
          },
          conversationId,
          kind: backendKind,
          isAudioOnly, // Tell the receiver this is audio-only
          type: "invite",
        });

        if (!inviteSent) {
          throw new Error(SIGNAL_SEND_ERROR);
        }

        ringTimeoutRef.current = window.setTimeout(() => {
          const latest = activeCallRef.current;
          if (latest?.callId === data.callId && latest.status === "ringing") {
            void sendToUserChannel(data.peer.id, {
              callId: data.callId,
              conversationId,
              type: "cancel",
            }).catch(() => false);
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
        stopMedia();
        setActiveCall({
          callId: crypto.randomUUID(),
          connectedAt: null,
          conversationId,
          direction: "outgoing",
          error:
            error instanceof Error
              ? error.message
              : "Unable to start this call.",
          kind: isAudioOnly ? "audio" : kind,
          isAudioOnly,
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
    ]
  );

  const acceptCall = useCallback(async () => {
    const current = activeCallRef.current;
    if (!current || current.direction !== "incoming") return;

    try {
      clearRingTimeout();
      // Get media with the isAudioOnly flag
      await getLocalMedia(current.kind, current.isAudioOnly);
      await joinCallChannel(current.callId);
      updateActiveCall((call) => ({ ...call, error: null, status: "connecting" }));
      const acceptSent = await sendToCallChannel({
        callId: current.callId,
        conversationId: current.conversationId,
        type: "accept",
      });
      if (!acceptSent) {
        throw new Error(SIGNAL_SEND_ERROR);
      }
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
      }).catch(() => false);
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
  ]);

  const rejectCall = useCallback(async () => {
    const current = activeCallRef.current;
    if (!current) return;

    clearRingTimeout();
    await sendToTemporaryCallChannel(current.callId, {
      callId: current.callId,
      conversationId: current.conversationId,
      type: "reject",
    }).catch(() => false);
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
      }).catch(() => false);
      await logCall(current, "cancelled");
    } else if (current.status === "incoming") {
      await sendToTemporaryCallChannel(current.callId, {
        callId: current.callId,
        conversationId: current.conversationId,
        type: "reject",
      }).catch(() => false);
      await logCall(current, "rejected");
    } else {
      await sendToCallChannel({
        callId: current.callId,
        conversationId: current.conversationId,
        type: "end",
      }).catch(() => false);
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
    const next = !micEnabled;
    localStreamRef.current
      ?.getAudioTracks()
      .forEach((track) => {
        track.enabled = next;
      });
    setMicEnabled(next);
  }, [micEnabled]);

  const toggleCamera = useCallback(async () => {
    const pc = peerConnectionRef.current;
    const stream = localStreamRef.current;
    
    if (!stream) return;

    const next = !cameraEnabled;
    const videoTracks = stream.getVideoTracks();

    if (next && videoTracks.length === 0) {
      // Camera was fully stopped, need to get new video track
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            height: { ideal: 720 },
            width: { ideal: 1280 },
          },
        });

        const newVideoTrack = newStream.getVideoTracks()[0];
        if (!newVideoTrack) return;

        // Add track to stream
        stream.addTrack(newVideoTrack);
        setLocalStream(new MediaStream([...stream.getTracks()]));

        // Replace track in peer connection if connected
        if (pc) {
          const videoSender = pc
            .getSenders()
            .find((sender) => sender.track?.kind === "video");

          if (videoSender) {
            await videoSender.replaceTrack(newVideoTrack);
          } else {
            pc.addTrack(newVideoTrack, stream);
          }
        }

        newVideoTrack.onended = () => setCameraEnabled(false);
        setCameraEnabled(true);
      } catch {
        // Camera access failed, stay disabled
        return;
      }
    } else {
      // Just toggle enable/disable on existing tracks
      videoTracks.forEach((track) => {
        track.enabled = next;
      });
      setCameraEnabled(next);
    }
  }, [cameraEnabled, setLocalStream]);

  const renegotiate = useCallback(async () => {
    const current = activeCallRef.current;
    const pc = peerConnectionRef.current;
    if (!current || !pc || pc.signalingState !== "stable") return;

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    const offerSent = await sendToCallChannel({
      callId: current.callId,
      description: offer,
      type: "offer",
    });

    if (!offerSent) {
      updateActiveCall((call) => ({
        ...call,
        error: SIGNAL_SEND_ERROR,
      }));
    }
  }, [sendToCallChannel, updateActiveCall]);

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
    if (!current || !pc || !navigator.mediaDevices?.getDisplayMedia) return;

    const screenStream = await navigator.mediaDevices.getDisplayMedia({
      audio: false,
      video: true,
    });
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
    if (!currentUser?.id) return;

    const channel = supabase
      .channel(`calls:user:${currentUser.id}`, {
        config: { broadcast: { ack: true, self: false }, private: false },
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
      // The next outgoing or incoming call action will surface signaling errors.
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
      closePeerConnection();
      removeCallChannel();
      stopMedia();
      if (userChannelRef.current) {
        supabase.removeChannel(userChannelRef.current);
      }
    };
  }, [clearRingTimeout, closePeerConnection, removeCallChannel, stopMedia]);

  return {
    acceptCall,
    activeCall,
    cameraEnabled,
    endCall,
    localStream,
    micEnabled,
    rejectCall,
    remoteStream,
    screenSharing,
    startCall,
    toggleCamera,
    toggleMic,
    toggleScreenShare,
  };
}
