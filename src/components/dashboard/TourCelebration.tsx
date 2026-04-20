import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { Button } from '@/components/ui/button';
import { Sparkles, Rocket, ArrowRight } from 'lucide-react';

interface TourCelebrationProps {
  open: boolean;
  onClose: () => void;
}

export const TourCelebration = ({ open, onClose }: TourCelebrationProps) => {
  const [visible, setVisible] = useState(false);
  const firedRef = useRef(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (open && !firedRef.current) {
      firedRef.current = true;
      setVisible(true);

      // Fire confetti bursts
      const duration = 3000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.7 },
          colors: ['#f97316', '#fb923c', '#fdba74', '#fff7ed', '#ea580c'],
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.7 },
          colors: ['#f97316', '#fb923c', '#fdba74', '#fff7ed', '#ea580c'],
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };

      // Big initial burst
      confetti({
        particleCount: 100,
        spread: 100,
        origin: { y: 0.5 },
        colors: ['#f97316', '#fb923c', '#fdba74', '#fff7ed', '#ea580c', '#fbbf24', '#f59e0b'],
      });

      setTimeout(frame, 300);
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      firedRef.current = false;
      setVisible(false);
    }
  }, [open]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* Card */}
      <div className="relative z-10 max-w-lg w-full mx-4 animate-in zoom-in-95 fade-in duration-500">
        <div className="rounded-2xl border border-primary/20 bg-background shadow-2xl shadow-primary/10 overflow-hidden">
          {/* Top glow bar */}
          <div className="h-1.5 bg-gradient-to-r from-primary/60 via-primary to-primary/60" />

          <div className="p-8 text-center space-y-6">
            {/* Icon cluster */}
            <div className="flex justify-center">
              <div className="relative">
                <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                  <Rocket className="h-10 w-10 text-primary animate-bounce" />
                </div>
                <div className="absolute -top-1 -right-1 h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
              </div>
            </div>

            {/* Heading */}
            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tight text-foreground">
                You're All Set! 🎉
              </h2>
              <p className="text-lg text-primary font-medium">
                Ready to make the world a better place
              </p>
            </div>

            {/* Message */}
            <p className="text-muted-foreground leading-relaxed max-w-sm mx-auto">
              Your dashboard is fully configured. Start connecting with visitors,
              capture leads, and let your AI agents handle the rest.
            </p>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className="rounded-xl border border-border/50 bg-muted/30 p-3">
                <p className="text-2xl font-bold text-foreground">AI</p>
                <p className="text-xs text-muted-foreground mt-1">Agents Ready</p>
              </div>
              <div className="rounded-xl border border-border/50 bg-muted/30 p-3">
                <p className="text-2xl font-bold text-foreground">24/7</p>
                <p className="text-xs text-muted-foreground mt-1">Coverage</p>
              </div>
              <div className="rounded-xl border border-border/50 bg-muted/30 p-3">
                <p className="text-2xl font-bold text-foreground">∞</p>
                <p className="text-xs text-muted-foreground mt-1">Potential</p>
              </div>
            </div>

            {/* CTA */}
            <div>
              <Button
                onClick={() => {
                  onClose();
                  navigate('/dashboard/subscription');
                }}
                size="lg"
                className="w-full text-base font-semibold gap-2 group bg-gradient-to-r from-primary to-orange-500 text-primary-foreground hover:opacity-90 shadow-lg shadow-primary/25"
              >
                Start 7-Day Free Trial
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
