import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Bell, Phone, ArrowRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import gsap from 'gsap';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';

gsap.registerPlugin(MotionPathPlugin);

const STORAGE_KEY = 'ca_announced_google_chat_v3';

const features = [
  { icon: <MessageSquare className="h-4 w-4" />, label: 'New conversation started' },
  { icon: <Phone className="h-4 w-4" />, label: 'Visitor shares their phone number' },
  { icon: <Bell className="h-4 w-4" />, label: 'Visitor submits insurance info' },
];

// 10 planes — all from bottom-left to top-right, narrow arcs, varied trajectories
const PLANES = [
  { id: 'p0', delay: 0.4,  duration: 4.8, opacity: 0.90, d: 'M -40,760 C 180,640 600,240 1060, 10' },
  { id: 'p1', delay: 0.9,  duration: 5.2, opacity: 0.70, d: 'M -40,700 C 150,560 580,180 1060, 60' },
  { id: 'p2', delay: 1.3,  duration: 4.4, opacity: 0.85, d: 'M  30,790 C 220,660 680,260 1060,-20' },
  { id: 'p3', delay: 1.8,  duration: 5.6, opacity: 0.60, d: 'M -40,640 C 120,500 500,200 1060,100' },
  { id: 'p4', delay: 2.2,  duration: 4.2, opacity: 0.80, d: 'M  60,770 C 280,620 720,210 1060, 30' },
  { id: 'p5', delay: 2.7,  duration: 5.0, opacity: 0.65, d: 'M -40,800 C 100,680 480,310 1060, 80' },
  { id: 'p6', delay: 3.1,  duration: 4.6, opacity: 0.90, d: 'M  10,750 C 240,590 700,170 1060,-10' },
  { id: 'p7', delay: 3.6,  duration: 5.4, opacity: 0.55, d: 'M -40,680 C 160,520 540,160 1060, 50' },
  { id: 'p8', delay: 4.0,  duration: 4.0, opacity: 0.75, d: 'M  80,780 C 300,640 760,230 1060, 20' },
  { id: 'p9', delay: 4.5,  duration: 5.8, opacity: 0.60, d: 'M -40,720 C 130,570 520,220 1060, 90' },
];

const Plane = () => (
  <>
    <polygon points="0,-22 38,0 0,10"  fill="#F97316" />
    <polygon points="0,-22 -25,13 0,4" fill="#F97316" opacity={0.45} />
    <line x1="0" y1="10" x2="-18" y2="10" stroke="#F97316" strokeWidth="2" opacity={0.3} />
  </>
);

export const FeatureAnnouncementModal = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);
  const planeRefs = useRef<(SVGGElement | null)[]>([]);
  const ctxRef = useRef<gsap.Context | null>(null);

  useEffect(() => {
    if (!user) return;
    const key = `${STORAGE_KEY}_${user.id}`;
    if (localStorage.getItem(key)) return;
    const t = setTimeout(() => {
      setVisible(true);
      requestAnimationFrame(() => setAnimateIn(true));
    }, 800);
    return () => clearTimeout(t);
  }, [user]);

  useEffect(() => {
    if (!animateIn) return;

    ctxRef.current = gsap.context(() => {
      PLANES.forEach((plane, i) => {
        const el = planeRefs.current[i];
        if (!el) return;
        gsap.set(el, { opacity: 0 });
        gsap.to(el, {
          opacity: plane.opacity,
          duration: 0.01,
          delay: plane.delay,
          onComplete: () => {
            gsap.to(el, {
              motionPath: {
                path: `#${plane.id}`,
                align: `#${plane.id}`,
                alignOrigin: [0.5, 0.5],
                autoRotate: true,
              },
              duration: plane.duration,
              ease: 'power1.inOut',
              onComplete: () => gsap.to(el, { opacity: 0, duration: 0.6 }),
            });
          },
        });
      });
    });

    return () => ctxRef.current?.revert();
  }, [animateIn]);

  const dismiss = () => {
    ctxRef.current?.revert();
    setAnimateIn(false);
    setTimeout(() => setVisible(false), 350);
    if (user) localStorage.setItem(`${STORAGE_KEY}_${user.id}`, '1');
  };

  const handleSetUp = () => {
    ctxRef.current?.revert();
    setAnimateIn(false);
    setTimeout(() => setVisible(false), 350);
    if (user) localStorage.setItem(`${STORAGE_KEY}_${user.id}`, '1');
    navigate('/dashboard/notifications?tab=google-chat');
  };

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        background: animateIn ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0)',
        transition: 'background 0.3s ease',
        backdropFilter: animateIn ? 'blur(2px)' : 'none',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) dismiss(); }}
    >
      {/* Planes — full-screen, behind card */}
      <svg
        viewBox="0 0 1000 800"
        preserveAspectRatio="xMidYMid slice"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          overflow: 'visible',
        }}
      >
        {PLANES.map((p) => (
          <path key={p.id} id={p.id} d={p.d} fill="none" stroke="none" />
        ))}
        {PLANES.map((p, i) => (
          <g key={p.id} ref={(el) => { planeRefs.current[i] = el; }} style={{ opacity: 0 }}>
            <Plane />
          </g>
        ))}
      </svg>

      {/* Card */}
      <div
        style={{
          transform: animateIn ? 'translateY(0) scale(1)' : 'translateY(40px) scale(0.97)',
          opacity: animateIn ? 1 : 0,
          transition: 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s ease',
          maxWidth: 440,
          width: '100%',
          position: 'relative',
          zIndex: 1,
        }}
        className="bg-white rounded-2xl shadow-2xl overflow-hidden"
      >
        <button
          onClick={dismiss}
          className="absolute top-3 right-3 z-10 p-1.5 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div
          style={{ background: 'linear-gradient(135deg, #F97316 0%, #ea580c 100%)' }}
          className="px-6 pt-8 pb-6 text-white"
        >
          <div
            className="mb-4 flex items-center justify-center"
            style={{ animation: animateIn ? 'gcBounce 0.6s ease 0.5s both' : 'none' }}
          >
            <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                <path
                  d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
                  stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                />
              </svg>
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-60" />
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-white" />
              </span>
            </div>
          </div>

          <div className="text-center">
            <div className="inline-flex items-center gap-1.5 bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full mb-3">
              <span>✨</span> New integration
            </div>
            <h2 className="text-xl font-bold leading-tight">Google Chat Notifications</h2>
            <p className="text-white/80 text-sm mt-1.5 leading-relaxed">
              Get real-time alerts in your Google Chat space when visitors need your attention.
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Get notified when…
          </p>
          <ul className="space-y-2.5 mb-5">
            {features.map((f, i) => (
              <li
                key={i}
                className="flex items-center gap-3 text-sm text-gray-700"
                style={{
                  opacity: animateIn ? 1 : 0,
                  transform: animateIn ? 'translateX(0)' : 'translateX(-10px)',
                  transition: `opacity 0.3s ease ${0.3 + i * 0.09}s, transform 0.3s ease ${0.3 + i * 0.09}s`,
                }}
              >
                <span className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full bg-orange-50 text-orange-500">
                  {f.icon}
                </span>
                {f.label}
              </li>
            ))}
          </ul>

          <Button
            onClick={handleSetUp}
            className="w-full gap-2 font-semibold"
            style={{ background: 'linear-gradient(135deg, #F97316 0%, #ea580c 100%)', border: 'none' }}
          >
            Set up Google Chat
            <ArrowRight className="h-4 w-4" />
          </Button>

          <button
            onClick={dismiss}
            className="w-full mt-2.5 text-sm text-muted-foreground hover:text-gray-700 transition-colors py-1"
          >
            Maybe later
          </button>
        </div>
      </div>

      <style>{`
        @keyframes gcBounce {
          0%   { transform: scale(0.5); opacity: 0; }
          60%  { transform: scale(1.15); }
          80%  { transform: scale(0.95); }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
};
