import { useState, useRef, useCallback, useEffect } from 'react';

export type VideoCallStatus = 'idle' | 'requesting' | 'connecting' | 'connected' | 'ended' | 'declined' | 'error';

interface UseVideoChatOptions {
  onCallRequest?: () => void;
  onCallAccepted?: () => void;
  onCallEnded?: () => void;
  onCallDeclined?: () => void;
}

export const useVideoChat = (options?: UseVideoChatOptions) => {
  const [status, setStatus] = useState<VideoCallStatus>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

  const cleanupMedia = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
  }, []);

  const startLocalStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch (err) {
      console.error('Failed to get media devices:', err);
      setError('Could not access camera or microphone');
      setStatus('error');
      throw err;
    }
  }, []);

  const createPeerConnection = useCallback(() => {
    const config: RTCConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    };

    const pc = new RTCPeerConnection(config);

    pc.ontrack = (event) => {
      console.log('Remote track received');
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('ICE connection state:', pc.iceConnectionState);
      if (pc.iceConnectionState === 'connected') {
        setStatus('connected');
        options?.onCallAccepted?.();
      } else if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
        endCall();
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  }, [options]);

  const initiateCall = useCallback(async () => {
    try {
      setStatus('requesting');
      setError(null);
      
      const stream = await startLocalStream();
      const pc = createPeerConnection();

      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // In a real app, this would send the offer via WebSocket
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      setStatus('connecting');
      options?.onCallRequest?.();
      
      // Simulate remote answer for demo
      setTimeout(async () => {
        if (peerConnectionRef.current && status !== 'ended') {
          // In real implementation, this would come from signaling server
          setStatus('connected');
          options?.onCallAccepted?.();
        }
      }, 2000);

    } catch (err) {
      console.error('Failed to initiate call:', err);
      setError('Failed to start video call');
      setStatus('error');
    }
  }, [startLocalStream, createPeerConnection, options, status]);

  const acceptCall = useCallback(async () => {
    try {
      setStatus('connecting');
      setError(null);
      
      const stream = await startLocalStream();
      const pc = createPeerConnection();

      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // In real app, would receive offer and send answer via signaling
      setStatus('connected');
      options?.onCallAccepted?.();
    } catch (err) {
      console.error('Failed to accept call:', err);
      setError('Failed to accept video call');
      setStatus('error');
    }
  }, [startLocalStream, createPeerConnection, options]);

  const declineCall = useCallback(() => {
    setStatus('declined');
    options?.onCallDeclined?.();
    cleanupMedia();
  }, [cleanupMedia, options]);

  const endCall = useCallback(() => {
    setStatus('ended');
    options?.onCallEnded?.();
    cleanupMedia();
    // Reset after a moment
    setTimeout(() => {
      setStatus('idle');
    }, 1000);
  }, [cleanupMedia, options]);

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  }, []);

  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  }, []);

  useEffect(() => {
    return () => {
      cleanupMedia();
    };
  }, [cleanupMedia]);

  return {
    status,
    isMuted,
    isVideoOff,
    error,
    localVideoRef,
    remoteVideoRef,
    initiateCall,
    acceptCall,
    declineCall,
    endCall,
    toggleMute,
    toggleVideo,
    setStatus,
  };
};
