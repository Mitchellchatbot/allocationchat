import { useEffect, useRef } from 'react';
import { Video, VideoOff, Mic, MicOff, Phone, PhoneOff, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { VideoCallStatus } from '@/hooks/useVideoChat';

interface VideoCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: VideoCallStatus;
  isMuted: boolean;
  isVideoOff: boolean;
  error: string | null;
  localVideoRef: React.RefObject<HTMLVideoElement>;
  remoteVideoRef: React.RefObject<HTMLVideoElement>;
  onEndCall: () => void;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  participantName?: string;
  isInitiator?: boolean;
  onAccept?: () => void;
  onDecline?: () => void;
}

export const VideoCallModal = ({
  isOpen,
  onClose,
  status,
  isMuted,
  isVideoOff,
  error,
  localVideoRef,
  remoteVideoRef,
  onEndCall,
  onToggleMute,
  onToggleVideo,
  participantName = 'Participant',
  isInitiator = true,
  onAccept,
  onDecline,
}: VideoCallModalProps) => {
  const handleClose = () => {
    if (status === 'connected' || status === 'connecting' || status === 'requesting') {
      onEndCall();
    }
    onClose();
  };

  const isIncoming = status === 'requesting' && !isInitiator;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl w-full p-0 overflow-hidden bg-background/95 backdrop-blur-sm border-border">
        <DialogHeader className="p-4 pb-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Video className="h-5 w-5 text-primary" />
              Video Call
              {status === 'connected' && (
                <span className="text-sm font-normal text-muted-foreground">
                  with {participantName}
                </span>
              )}
            </DialogTitle>
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="relative aspect-video bg-muted/50 m-4 mt-2 rounded-xl overflow-hidden">
          {/* Remote Video (main view) */}
          {status === 'connected' ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              {status === 'requesting' && isInitiator && (
                <>
                  <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
                    <Phone className="h-10 w-10 text-primary" />
                  </div>
                  <p className="text-foreground font-medium">Calling {participantName}...</p>
                  <p className="text-muted-foreground text-sm">Waiting for response</p>
                </>
              )}
              {isIncoming && (
                <>
                  <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
                    <Video className="h-10 w-10 text-primary" />
                  </div>
                  <p className="text-foreground font-medium">{participantName} is calling</p>
                  <div className="flex gap-4 mt-4">
                    <Button
                      variant="destructive"
                      size="lg"
                      onClick={onDecline}
                      className="rounded-full h-14 w-14 p-0"
                    >
                      <PhoneOff className="h-6 w-6" />
                    </Button>
                    <Button
                      size="lg"
                      onClick={onAccept}
                      className="rounded-full h-14 w-14 p-0 bg-green-500 hover:bg-green-600"
                    >
                      <Phone className="h-6 w-6" />
                    </Button>
                  </div>
                </>
              )}
              {status === 'connecting' && (
                <>
                  <Loader2 className="h-10 w-10 text-primary animate-spin" />
                  <p className="text-foreground font-medium">Connecting...</p>
                  <p className="text-muted-foreground text-sm">Setting up video call</p>
                </>
              )}
              {status === 'ended' && (
                <>
                  <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
                    <PhoneOff className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-foreground font-medium">Call ended</p>
                </>
              )}
              {status === 'declined' && (
                <>
                  <div className="h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center">
                    <PhoneOff className="h-8 w-8 text-destructive" />
                  </div>
                  <p className="text-foreground font-medium">Call declined</p>
                </>
              )}
              {status === 'error' && (
                <>
                  <div className="h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center">
                    <X className="h-8 w-8 text-destructive" />
                  </div>
                  <p className="text-foreground font-medium">Call failed</p>
                  <p className="text-destructive text-sm">{error}</p>
                </>
              )}
            </div>
          )}

          {/* Local Video (picture-in-picture) */}
          {(status === 'connected' || status === 'connecting' || (status === 'requesting' && isInitiator)) && (
            <div className="absolute bottom-4 right-4 w-40 aspect-video rounded-lg overflow-hidden shadow-lg border-2 border-background">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={cn(
                  "w-full h-full object-cover",
                  isVideoOff && "hidden"
                )}
              />
              {isVideoOff && (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <VideoOff className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Controls */}
        {status === 'connected' && (
          <div className="flex items-center justify-center gap-4 p-4 pt-0">
            <Button
              variant={isMuted ? "destructive" : "secondary"}
              size="lg"
              onClick={onToggleMute}
              className="rounded-full h-12 w-12 p-0"
            >
              {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </Button>
            <Button
              variant={isVideoOff ? "destructive" : "secondary"}
              size="lg"
              onClick={onToggleVideo}
              className="rounded-full h-12 w-12 p-0"
            >
              {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
            </Button>
            <Button
              variant="destructive"
              size="lg"
              onClick={onEndCall}
              className="rounded-full h-12 w-12 p-0"
            >
              <PhoneOff className="h-5 w-5" />
            </Button>
          </div>
        )}

        {(status === 'requesting' && isInitiator) && (
          <div className="flex items-center justify-center p-4 pt-0">
            <Button
              variant="destructive"
              size="lg"
              onClick={onEndCall}
              className="rounded-full"
            >
              <PhoneOff className="h-5 w-5 mr-2" />
              Cancel Call
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
