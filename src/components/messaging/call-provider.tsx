"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { useSupabaseUser } from "@/hooks/use-supabase-user";
import {
  useWebRTCCall,
  type ActiveCall,
  type CallKind,
  type CallMessage,
  type CallPeer,
} from "@/hooks/use-webrtc-call";
import { CallInterface } from "@/components/messaging/call-interface";

type CallMessageHandler = (
  conversationId: string,
  message: CallMessage
) => void;

type CallContextValue = {
  acceptCall: () => Promise<void>;
  activeCall: ActiveCall | null;
  audioInputDevices: MediaDeviceInfo[];
  audioOutputDevices: MediaDeviceInfo[];
  cameraEnabled: boolean;
  endCall: () => Promise<void>;
  localStream: MediaStream | null;
  mediaError: string | null;
  micEnabled: boolean;
  refreshDevices: () => Promise<void>;
  rejectCall: () => Promise<void>;
  remoteStream: MediaStream | null;
  screenSharing: boolean;
  selectedAudioInputId: string | null;
  selectedAudioOutputId: string | null;
  selectedVideoInputId: string | null;
  startCall: (
    conversationId: string,
    peer: CallPeer | null,
    kind: CallKind
  ) => Promise<void>;
  subscribeToCallMessages: (handler: CallMessageHandler) => () => void;
  switchAudioInput: (deviceId: string) => Promise<void>;
  switchAudioOutput: (deviceId: string) => void;
  switchVideoInput: (deviceId: string) => Promise<void>;
  toggleCamera: () => void;
  toggleMic: () => void;
  toggleScreenShare: () => Promise<void>;
  videoInputDevices: MediaDeviceInfo[];
};

const CallContext = createContext<CallContextValue | null>(null);

export function CallProvider({ children }: { children: ReactNode }) {
  const { user } = useSupabaseUser();
  const callMessageHandlersRef = useRef(new Set<CallMessageHandler>());

  const handleCallMessage = useCallback(
    (conversationId: string, message: CallMessage) => {
      callMessageHandlersRef.current.forEach((handler) => {
        handler(conversationId, message);
      });
    },
    []
  );

  const call = useWebRTCCall({
    currentUser: user?.id
      ? {
          id: user.id,
          image: user.user_metadata?.avatar_url ?? null,
          name: user.user_metadata?.full_name ?? "Unknown",
        }
      : null,
    onCallMessage: handleCallMessage,
  });

  const subscribeToCallMessages = useCallback((handler: CallMessageHandler) => {
    callMessageHandlersRef.current.add(handler);
    return () => {
      callMessageHandlersRef.current.delete(handler);
    };
  }, []);

  const value = useMemo<CallContextValue>(
    () => ({
      ...call,
      subscribeToCallMessages,
    }),
    [call, subscribeToCallMessages]
  );

  return (
    <CallContext.Provider value={value}>
      {children}
      <CallInterface
        activeCall={call.activeCall}
        audioInputDevices={call.audioInputDevices}
        audioOutputDevices={call.audioOutputDevices}
        cameraEnabled={call.cameraEnabled}
        localStream={call.localStream}
        mediaError={call.mediaError}
        micEnabled={call.micEnabled}
        onAccept={call.acceptCall}
        onEnd={call.endCall}
        onReject={call.rejectCall}
        onSelectAudioInput={call.switchAudioInput}
        onSelectAudioOutput={call.switchAudioOutput}
        onSelectVideoInput={call.switchVideoInput}
        onToggleCamera={call.toggleCamera}
        onToggleMic={call.toggleMic}
        onToggleScreenShare={call.toggleScreenShare}
        remoteStream={call.remoteStream}
        screenSharing={call.screenSharing}
        selectedAudioInputId={call.selectedAudioInputId}
        selectedAudioOutputId={call.selectedAudioOutputId}
        selectedVideoInputId={call.selectedVideoInputId}
        videoInputDevices={call.videoInputDevices}
      />
    </CallContext.Provider>
  );
}

export function useCall() {
  const context = useContext(CallContext);

  if (!context) {
    throw new Error("useCall must be used inside CallProvider.");
  }

  return context;
}
