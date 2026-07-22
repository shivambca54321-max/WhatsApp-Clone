import React, { useEffect, useRef, useState } from 'react';
import useAuthStore from '../store/useAuthStore';
import { useSocket } from '../context/SocketContext';
import { 
  PhoneOff, 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Volume2, 
  VolumeX,
  PhoneCall
} from 'lucide-react';

interface WebRTCCallOverlayProps {
  callState: {
    status: 'idle' | 'calling' | 'ringing' | 'incoming' | 'connected' | 'disconnected';
    chatId: string | null;
    otherUserId: string | null;
    otherUserName: string;
    callType: 'voice' | 'video';
    incomingSignal: any | null;
  };
  setCallState: React.Dispatch<React.SetStateAction<any>>;
}

export const WebRTCCallOverlay: React.FC<WebRTCCallOverlayProps> = ({ 
  callState, 
  setCallState 
}) => {
  const { user } = useAuthStore();
  const { socket } = useSocket();

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [callTimer, setCallTimer] = useState(0);
  
  // Settings toggles
  const [audioMuted, setAudioMuted] = useState(false);
  const [videoMuted, setVideoMuted] = useState(callState.callType === 'voice');
  const [speakerOn, setSpeakerOn] = useState(true);

  // References
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const timerIntervalRef = useRef<any>(null);

  // STUN Servers for ICE candidates configuration
  const iceConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' }
    ]
  };

  useEffect(() => {
    // If incoming or calling, request User Media
    if (callState.status === 'calling') {
      startMediaAndCall();
    } else if (callState.status === 'incoming') {
      // Play a ringing sound or just trigger display
    }

    // Socket calling listener overrides
    if (socket) {
      socket.on('call-accepted', async (data: { signal: any }) => {
        console.log('Call accepted by remote user. Setting description...');
        if (peerConnectionRef.current) {
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.signal));
          setCallState((prev: any) => ({ ...prev, status: 'connected' }));
        }
      });

      socket.on('call-rejected', () => {
        console.log('Call rejected by remote user');
        cleanupCall();
      });

      socket.on('call-ended', () => {
        console.log('Call ended by remote user');
        cleanupCall();
      });

      socket.on('ice-candidate', async (data: { candidate: any }) => {
        if (peerConnectionRef.current && data.candidate) {
          try {
            await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
          } catch (e) {
            console.error('Error adding ICE candidate', e);
          }
        }
      });
    }

    return () => {
      cleanupCall();
      if (socket) {
        socket.off('call-accepted');
        socket.off('call-rejected');
        socket.off('call-ended');
        socket.off('ice-candidate');
      }
    };
  }, [callState.status, socket]);

  // Start call timer when connected
  useEffect(() => {
    if (callState.status === 'connected') {
      timerIntervalRef.current = setInterval(() => {
        setCallTimer((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerIntervalRef.current);
      setCallTimer(0);
    }

    return () => clearInterval(timerIntervalRef.current);
  }, [callState.status]);

  const startMediaAndCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callState.callType === 'video'
      });

      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Initialize RTC Peer Connection
      const pc = new RTCPeerConnection(iceConfiguration);
      peerConnectionRef.current = pc;

      // Add local tracks to Peer Connection
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      // Peer Connection Listeners
      pc.onicecandidate = (event) => {
        if (event.candidate && socket && callState.otherUserId) {
          socket.emit('ice-candidate', {
            to: callState.otherUserId,
            candidate: event.candidate
          });
        }
      };

      pc.ontrack = (event) => {
        console.log('Received remote media track');
        if (event.streams[0]) {
          setRemoteStream(event.streams[0]);
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = event.streams[0];
          }
        }
      };

      // Create Offer SDP
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Signal offer to target user
      if (socket && callState.otherUserId) {
        socket.emit('call-user', {
          userToCall: callState.otherUserId,
          signalData: offer,
          from: user?.id,
          name: user?.fullName || 'Velo User',
          callType: callState.callType,
          chatId: callState.chatId
        });
      }
    } catch (err) {
      console.error('Failed to access user media: ', err);
      alert('Could not access microphone/camera for calling. Ensure permissions are granted.');
      cleanupCall();
    }
  };

  const acceptIncomingCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callState.callType === 'video'
      });

      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const pc = new RTCPeerConnection(iceConfiguration);
      peerConnectionRef.current = pc;

      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      pc.onicecandidate = (event) => {
        if (event.candidate && socket && callState.otherUserId) {
          socket.emit('ice-candidate', {
            to: callState.otherUserId,
            candidate: event.candidate
          });
        }
      };

      pc.ontrack = (event) => {
        console.log('Received remote media track');
        if (event.streams[0]) {
          setRemoteStream(event.streams[0]);
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = event.streams[0];
          }
        }
      };

      // Set remote offer description
      if (callState.incomingSignal) {
        await pc.setRemoteDescription(new RTCSessionDescription(callState.incomingSignal));
        
        // Create Answer SDP
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        // Send answer signal
        if (socket && callState.otherUserId) {
          socket.emit('answer-call', {
            to: callState.otherUserId,
            signal: answer
          });
        }

        setCallState((prev: any) => ({ ...prev, status: 'connected' }));
      }
    } catch (err) {
      console.error('Failed to accept call: ', err);
      rejectIncomingCall();
    }
  };

  const rejectIncomingCall = () => {
    if (socket && callState.otherUserId) {
      socket.emit('reject-call', { to: callState.otherUserId });
    }
    cleanupCall();
  };

  const endConnectedCall = () => {
    if (socket && callState.otherUserId) {
      socket.emit('end-call', { to: callState.otherUserId });
    }
    cleanupCall();
  };

  const cleanupCall = () => {
    // Stop all media stream tracks
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }
    if (remoteStream) {
      remoteStream.getTracks().forEach((track) => track.stop());
    }

    setLocalStream(null);
    setRemoteStream(null);

    // Close Peer Connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    clearInterval(timerIntervalRef.current);

    setCallState({
      status: 'idle',
      chatId: null,
      otherUserId: null,
      otherUserName: '',
      callType: 'voice',
      incomingSignal: null
    });
  };

  // Toggles
  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setAudioMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStream && callState.callType === 'video') {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setVideoMuted(!videoTrack.enabled);
      }
    }
  };

  const formatTimer = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (callState.status === 'idle') return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md text-white select-none">
      
      {/* Container */}
      <div className="relative w-full max-w-[480px] h-full md:h-[680px] md:rounded-3xl bg-[#090a10] border border-gray-800 flex flex-col items-center justify-between p-8 overflow-hidden shadow-2xl">
        
        {/* Decorative elements */}
        <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-indigo-500/10 to-transparent pointer-events-none" />

        {/* Video Canvas Panels */}
        {callState.callType === 'video' && callState.status === 'connected' ? (
          <div className="absolute inset-0 z-0 bg-black">
            {/* Remote video background fill */}
            <video 
              ref={remoteVideoRef} 
              autoPlay 
              playsInline 
              className="w-full h-full object-cover" 
            />
            {/* Local video picture-in-picture float */}
            {!videoMuted && (
              <div className="absolute top-4 right-4 h-36 w-24 overflow-hidden rounded-xl border border-gray-700 bg-gray-900 shadow-md">
                <video 
                  ref={localVideoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  className="w-full h-full object-cover" 
                />
              </div>
            )}
          </div>
        ) : (
          /* Avatar placeholders for Voice or Handshaking */
          <div className="flex-1 flex flex-col items-center justify-center gap-4 z-10 pt-16">
            <div className="h-28 w-28 overflow-hidden rounded-3xl border border-indigo-500/30 bg-indigo-500/10 flex items-center justify-center shadow-lg relative pulse-ring-active">
              <span className="text-3xl font-bold font-sans">{callState.otherUserName.charAt(0)}</span>
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold">{callState.otherUserName}</h3>
              <p className="text-sm text-gray-500 capitalize tracking-wide mt-1">
                {callState.status === 'connected' ? formatTimer(callTimer) : callState.status}
              </p>
            </div>
          </div>
        )}

        {/* Header Title for connected video call overlay */}
        {callState.callType === 'video' && callState.status === 'connected' && (
          <div className="absolute top-6 left-6 z-10">
            <h3 className="text-sm font-bold tracking-wide">{callState.otherUserName}</h3>
            <p className="text-xs text-gray-400 mt-0.5">{formatTimer(callTimer)}</p>
          </div>
        )}

        {/* In Call Overlay Controllers */}
        <div className="w-full flex flex-col items-center gap-6 z-10 pb-4">
          
          {/* Action Row */}
          {callState.status === 'incoming' ? (
            /* Incoming accepts controls */
            <div className="flex items-center gap-6">
              <button
                onClick={rejectIncomingCall}
                className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-600 hover:bg-red-500 hover:shadow-lg hover:shadow-red-600/35 active:scale-95 transition-all cursor-pointer"
                title="Decline"
              >
                <PhoneOff className="h-6 w-6" />
              </button>
              
              <button
                onClick={acceptIncomingCall}
                className="flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-600 hover:bg-emerald-500 hover:shadow-lg hover:shadow-emerald-600/35 active:scale-95 transition-all cursor-pointer animate-pulse"
                title="Accept"
              >
                <PhoneCall className="h-7 w-7" />
              </button>
            </div>
          ) : (
            /* Active call settings toggles */
            <div className="flex flex-col items-center gap-6">
              <div className="flex items-center gap-4 bg-[#12131b]/60 border border-gray-800/40 p-2.5 rounded-2xl backdrop-blur-sm">
                <button
                  onClick={toggleAudio}
                  className={`p-3.5 rounded-xl transition-all cursor-pointer ${
                    audioMuted 
                      ? 'bg-red-500/20 text-red-400' 
                      : 'hover:bg-gray-800 text-gray-400 hover:text-white'
                  }`}
                  title={audioMuted ? 'Unmute' : 'Mute'}
                >
                  {audioMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </button>

                {callState.callType === 'video' && (
                  <button
                    onClick={toggleVideo}
                    className={`p-3.5 rounded-xl transition-all cursor-pointer ${
                      videoMuted 
                        ? 'bg-red-500/20 text-red-400' 
                        : 'hover:bg-gray-800 text-gray-400 hover:text-white'
                    }`}
                    title={videoMuted ? 'Camera On' : 'Camera Off'}
                  >
                    {videoMuted ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
                  </button>
                )}

                <button
                  onClick={() => setSpeakerOn(!speakerOn)}
                  className={`p-3.5 rounded-xl transition-all cursor-pointer ${
                    !speakerOn 
                      ? 'bg-red-500/20 text-red-400' 
                      : 'hover:bg-gray-800 text-gray-400 hover:text-white'
                  }`}
                  title={speakerOn ? 'Mute Speaker' : 'Speaker On'}
                >
                  {speakerOn ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
                </button>
              </div>

              {/* End Call Button */}
              <button
                onClick={endConnectedCall}
                className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-600 hover:bg-red-500 hover:shadow-lg hover:shadow-red-600/35 active:scale-95 transition-all cursor-pointer"
                title="End Call"
              >
                <PhoneOff className="h-6 w-6" />
              </button>
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
export default WebRTCCallOverlay;
