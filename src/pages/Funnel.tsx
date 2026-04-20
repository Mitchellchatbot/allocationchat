import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check, Star, Shield, Clock, Zap, Users, TrendingUp, MessageSquare, ArrowRight, Play, BarChart3, Heart } from 'lucide-react';
import sarahImg from '@/assets/testimonials/sarah.jpg';
import michaelImg from '@/assets/testimonials/michael.jpg';
import jenniferImg from '@/assets/testimonials/jennifer.jpg';
import { SalesChatBotInline } from '@/components/landing/SalesChatBotInline';
import { SalesChatBot } from '@/components/landing/SalesChatBot';
import PerformanceDashboardSection from '@/components/landing/PerformanceDashboardSection';
import careAssistLogo from '@/assets/care-assist-logo.png';
import googleLogo from '@/assets/logos/google-g.svg';
import salesforceLogo from '@/assets/logos/salesforce.svg';
import slackLogo from '@/assets/logos/slack.svg';


const avatars = [sarahImg, michaelImg, jenniferImg];

const benefits = [
  {
    icon: MessageSquare,
    title: 'AI That Sounds Human',
    description: 'Natural typos, pacing, and tone that builds real trust.',
  },
  {
    icon: Clock,
    title: 'Responds in Seconds, 24/7',
    description: 'Never miss a lead. Always online — nights, weekends, holidays.',
  },
  {
    icon: TrendingUp,
    title: 'Captures Leads Automatically',
    description: 'Names, phone numbers, emails, insurance info — extracted mid-chat.',
  },
  {
    icon: Shield,
    title: 'HIPAA-Ready Compliance',
    description: 'Built-in data retention, audit logs, and session controls.',
  },
  {
    icon: Zap,
    title: 'Live in Under 5 Minutes',
    description: 'Paste one line of code. Start converting immediately.',
  },
  {
    icon: Users,
    title: 'Seamless Human Handoff',
    description: 'Escalates to your team instantly with full context.',
  },
];

const stats = [
  { value: '+47%', label: 'More Leads Captured', icon: BarChart3 },
  { value: '<4s', label: 'Avg Response Time', icon: Clock },
  { value: '24/7', label: 'Always Available', icon: Zap },
  { value: '100+', label: 'Treatment Centers', icon: Heart },
];

/* ── Scroll-triggered fade-in observer ── */
const useScrollReveal = () => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const children = el.querySelectorAll('.reveal');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    children.forEach((c) => observer.observe(c));
    return () => observer.disconnect();
  }, []);
  return ref;
};

const Funnel = () => {
  const navigate = useNavigate();
  const scrollRef = useScrollReveal();
  const allowProgrammaticScrollRef = useRef(false);
  const lastUserInputAtRef = useRef(Date.now());
  const trustedScrollYRef = useRef(0);
  const revertingScrollRef = useRef(false);

  useEffect(() => {
    // Start at top on entry
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    trustedScrollYRef.current = 0;

    const origScrollTo = window.scrollTo.bind(window);
    const origScrollBy = window.scrollBy.bind(window);
    const origScrollIntoView = Element.prototype.scrollIntoView;

    const markUserInput = () => {
      lastUserInputAtRef.current = Date.now();
    };

    window.addEventListener('wheel', markUserInput, { passive: true });
    window.addEventListener('touchstart', markUserInput, { passive: true });
    window.addEventListener('touchmove', markUserInput, { passive: true });
    window.addEventListener('pointerdown', markUserInput, { passive: true });
    window.addEventListener('keydown', markUserInput);

    // Block programmatic page scroll unless explicitly whitelisted by this page
    window.scrollTo = ((...args: unknown[]) => {
      if (allowProgrammaticScrollRef.current) {
        (origScrollTo as (...a: unknown[]) => void)(...args);
      }
    }) as typeof window.scrollTo;

    window.scrollBy = ((...args: unknown[]) => {
      if (allowProgrammaticScrollRef.current) {
        (origScrollBy as (...a: unknown[]) => void)(...args);
      }
    }) as typeof window.scrollBy;

    window.scroll = window.scrollTo;

    Element.prototype.scrollIntoView = function (arg?: boolean | ScrollIntoViewOptions) {
      if (allowProgrammaticScrollRef.current) {
        origScrollIntoView.call(this, arg as never);
      }
    };

    // Only block forced jump-to-bottom behavior (do not interfere with normal/manual scroll)
    const onScrollGuard = () => {
      if (revertingScrollRef.current) return;

      const currentY = window.scrollY;
      const previousY = trustedScrollYRef.current;
      const delta = Math.abs(currentY - previousY);
      const sinceInput = Date.now() - lastUserInputAtRef.current;
      const nearBottom = window.innerHeight + currentY >= document.documentElement.scrollHeight - 20;
      const suspiciousBottomJump = currentY > previousY && delta > Math.max(window.innerHeight * 1.2, 700);

      if (!allowProgrammaticScrollRef.current && suspiciousBottomJump && sinceInput > 900 && nearBottom) {
        revertingScrollRef.current = true;
        document.documentElement.scrollTop = previousY;
        document.body.scrollTop = previousY;
        requestAnimationFrame(() => {
          revertingScrollRef.current = false;
        });
        return;
      }

      trustedScrollYRef.current = currentY;
    };

    window.addEventListener('scroll', onScrollGuard, { passive: true });

    return () => {
      window.scrollTo = origScrollTo;
      window.scrollBy = origScrollBy;
      window.scroll = origScrollTo;
      Element.prototype.scrollIntoView = origScrollIntoView;
      window.removeEventListener('scroll', onScrollGuard);
      window.removeEventListener('wheel', markUserInput);
      window.removeEventListener('touchstart', markUserInput);
      window.removeEventListener('touchmove', markUserInput);
      window.removeEventListener('pointerdown', markUserInput);
      window.removeEventListener('keydown', markUserInput);
    };
  }, []);

  const [showStickyFooter, setShowStickyFooter] = useState(false);
  const [showChatBot, setShowChatBot] = useState(false);
  const formClickedRef = useRef(false);
  const formRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLDivElement>(null);
  const handleCTA = () => {
    formClickedRef.current = true;
    setShowChatBot(false);
    const el = document.getElementById('get-started-form');
    if (!el) return;

    allowProgrammaticScrollRef.current = true;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.setTimeout(() => {
      allowProgrammaticScrollRef.current = false;
    }, 900);
  };

  // Show chatbot only after 30s on page AND user hasn't interacted with the form
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!formClickedRef.current) {
        setShowChatBot(true);
      }
    }, 30000);
    return () => clearTimeout(timer);
  }, []);

  // Track form clicks to suppress chatbot
  useEffect(() => {
    const formEl = document.getElementById('get-started-form');
    if (!formEl) return;
    const handleFormClick = () => {
      formClickedRef.current = true;
      setShowChatBot(false);
    };
    formEl.addEventListener('click', handleFormClick);
    return () => formEl.removeEventListener('click', handleFormClick);
  }, []);

  useEffect(() => {
    const onScroll = () => {
      setShowStickyFooter(window.scrollY > 400);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div ref={scrollRef} className="min-h-screen bg-background text-foreground pb-20 md:pb-0">

      {/* ═══════════════ HERO ═══════════════ */}
      <section className="relative px-4 pt-6 pb-6 md:pt-20 md:pb-14 overflow-hidden bg-background">
        {/* Ambient background blobs — subtle */}
        <div className="pointer-events-none absolute -top-24 -left-24 w-[500px] h-[500px] rounded-full bg-primary/[0.06] blur-[120px] animate-[pulse_6s_ease-in-out_infinite]" />
        <div className="pointer-events-none absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full bg-primary/[0.04] blur-[140px] animate-[pulse_8s_ease-in-out_infinite]" style={{ animationDelay: '3s' }} />

        <div className="max-w-3xl mx-auto text-center relative z-10">
          {/* Audience callout */}
          <div className="animate-fade-in mb-4 md:mb-6" style={{ animationDelay: '0.02s', animationFillMode: 'both' }}>
            <p className="text-sm md:text-lg font-extrabold tracking-wide uppercase text-primary">
              For Treatment Center & Behavioral Health Owners
            </p>
          </div>

          {/* Social proof badge */}
          <div className="inline-flex items-center gap-2 bg-muted/60 rounded-full px-4 py-1.5 mb-3 md:mb-6 animate-fade-in" style={{ animationDelay: '0.05s', animationFillMode: 'both' }}>
            <div className="flex gap-0.5">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-3.5 h-3.5 fill-primary text-primary" />
              ))}
            </div>
            <span className="text-xs font-semibold text-foreground">5.0</span>
            <span className="text-xs text-muted-foreground">from 40+ treatment centers</span>
          </div>


          {/* Main headline — dramatic */}
          <div className="animate-fade-in" style={{ animationDelay: '0.4s', animationFillMode: 'both' }}>
            <h1
              style={{
                fontSize: 'clamp(2.6rem, 12vw, 8rem)',
                fontWeight: 900,
                lineHeight: 0.88,
                letterSpacing: '-0.04em',
                textTransform: 'uppercase' as const,
                marginBottom: '1rem',
                background: 'linear-gradient(180deg, hsl(24 100% 50%) 0%, hsl(24 100% 55%) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                filter: 'drop-shadow(0 4px 12px hsl(24 100% 50% / 0.2))',
              }}
            >
              Never Miss<br />Another Lead
            </h1>
          </div>

          {/* Sub-headline */}
          <p className="text-base md:text-2xl mb-5 md:mb-10 animate-fade-in max-w-md mx-auto" style={{ animationDelay: '0.55s', animationFillMode: 'both' }}>
            <span className="font-extrabold text-foreground">Care Assist</span>{' '}
            <span className="text-muted-foreground">captures an additional <span className="font-bold text-primary">35% more leads</span> from your existing website traffic.</span>
          </p>

          {/* CTA Button — visible on mobile load */}
          <div className="relative inline-block mb-4 reveal opacity-0 translate-y-4 transition-all duration-700" style={{ transitionDelay: '0.15s' }}>
            <Button
              onClick={handleCTA}
              size="lg"
              className="relative bg-primary text-primary-foreground hover:bg-primary/90 text-lg md:text-2xl px-10 py-6 md:px-14 md:py-7 rounded-2xl shadow-2xl hover:shadow-primary/40 hover:scale-[1.03] transition-all duration-300 font-extrabold tracking-wide"
            >
              Start For Free
            </Button>
          </div>



          <div className="flex flex-col items-center gap-1.5 mt-4 md:mt-6 reveal opacity-0 transition-all duration-700" style={{ transitionDelay: '0.3s' }}>
            <p className="text-xs md:text-sm font-semibold text-foreground">Free trial · Plans starting at <span className="text-primary">$150/mo</span></p>
            <div className="flex items-center justify-center gap-4 md:gap-5 text-xs md:text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="flex items-center justify-center w-5 h-5 md:w-6 md:h-6 rounded-full bg-primary/15"><Check className="w-3 h-3 md:w-3.5 md:h-3.5 text-primary" /></span> No credit card</span>
              <span className="flex items-center gap-1.5"><span className="flex items-center justify-center w-5 h-5 md:w-6 md:h-6 rounded-full bg-primary/15"><Check className="w-3 h-3 md:w-3.5 md:h-3.5 text-primary" /></span> Cancel anytime</span>
            </div>
          </div>

          {/* VSL Vimeo Embed — below CTA on mobile */}
          <div ref={videoRef} className="relative max-w-2xl mx-auto mt-8 md:mt-10 animate-fade-in" style={{ animationDelay: '0.7s', animationFillMode: 'both' }}>
            <div className="relative rounded-2xl overflow-hidden shadow-xl border-2 bg-black" style={{ borderColor: '#F97116' }}>
              <div className="aspect-video rounded-xl overflow-hidden">
                <iframe
                  src="https://player.vimeo.com/video/1173333979?badge=0&autopause=0&player_id=0&app_id=58479&autoplay=1&muted=0&loop=1"
                  className="w-full h-full"
                  allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media"
                  title="Care Assist — Watch How It Works"
                />
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ═══════════════ STATS ═══════════════ */}
      <section className="px-4 py-8 bg-background">
        <div className="max-w-4xl mx-auto">
          <div className="rounded-3xl bg-card border border-border/60 p-5 md:px-10 md:py-8 shadow-lg">
            <div className="grid grid-cols-4 gap-2 md:gap-6 divide-x divide-border/40">
              {stats.map((stat, i) => (
                <div
                  key={stat.label}
                  className="text-center reveal opacity-0 translate-y-4 transition-all duration-700 flex flex-col items-center"
                  style={{ transitionDelay: `${i * 0.08}s` }}
                >
                  <div className="w-10 h-10 md:w-14 md:h-14 rounded-full border-2 border-primary/20 flex items-center justify-center mb-2 md:mb-3">
                    <stat.icon className="w-4 h-4 md:w-6 md:h-6 text-primary" />
                  </div>
                  <p className="text-xl md:text-4xl font-black tracking-tighter leading-none mb-0.5 md:mb-1 text-primary">
                    {stat.value}
                  </p>
                  <p className="text-[10px] md:text-sm font-medium text-muted-foreground leading-snug">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Social proof line */}
            <div className="border-t border-border/40 mt-5 pt-4 text-center reveal opacity-0 transition-all duration-700" style={{ transitionDelay: '0.3s' }}>
              <p className="text-sm md:text-base text-muted-foreground">
                Clients using Care Assist report <span className="font-bold text-primary">35% more leads</span> and <span className="font-bold text-primary">4 additional VOBs</span> on average per month.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ INTEGRATIONS ═══════════════ */}
      <section className="px-4 py-6 md:py-10 bg-background">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4 reveal opacity-0 transition-all duration-700">Integrates with your tools</p>
          <div className="flex items-center justify-center gap-6 md:gap-10 reveal opacity-0 transition-all duration-700" style={{ transitionDelay: '0.1s' }}>
            <div className="flex items-center gap-2 opacity-70 hover:opacity-100 transition-opacity">
              <img src={googleLogo} alt="Google" className="w-6 h-6 md:w-8 md:h-8" />
              <span className="text-sm md:text-base font-semibold text-muted-foreground">Google</span>
            </div>
            <div className="flex items-center gap-2 opacity-70 hover:opacity-100 transition-opacity">
              <img src={salesforceLogo} alt="Salesforce" className="w-6 h-6 md:w-8 md:h-8" />
              <span className="text-sm md:text-base font-semibold text-muted-foreground">Salesforce</span>
            </div>
            <div className="flex items-center gap-2 opacity-70 hover:opacity-100 transition-opacity">
              <img src={slackLogo} alt="Slack" className="w-6 h-6 md:w-8 md:h-8" />
              <span className="text-sm md:text-base font-semibold text-muted-foreground">Slack</span>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ GET STARTED FORM ═══════════════ */}
      <section className="relative px-4 py-14 md:py-20 overflow-hidden bg-background" ref={formRef} id="get-started-form">
        {/* Background accent */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.03] via-primary/[0.05] to-transparent" />

        <div className="max-w-2xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-full px-5 py-2 mb-5 shadow-lg shadow-primary/25 reveal opacity-0 transition-all duration-700">
            <Zap className="w-4 h-4" />
            <span className="text-xs font-extrabold uppercase tracking-wider">Takes 2 minutes</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black mb-3 tracking-tight reveal opacity-0 translate-y-4 transition-all duration-700" style={{ background: 'linear-gradient(135deg, hsl(24 100% 55%) 0%, hsl(20 100% 48%) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            Get Started For Free
          </h2>
          <p className="text-muted-foreground mb-8 text-sm md:text-base max-w-md mx-auto reveal opacity-0 transition-all duration-700" style={{ transitionDelay: '0.1s' }}>
            Fill out the form below and we'll get your AI agent set up in minutes.
          </p>
          <div className="relative reveal opacity-0 translate-y-4 transition-all duration-700" style={{ transitionDelay: '0.2s' }}>
            <div className="relative w-full rounded-2xl border-2 border-primary/30 shadow-[0_8px_40px_-8px_hsl(24_100%_50%/0.18),0_2px_12px_-2px_hsl(24_100%_50%/0.1)] bg-card overflow-hidden ring-1 ring-primary/10">
              <iframe
                src="https://api.leadconnectorhq.com/widget/survey/VarcMdVarl1QzePQtEih"
                style={{ width: '100%', border: 'none', overflow: 'auto', minHeight: '620px' }}
                scrolling="yes"
                id="VarcMdVarl1QzePQtEih"
                title="Get Started Survey"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ BENEFITS ═══════════════ */}
      <section className="relative px-4 py-14 md:py-20 bg-background overflow-hidden">
        <div className="max-w-4xl mx-auto relative z-10">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 mb-5 reveal opacity-0 transition-all duration-700">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold text-primary uppercase tracking-wider">Why it works</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-3 reveal opacity-0 translate-y-4 transition-all duration-700">
              Turn Every Click Into a <span className="text-primary">Conversation</span>
            </h2>
            <p className="text-muted-foreground max-w-sm mx-auto text-sm reveal opacity-0 transition-all duration-700" style={{ transitionDelay: '0.1s' }}>
              Your forms convert at 2%. Our AI converts at 35%.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 md:gap-5 reveal opacity-0 translate-y-4 transition-all duration-700" style={{ transitionDelay: '0.15s' }}>
            {benefits.slice(0, 4).map((b, i) => (
              <div
                key={i}
                className="bg-card border border-border/60 rounded-2xl p-5 md:p-6 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300"
              >
                <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center mb-3">
                  <b.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-bold text-sm md:text-base mb-1.5 text-foreground">{b.title}</h3>
                <p className="text-muted-foreground text-xs md:text-sm leading-relaxed">{b.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ HOW IT WORKS ═══════════════ */}
      <section className="px-4 py-10 md:py-14 bg-background">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-extrabold mb-6 reveal opacity-0 translate-y-4 transition-all duration-700">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-4 reveal opacity-0 translate-y-4 transition-all duration-700" style={{ transitionDelay: '0.1s' }}>
            {[
              { step: '1', title: 'Paste One Line of Code', desc: 'Add to any site in under 2 minutes.' },
              { step: '2', title: 'AI Engages Visitors', desc: 'Warm conversations that capture leads 24/7.' },
              { step: '3', title: 'Get Warm Leads', desc: 'Instant Slack, email, or Salesforce alerts.' },
            ].map((s) => (
              <div key={s.step} className="flex flex-col items-center gap-2 p-4 bg-background rounded-xl border border-border/50">
                <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center shrink-0 shadow-sm shadow-primary/20">
                  <span className="font-bold text-sm text-primary-foreground">{s.step}</span>
                </div>
                <h3 className="font-bold text-sm">{s.title}</h3>
                <p className="text-muted-foreground text-xs leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ TESTIMONIALS ═══════════════ */}
      <section className="px-4 py-16 md:py-24 bg-background overflow-hidden">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-4xl font-extrabold text-center mb-10 reveal opacity-0 translate-y-4 transition-all duration-700">What Our Clients Say</h2>
          {/* Google Reviews badge */}
          <div className="flex items-center justify-center gap-2 mb-8 reveal opacity-0 transition-all duration-700" style={{ transitionDelay: '0.1s' }}>
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 001 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            <div className="flex items-center gap-0.5">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-3.5 h-3.5 fill-primary text-primary" />
              ))}
            </div>
            <span className="text-xs font-semibold text-muted-foreground">5.0 · Google Reviews</span>
          </div>
          {/* Sliding row */}
          <div className="relative">
            <div className="flex gap-5 animate-[slide_20s_linear_infinite] hover:[animation-play-state:paused]" style={{ width: 'max-content' }}>
              {[
                { name: 'Sarah M.', role: 'Clinical Director', img: sarahImg, quote: 'We went from missing 60% of after-hours inquiries to capturing every single one. CareAssist paid for itself in the first week.' },
                { name: 'Michael R.', role: 'Practice Owner', img: michaelImg, quote: 'The AI sounds so natural that patients don\'t realize they\'re chatting with a bot. Our intake volume doubled within a month.' },
                { name: 'Jennifer L.', role: 'Marketing Director', img: jenniferImg, quote: 'Setup was incredibly fast. We had it running on our site in under 5 minutes and started getting leads the same day.' },
                { name: 'Sarah M.', role: 'Clinical Director', img: sarahImg, quote: 'We went from missing 60% of after-hours inquiries to capturing every single one. CareAssist paid for itself in the first week.' },
                { name: 'Michael R.', role: 'Practice Owner', img: michaelImg, quote: 'The AI sounds so natural that patients don\'t realize they\'re chatting with a bot. Our intake volume doubled within a month.' },
                { name: 'Jennifer L.', role: 'Marketing Director', img: jenniferImg, quote: 'Setup was incredibly fast. We had it running on our site in under 5 minutes and started getting leads the same day.' },
              ].map((t, i) => (
                <div key={i} className="bg-card border border-border rounded-2xl p-6 w-[320px] shrink-0 hover:shadow-lg transition-shadow duration-300">
                  <div className="flex items-center gap-0.5 mb-3">
                    {[...Array(5)].map((_, j) => (
                      <Star key={j} className="w-4 h-4 fill-primary text-primary" />
                    ))}
                  </div>
                  <p className="text-sm text-foreground leading-relaxed mb-4 font-medium">"{t.quote}"</p>
                  <div className="flex items-center gap-3">
                    <img src={t.img} alt={t.name} className="w-9 h-9 rounded-full object-cover border-2 border-primary/20" />
                    <div>
                      <p className="font-bold text-sm">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {/* Fade edges */}
            <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-background to-transparent pointer-events-none" />
            <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-background to-transparent pointer-events-none" />
          </div>
        </div>
      </section>

      {/* ═══════════════ PERFORMANCE DASHBOARD ═══════════════ */}
      <PerformanceDashboardSection />

      {/* ═══════════════ FINAL CTA WITH SALES CHAT ═══════════════ */}
      <section className="relative px-4 py-16 md:py-24 text-center overflow-hidden bg-background">
        <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-primary/[0.05] blur-[120px]" />

        <div className="max-w-4xl mx-auto relative z-10">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 mb-5 reveal opacity-0 transition-all duration-700">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold text-primary uppercase tracking-wider">Limited time offer</span>
          </div>

          <h2 className="text-3xl md:text-5xl font-black mb-4 tracking-tight text-foreground reveal opacity-0 translate-y-4 transition-all duration-700">
            Try It <span className="text-primary">FREE</span> For 7 Days!
          </h2>
          <p className="text-muted-foreground mb-10 text-base md:text-lg max-w-md mx-auto reveal opacity-0 transition-all duration-700" style={{ transitionDelay: '0.1s' }}>
            Every hour without Care Assist is leads walking away. Start converting more visitors today.
          </p>

          <div className="flex flex-col items-center gap-8">
            {/* CTA Button */}
            <div className="reveal opacity-0 translate-y-4 transition-all duration-700" style={{ transitionDelay: '0.2s' }}>
              <div className="relative inline-block">
                <div className="absolute -inset-1 rounded-2xl bg-primary/30 blur-lg animate-[pulse_2.5s_ease-in-out_infinite]" />
                <Button
                  onClick={handleCTA}
                  size="lg"
                  className="relative bg-primary text-primary-foreground hover:bg-primary/90 text-xl px-14 py-7 rounded-2xl shadow-2xl hover:shadow-primary/40 hover:scale-[1.03] transition-all duration-300 font-extrabold"
                >
                  Start For Free <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-center gap-5 text-sm text-muted-foreground reveal opacity-0 transition-all duration-700" style={{ transitionDelay: '0.3s' }}>
              <span className="flex items-center gap-1.5"><span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/15"><Check className="w-3.5 h-3.5 text-primary" /></span> No credit card</span>
              <span className="flex items-center gap-1.5"><span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/15"><Check className="w-3.5 h-3.5 text-primary" /></span> Cancel anytime</span>
            </div>

            {/* Inline chat widget */}
            <div className="w-full max-w-[360px] reveal opacity-0 translate-y-6 transition-all duration-700" style={{ transitionDelay: '0.4s' }}>
              <p className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider mb-3">Or ask our AI anything first</p>
              <div className="relative">
                <div className="absolute -inset-1 rounded-3xl bg-primary/10 blur-lg" />
                <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-primary/10 border border-border">
                  <SalesChatBotInline />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Floating sales chat widget — appears after scrolling past video */}
      {showChatBot && <SalesChatBot />}

      {/* ═══════════════ STICKY FOOTER CTA (mobile) ═══════════════ */}
      <div className={`fixed bottom-0 inset-x-0 z-40 md:hidden transition-all duration-300 ${showStickyFooter ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'}`}>
        <div className="bg-background/95 backdrop-blur-lg border-t border-border/30 px-4 py-2.5 flex justify-center">
          <Button
            onClick={handleCTA}
            className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-8 py-2 text-sm font-bold shadow-md shadow-primary/20"
            size="sm"
          >
            Start For Free
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Funnel;
