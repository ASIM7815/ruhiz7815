# Video and Audio Calling Feature Guide

## Overview

The RUHIZ platform includes a fully functional WebRTC-based video and audio calling system that allows users to make direct calls within conversations. This guide explains how the feature works, how to use it, and how to troubleshoot common issues.

## Features

### ✅ Implemented Features

1. **Audio Calls** - Voice-only calls with microphone control
2. **Video Calls** - Video calls with camera and microphone control
3. **Call Controls**:
   - Mute/unmute microphone
   - Enable/disable camera (video calls only)
   - Screen sharing (video calls only)
   - End call
4. **Call States**:
   - Incoming call notifications
   - Ringing state for outgoing calls
   - Connecting state
   - Connected state with duration timer
   - Reconnecting state (automatic recovery)
   - Call ended state
5. **Call Logging** - All calls are logged in the conversation history with:
   - Call type (audio/video)
   - Call duration
   - Call status (ended, missed, rejected, cancelled, failed)
6. **Real-time Signaling** - Uses Supabase Realtime for WebRTC signaling
7. **NAT Traversal** - STUN/TURN server support for calls across different networks

## How to Use

### Making a Call

1. **Navigate to Messages Tab**
   - Go to the Messages section
   - Select a conversation with another user

2. **Start a Call**
   - Click the **Phone icon** (📞) for an audio call
   - Click the **Video icon** (📹) for a video call

3. **Wait for Answer**
   - The call will show "Ringing..." status
   - Wait for the other user to accept
   - Call will automatically timeout after 30 seconds if not answered

### Receiving a Call

1. **Incoming Call Notification**
   - A full-screen modal will appear showing:
     - Caller's name and avatar
     - Call type (audio or video)
     - Accept and Reject buttons

2. **Accept the Call**
   - Click the green **Accept** button (📞)
   - Grant camera/microphone permissions when prompted
   - Call will connect automatically

3. **Reject the Call**
   - Click the red **Reject** button (📵)
   - Caller will see "Call declined" message

### During a Call

#### Call Controls

- **Microphone Toggle** (🎤/🔇)
  - Click to mute/unmute your microphone
  - Works for both audio and video calls

- **Camera Toggle** (📹/📹❌) - Video calls only
  - Click to enable/disable your camera
  - Only available during video calls

- **Screen Share** (🖥️) - Video calls only
  - Click to share your screen
  - Click again to stop sharing
  - Only available on desktop browsers

- **End Call** (📵)
  - Click the red button to end the call
  - Call duration will be logged in the conversation

#### Call Interface

- **Remote Video/Avatar**: Shows the other person's video or avatar
- **Local Video Preview**: Small preview of your own video (bottom-right corner)
- **Call Duration**: Shows elapsed time once connected
- **Connection Status**: Shows current call state (connecting, connected, reconnecting)

### Call States Explained

| State | Description | User Action |
|-------|-------------|-------------|
| **Incoming** | Someone is calling you | Accept or Reject |
| **Ringing** | Waiting for the other person to answer | Wait or Cancel |
| **Connecting** | Establishing connection | Wait (automatic) |
| **Connected** | Call is active | Use call controls |
| **Reconnecting** | Temporary connection issue | Wait (automatic recovery) |
| **Ended** | Call has finished | Close interface |

## Technical Architecture

### WebRTC Implementation

The calling feature uses WebRTC (Web Real-Time Communication) for peer-to-peer audio/video streaming:

1. **Signaling**: Supabase Realtime channels for WebRTC signaling (SDP offer/answer, ICE candidates)
2. **Media Streams**: Browser MediaStream API for camera/microphone access
3. **Peer Connection**: RTCPeerConnection for establishing peer-to-peer connections
4. **STUN/TURN**: ICE servers for NAT traversal and relay

### Key Components

#### Frontend

- **`useWebRTCCall` Hook** (`src/hooks/use-webrtc-call.ts`)
  - Manages WebRTC connection lifecycle
  - Handles signaling via Supabase Realtime
  - Manages media streams (local and remote)
  - Implements call state machine

- **`CallInterface` Component** (`src/components/messaging/call-interface.tsx`)
  - Full-screen call UI
  - Video/audio rendering
  - Call controls
  - Incoming call modal

- **Messages Page** (`src/app/(platform)/messages/page.tsx`)
  - Integrates calling into messaging interface
  - Passes call handlers to chat components

#### Backend

- **`/api/messages/calls`** - Create a new call
- **`/api/messages/calls/verify`** - Verify incoming call invitation
- **`/api/messages/calls/log`** - Log call history

### Call Flow

```mermaid
sequenceDiagram
    participant A as User A (Caller)
    participant S as Supabase Realtime
    participant B as User B (Receiver)
    
    A->>S: POST /api/messages/calls (create call)
    A->>S: Send "invite" signal
    S->>B: Broadcast "invite" to User B
    B->>B: Show incoming call modal
    B->>S: Send "accept" signal
    S->>A: Broadcast "accept" to User A
    A->>S: Send WebRTC "offer" (SDP)
    S->>B: Broadcast "offer"
    B->>S: Send WebRTC "answer" (SDP)
    S->>A: Broadcast "answer"
    A<-->B: Exchange ICE candidates
    A<-->B: Establish peer-to-peer connection
    A<-->B: Stream audio/video directly
    A->>S: Send "end" signal
    S->>B: Broadcast "end"
    A->>S: POST /api/messages/calls/log
    B->>B: Close call interface
```

## Configuration

### Environment Variables

The calling feature uses the following environment variables for STUN/TURN server configuration:

```env
# STUN Servers (comma-separated URLs)
# Default: Google and Twilio public STUN servers
STUN_URLS=stun:stun.l.google.com:19302,stun:global.stun.twilio.com:3478

# TURN Servers (comma-separated URLs) - Optional but recommended for production
TURN_URLS=turn:your-turn-server.com:3478
TURN_USERNAME=your-turn-username
TURN_CREDENTIAL=your-turn-credential

# Disable public TURN fallback (set to "true" to disable)
# Default: Uses openrelay.metered.ca as fallback if no TURN configured
DISABLE_PUBLIC_TURN_FALLBACK=false
```

### STUN vs TURN Servers

- **STUN Servers**: Help discover your public IP address for direct peer-to-peer connections
  - Free public STUN servers are sufficient for most cases
  - Used when both users are on networks that allow direct connections

- **TURN Servers**: Relay traffic when direct connections fail (strict NATs, firewalls)
  - Required for ~10-20% of calls that can't establish direct connections
  - Recommended for production deployments
  - Can be expensive due to bandwidth costs

### Recommended TURN Providers

1. **Twilio STUN/TURN** - https://www.twilio.com/stun-turn
2. **Xirsys** - https://xirsys.com/
3. **Metered** - https://www.metered.ca/
4. **Self-hosted** - coturn (https://github.com/coturn/coturn)

## Troubleshooting

### Common Issues

#### 1. "Unable to access camera or microphone"

**Cause**: Browser permissions not granted

**Solution**:
- Click the camera/microphone icon in the browser address bar
- Grant permissions for camera and microphone
- Refresh the page and try again
- Check browser settings: Settings → Privacy → Camera/Microphone

#### 2. "Call failed" or "Connection failed"

**Cause**: Network connectivity issues or TURN server not configured

**Solution**:
- Check your internet connection
- Try again in a few seconds
- If persistent, configure TURN servers (see Configuration section)
- Check browser console for detailed error messages

#### 3. "No answer" after 30 seconds

**Cause**: Other user didn't answer in time

**Solution**:
- This is normal behavior - calls timeout after 30 seconds
- Try calling again
- Check if the other user is online

#### 4. Can hear audio but no video

**Cause**: Camera disabled or video track not working

**Solution**:
- Click the camera toggle button to enable video
- Check if camera is being used by another application
- Try refreshing the page
- Check browser camera permissions

#### 5. "The user is on another call"

**Cause**: The person you're calling is already in a call

**Solution**:
- Wait for them to finish their current call
- Try again later

#### 6. Audio echo or feedback

**Cause**: Microphone picking up speaker output

**Solution**:
- Use headphones
- Reduce speaker volume
- Move microphone away from speakers

#### 7. Poor video quality or lag

**Cause**: Slow internet connection or high CPU usage

**Solution**:
- Close other applications using bandwidth
- Switch to audio-only call
- Check your internet speed
- Reduce video quality (automatic in most cases)

### Browser Compatibility

| Browser | Audio Calls | Video Calls | Screen Share |
|---------|-------------|-------------|--------------|
| Chrome 90+ | ✅ | ✅ | ✅ |
| Firefox 88+ | ✅ | ✅ | ✅ |
| Safari 15+ | ✅ | ✅ | ✅ |
| Edge 90+ | ✅ | ✅ | ✅ |
| Mobile Chrome | ✅ | ✅ | ❌ |
| Mobile Safari | ✅ | ✅ | ❌ |

**Note**: Screen sharing is not supported on mobile browsers.

### Network Requirements

- **Minimum bandwidth**: 
  - Audio: 50 kbps
  - Video (720p): 1.5 Mbps
- **Recommended bandwidth**:
  - Audio: 100 kbps
  - Video (720p): 2.5 Mbps
- **Latency**: < 150ms for good quality
- **Ports**: UDP ports 3478, 19302 (STUN), and TURN ports if configured

### Debugging

#### Enable Verbose Logging

Open browser console (F12) and look for logs prefixed with:
- `[WebRTC]` - WebRTC connection events
- `[Call]` - Call state changes
- `[Signaling]` - Supabase Realtime signaling

#### Check WebRTC Stats

In Chrome:
1. During a call, open a new tab
2. Navigate to `chrome://webrtc-internals/`
3. View detailed connection statistics

#### Test STUN/TURN Servers

Use online tools:
- https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/
- Enter your STUN/TURN server URLs to test connectivity

## Security Considerations

### Privacy

- **Peer-to-peer**: Audio/video streams are sent directly between users (not through server)
- **Encryption**: All WebRTC connections use DTLS-SRTP encryption
- **Permissions**: Browser requires explicit user permission for camera/microphone access

### Authorization

- **Conversation membership**: Only users in the same conversation can call each other
- **Call verification**: Backend verifies caller has permission before allowing call
- **Session validation**: All API calls require valid authentication

### Data Retention

- **Call logs**: Stored in conversation history (duration, type, status)
- **Media streams**: NOT recorded or stored on servers
- **Signaling data**: Temporary, not persisted after call ends

## Known Limitations

1. **Group calls**: Not currently supported (only 1-on-1 calls)
2. **Call recording**: Not implemented
3. **Call transfer**: Not implemented
4. **Call waiting**: Second incoming call shows "busy" message
5. **Mobile screen share**: Not supported by mobile browsers
6. **Background calls**: Calls end when app is backgrounded on mobile

## Future Enhancements

Potential features for future releases:

- [ ] Group video calls (3+ participants)
- [ ] Call recording
- [ ] Virtual backgrounds
- [ ] Noise cancellation
- [ ] Call quality indicators
- [ ] Call history page
- [ ] Missed call notifications
- [ ] Voicemail
- [ ] Call scheduling

## Support

If you encounter issues not covered in this guide:

1. Check browser console for error messages
2. Verify environment variables are configured correctly
3. Test with different browsers
4. Check network connectivity
5. Review Supabase Realtime status

For additional help, contact the development team or file an issue in the project repository.

---

**Last Updated**: May 18, 2026
**Version**: 1.0.0
