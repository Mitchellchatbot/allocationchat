import { Phone, PhoneOff, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface IncomingCallNotificationProps {
  callerName: string;
  onAccept: () => void;
  onDecline: () => void;
  className?: string;
}

export const IncomingCallNotification = ({
  callerName,
  onAccept,
  onDecline,
  className,
}: IncomingCallNotificationProps) => {
  return (
    <div
      className={cn(
        "fixed top-4 right-4 z-50 bg-card border border-border rounded-xl p-4 shadow-lg widget-shadow animate-in slide-in-from-top-4 duration-300",
        className
      )}
    >
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
          <Video className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground">{callerName}</p>
          <p className="text-sm text-muted-foreground">Incoming video call</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="destructive"
            size="icon"
            onClick={onDecline}
            className="rounded-full h-10 w-10"
          >
            <PhoneOff className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            onClick={onAccept}
            className="rounded-full h-10 w-10 bg-green-500 hover:bg-green-600"
          >
            <Phone className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
