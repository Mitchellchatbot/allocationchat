import { useState, useEffect, useRef, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Zap, Shield, ArrowRight, Users, BarChart3, MessageSquare, CheckCircle2, Star, Heart, Clock, Bot, Phone, Brain, Sparkles, AlertTriangle, UserCheck, Smartphone, Settings, Lock, Send, Play, ChevronRight, Menu, X, Mail, Calendar, Hash, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SalesChatBot } from '@/components/landing/SalesChatBot';
import { PricingSection } from '@/components/pricing/PricingSection';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import careAssistLogo from '@/assets/scaled-bot-logo.svg';
import salesforceLogo from '@/assets/logos/salesforce.svg';
import slackLogo from '@/assets/logos/slack.svg';
import googleCalendarLogo from '@/assets/logos/google-calendar.svg';
import gmailLogo from '@/assets/logos/gmail.svg';
import outlookLogo from '@/assets/logos/outlook.png';
import googleGLogo from '@/assets/logos/google-g.svg';
import sarahHeadshot from '@/assets/testimonials/sarah.jpg';
import michaelHeadshot from '@/assets/testimonials/michael.jpg';
import jenniferHeadshot from '@/assets/testimonials/jennifer.jpg';
import emilyAvatar from '@/assets/personas/emily.jpg';

const testimonialHeadshots = [sarahHeadshot, michaelHeadshot, jenniferHeadshot];

const features = [
{
  icon: Shield,
  title: 'Medical-Safe Responses',
  description: 'Tailored for behavioral health. Avoids unsafe responses that could create liability.',
  backInfo: [
  'Compliance-aware response filtering',
  'Avoids diagnoses & medical advice',
  'Custom safety guardrails per facility',
  'Liability-reducing language templates']

},
{
  icon: AlertTriangle,
  title: 'Crisis Detection',
  description: 'Detects crisis keywords, alerts your team, and can direct visitors to SAMHSA\'s National Helpline.',
  backInfo: [
  'Real-time keyword monitoring',
  'Instant Slack & email alerts',
  'Auto-escalation to live agents',
  'SAMHSA helpline redirect option']

},
{
  icon: Brain,
  title: 'Natural Lead Capture',
  description: 'Collects visitor info through natural conversation—name, phone, insurance, and more.',
  backInfo: [
  'No forms — conversational capture',
  'Name, phone, email & insurance',
  'Smart follow-up questions',
  'Auto-populates CRM fields']

},
{
  icon: UserCheck,
  title: 'Qualified Handoffs',
  description: 'Human agents start conversations informed with full context and visitor details.',
  backInfo: [
  'Full chat history transferred',
  'Visitor profile & intent summary',
  'Warm handoff notifications',
  'Priority queue for urgent cases']

},
{
  icon: BarChart3,
  title: 'Conversion Analytics',
  description: 'Track chat-to-lead conversion, drop-off points, and peak inquiry times.',
  backInfo: [
  'Chat-to-lead conversion rates',
  'Peak inquiry time heatmaps',
  'Drop-off point analysis',
  'ROI tracking dashboard']

},
{
  icon: Zap,
  title: 'Salesforce Integration',
  description: 'Export captured leads directly to Salesforce with one click.',
  backInfo: [
  'One-click lead export',
  'Custom field mapping',
  'Auto-export on escalation',
  'Bi-directional sync support']

}];


const testimonials = [
{
  quote: "Response time dropped from 4 hours to 4 seconds. We're capturing leads we used to lose.",
  author: "Sarah M.",
  role: "Admissions Director",
  facility: "Recovery First Center",
  rating: 5,
  timeAgo: "2 weeks ago"
},
{
  quote: "The AI handles after-hours inquiries with real empathy. Families feel heard immediately.",
  author: "Michael R.",
  role: "CEO",
  facility: "Serenity Treatment",
  rating: 5,
  timeAgo: "1 month ago"
},
{
  quote: "Our admissions increased 47% in the first quarter. Game changer for our center.",
  author: "Jennifer L.",
  role: "Marketing Director",
  facility: "New Horizons Recovery",
  rating: 5,
  timeAgo: "3 weeks ago"
}];


const stats = [
{ value: 47, suffix: '%', label: 'More Leads Captured', prefix: '+', icon: BarChart3 },
{ value: 4, suffix: 's', label: 'Avg Response Time', prefix: '<', icon: Clock },
{ value: 24, suffix: '/7', label: 'Always Available', prefix: '', icon: Zap },
{ value: 100, suffix: '+', label: 'Treatment Centers', prefix: '', icon: Heart }];


// Animated counter hook
const useCountUp = (end: number, duration: number = 2000, startOnView: boolean = true) => {
  const [count, setCount] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!startOnView) {
      setHasStarted(true);
    }
  }, [startOnView]);

  useEffect(() => {
    if (startOnView && ref.current) {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting && !hasStarted) {
            setHasStarted(true);
          }
        },
        { threshold: 0.5 }
      );
      observer.observe(ref.current);
      return () => observer.disconnect();
    }
  }, [startOnView, hasStarted]);

  useEffect(() => {
    if (!hasStarted) return;

    let startTime: number;
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(easeOut * end));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [end, duration, hasStarted]);

  return { count, ref };
};

// Typing indicator component
const TypingIndicator = ({ visible }: {visible: boolean;}) => {
  if (!visible) return null;
  return (
    <div className="flex justify-start animate-fade-in">
      <div className="bg-card rounded-2xl rounded-tl-sm shadow-sm border border-border/50 px-4 py-3">
        <div className="flex gap-1.5">
          <span className="h-2 w-2 rounded-full bg-primary/60 typing-dot" />
          <span className="h-2 w-2 rounded-full bg-primary/60 typing-dot" />
          <span className="h-2 w-2 rounded-full bg-primary/60 typing-dot" />
        </div>
      </div>
    </div>);

};

// Animated chat message component with typing
const AnimatedChatMessage = ({ children, delay, isBot }: {children: React.ReactNode;delay: number;isBot: boolean;}) => {
  const [showTyping, setShowTyping] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isBot) {
      const typingTimer = setTimeout(() => setShowTyping(true), (delay - 0.8) * 1000);
      const messageTimer = setTimeout(() => {
        setShowTyping(false);
        setVisible(true);
      }, delay * 1000);
      return () => {
        clearTimeout(typingTimer);
        clearTimeout(messageTimer);
      };
    } else {
      const timer = setTimeout(() => setVisible(true), delay * 1000);
      return () => clearTimeout(timer);
    }
  }, [delay, isBot]);

  if (isBot && showTyping) return <TypingIndicator visible />;
  if (!visible) return null;

  return (
    <div className={`flex ${isBot ? 'justify-start' : 'justify-end'} animate-scale-in`}>
      <div className={`${isBot ?
      'bg-card rounded-2xl rounded-tl-sm shadow-md border border-border/50' :
      'bg-gradient-to-r from-primary to-primary/90 text-primary-foreground rounded-2xl rounded-tr-sm shadow-lg shadow-primary/20'} px-4 py-3 max-w-[85%] transform transition-all duration-300 hover:scale-[1.02]`
      }>
        <p className={`text-sm font-medium ${isBot ? 'text-foreground' : ''}`}>{children}</p>
      </div>
    </div>);

};

// Flip card component for features
const FlipCard = ({ feature }: {feature: typeof features[number];}) => {
  const Icon = feature.icon;

  return (
    <div
      className="group cursor-pointer [perspective:1000px] h-[180px] sm:h-[200px]">

      <div
        className="relative w-full h-full transition-transform duration-500 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)]">

        {/* Front */}
        <div className="absolute inset-0 [backface-visibility:hidden] bg-card rounded-2xl border border-border/40 hover:border-primary/20 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 overflow-hidden">
          <div className="p-5 md:p-6 h-full flex flex-col justify-center">
            <div className="flex items-start gap-4 sm:flex-col sm:items-start md:flex-row md:items-start">
              <div className="h-11 w-11 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:shadow-md transition-all duration-300">
                <Icon className="h-5 w-5 text-primary group-hover:text-primary-foreground transition-colors duration-300" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-bold text-foreground mb-1">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <span className="text-[11px] text-muted-foreground/60 font-medium">Hover to learn more →</span>
            </div>
          </div>
        </div>

        {/* Back */}
        <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] bg-gradient-to-br from-primary to-primary/85 rounded-2xl border border-primary/30 shadow-lg shadow-primary/10 overflow-hidden">
          <div className="p-5 md:p-6 h-full flex flex-col justify-center text-primary-foreground">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="h-9 w-9 shrink-0 rounded-lg bg-primary-foreground/20 flex items-center justify-center">
                <Icon className="h-4 w-4 text-primary-foreground" />
              </div>
              <h3 className="text-base font-bold">{feature.title}</h3>
            </div>
            <ul className="space-y-2">
              {feature.backInfo.map((info, i) =>
              <li key={i} className="flex items-start gap-2 text-sm text-primary-foreground/90">
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{info}</span>
                </li>
              )}
            </ul>
            <div className="mt-3 flex justify-end">
              <span className="text-[11px] text-primary-foreground/60 font-medium">← Move away to go back</span>
            </div>
          </div>
        </div>
      </div>
    </div>);

};


const StatCounter = ({ value, suffix, label, prefix, icon: Icon }: {value: number;suffix: string;label: string;prefix: string;icon: React.ElementType;}) => {
  const { count, ref } = useCountUp(value, 2000);

  return (
    <div ref={ref} className="group relative flex flex-col items-center text-center px-6 py-8 md:py-10">
      <div className="mb-5 h-14 w-14 rounded-2xl bg-primary/8 flex items-center justify-center ring-1 ring-primary/10 shadow-sm group-hover:bg-primary/12 group-hover:ring-primary/20 group-hover:shadow-md group-hover:scale-105 transition-all duration-500 ease-out">
        <Icon className="h-6 w-6 text-primary/80 group-hover:text-primary transition-colors duration-500" />
      </div>
      <div className="text-4xl md:text-5xl lg:text-[3.5rem] font-black text-primary tracking-tighter leading-none">
        {prefix}{count}{suffix}
      </div>
      <div className="text-sm md:text-[15px] text-muted-foreground mt-3 font-medium tracking-normal">
        {label}
      </div>
    </div>);

};

// Floating orb component
const FloatingOrb = ({ className, delay = 0 }: {className: string;delay?: number;}) =>
<div
  className={`absolute rounded-full blur-3xl animate-float pointer-events-none ${className}`}
  style={{ animationDelay: `${delay}s` }} />;

// Float-in on scroll component
const FloatIn = ({ children, direction = 'left', delay = 0, className = '' }: {
  children: ReactNode;
  direction?: 'left' | 'right' | 'up';
  delay?: number;
  className?: string;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const animClass = direction === 'left' ? 'animate-float-in-left' : direction === 'right' ? 'animate-float-in-right' : 'animate-float-in-up';

  return (
    <div
      ref={ref}
      className={cn(
        visible ? animClass : 'opacity-0',
        className
      )}
      style={visible ? { animationDelay: `${delay}s`, animationFillMode: 'both' } : undefined}
    >
      {children}
    </div>
  );
};



const navSections = [
{ id: 'features', label: 'Features' },
{ id: 'integrations', label: 'Integrations' },
{ id: 'testimonials', label: 'Testimonials' },
{ id: 'pricing', label: 'Pricing' },
{ id: 'resources', label: 'Resources', href: '/documentation' },
{ id: 'contact', label: 'Contact' }];


const Index = () => {
  const { user, isAdmin, isAgent, signOut } = useAuth();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const allowProgrammaticScrollRef = useRef(false);
  const trustedScrollYRef = useRef(0);
  const lastUserInputAtRef = useRef(Date.now());
  const isPointerDownRef = useRef(false);
  const revertingScrollRef = useRef(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Prevent third-party embeds from forcing jump-to-bottom scrolls
  useEffect(() => {
    const markUserInput = () => {
      lastUserInputAtRef.current = Date.now();
    };

    const onPointerDown = () => {
      markUserInput();
      isPointerDownRef.current = true;
    };

    const onPointerUp = () => {
      isPointerDownRef.current = false;
    };

    const blockIframeScroll = (e: MessageEvent) => {
      if (
        (typeof e.data === 'string' && /scroll/i.test(e.data)) ||
        (e.data && typeof e.data === 'object' && /scroll/i.test(`${String((e.data as { type?: unknown }).type ?? '')}${String((e.data as { action?: unknown }).action ?? '')}`))
      ) {
        e.stopImmediatePropagation();
      }
    };

    const onScrollGuard = () => {
      if (revertingScrollRef.current) return;

      const currentY = window.scrollY;
      const delta = Math.abs(currentY - trustedScrollYRef.current);
      const sinceInput = Date.now() - lastUserInputAtRef.current;
      const suspiciousBottomJump =
        currentY > trustedScrollYRef.current && delta > Math.max(window.innerHeight * 1.2, 700);
      const likelyUserDriven =
        allowProgrammaticScrollRef.current ||
        isPointerDownRef.current ||
        sinceInput < 1200;

      if (!likelyUserDriven && suspiciousBottomJump) {
        revertingScrollRef.current = true;
        document.documentElement.scrollTop = trustedScrollYRef.current;
        document.body.scrollTop = trustedScrollYRef.current;
        requestAnimationFrame(() => {
          revertingScrollRef.current = false;
        });
        return;
      }

      trustedScrollYRef.current = currentY;
    };

    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    window.addEventListener('wheel', markUserInput, { passive: true });
    window.addEventListener('touchstart', markUserInput, { passive: true });
    window.addEventListener('touchmove', markUserInput, { passive: true });
    window.addEventListener('keydown', markUserInput);
    window.addEventListener('message', blockIframeScroll, true);
    window.addEventListener('scroll', onScrollGuard, { passive: true });

    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      window.removeEventListener('wheel', markUserInput);
      window.removeEventListener('touchstart', markUserInput);
      window.removeEventListener('touchmove', markUserInput);
      window.removeEventListener('keydown', markUserInput);
      window.removeEventListener('message', blockIframeScroll, true);
      window.removeEventListener('scroll', onScrollGuard);
    };
  }, []);

  // Track which section is in view
  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    navSections.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (!el) return;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveSection(id);
        },
        { rootMargin: '-40% 0px -40% 0px', threshold: 0 }
      );
      observer.observe(el);
      observers.push(observer);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, []);

  const scrollTo = (id: string) => {
    const target = document.getElementById(id);
    if (!target) return;

    allowProgrammaticScrollRef.current = true;
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.setTimeout(() => {
      allowProgrammaticScrollRef.current = false;
    }, 900);
  };

  const getDashboardRoute = () => {
    if (isAgent) return '/conversations';
    if (isAdmin) return '/admin';
    return '/dashboard';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Animated gradient background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden hidden md:block">
        <FloatingOrb className="w-[600px] h-[600px] bg-primary/10 top-[-200px] right-[-200px]" delay={0} />
        <FloatingOrb className="w-[500px] h-[500px] bg-primary/8 bottom-[10%] left-[-150px]" delay={2} />
        <FloatingOrb className="w-[400px] h-[400px] bg-primary/5 top-[40%] right-[10%]" delay={4} />
        <FloatingOrb className="w-[300px] h-[300px] bg-accent/15 bottom-[-100px] right-[30%]" delay={1} />
      </div>
      
      {/* Subtle grid overlay */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.15)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.15)_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />
      
      {/* Mouse follow gradient - desktop only */}
      <div
        className="fixed w-[600px] h-[600px] rounded-full bg-primary/3 blur-3xl pointer-events-none transition-all duration-1000 ease-out hidden md:block"
        style={{
          left: mousePosition.x - 300,
          top: mousePosition.y - 300,
          opacity: 0.5
        }} />

      
      {/* Navigation */}
      <nav className="relative bg-background/95 backdrop-blur-2xl sticky top-0 z-50 border-b border-border/40 shadow-[0_1px_12px_-2px_hsl(var(--foreground)/0.06)]">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex h-16 md:h-[72px] items-center justify-between">
            <div className="flex items-center gap-0">
              <div className="h-16 md:h-[72px] w-32 md:w-36 px-1 flex items-center justify-center rounded-md bg-background overflow-hidden">
                <img src={careAssistLogo} alt="Care Assist" className="h-full w-auto max-h-full object-contain scale-150" />
              </div>
              
            </div>
            
            {/* Center Navigation Links - Desktop */}
            <div className="hidden md:flex items-center">
              <div className="flex items-center gap-0.5 bg-muted/60 rounded-full px-1.5 py-1 shadow-[inset_0_1px_4px_-1px_hsl(var(--foreground)/0.08)]">
                {navSections.map((section) =>
                  section.href ? (
                    <Link key={section.id} to={section.href}>
                      <button className="px-3.5 py-1.5 text-sm font-medium rounded-full transition-colors text-muted-foreground hover:text-foreground hover:bg-background/80">
                        {section.label}
                      </button>
                    </Link>
                  ) : (
                    <button
                      key={section.id}
                      onClick={() => scrollTo(section.id)}
                      className={cn(
                        "px-3.5 py-1.5 text-sm font-medium rounded-full transition-colors",
                        activeSection === section.id
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground hover:bg-background/80"
                      )}
                    >
                      {section.label}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Right Auth Actions */}
            <div className="flex items-center gap-2 md:gap-3">
              {user ?
              <>
                  <Link to={getDashboardRoute()} className="hidden sm:block">
                    <Button variant="ghost" className="font-medium text-foreground h-9">Dashboard</Button>
                  </Link>
                  <Button variant="outline" onClick={signOut} className="font-medium rounded-full px-5 text-sm h-9">
                    Sign Out
                  </Button>
                </> :

              <>
                  <Link to="/auth" className="hidden sm:block">
                    <Button variant="ghost" className="font-semibold text-foreground/80 hover:text-foreground h-9">Login</Button>
                  </Link>
                  <Link to="/auth">
                    <Button className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-md hover:shadow-lg font-semibold px-5 md:px-6 rounded-full h-9 md:h-10 text-sm group transition-all duration-200">
                      <span className="hidden sm:inline">Start Free</span>
                      <span className="sm:hidden">Start</span>
                      <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
                    </Button>
                  </Link>
                </>
              }
              
              {/* Mobile Menu Toggle */}
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden h-9 w-9"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>

                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>
          
          {/* Mobile Navigation Dropdown */}
          {mobileMenuOpen &&
          <div className="lg:hidden border-t border-border/30 py-3 animate-fade-in">
              <div className="flex flex-col gap-1">
                {navSections.map((section) =>
              section.href ?
              <Link key={section.id} to={section.href}>
                      <Button
                  variant="ghost"
                  className="justify-start font-semibold h-11 rounded-xl w-full text-muted-foreground hover:text-foreground"
                  onClick={() => setMobileMenuOpen(false)}>

                        {section.label}
                      </Button>
                    </Link> :

              <Button
                key={section.id}
                variant="ghost"
                className={cn(
                  "justify-start font-semibold h-11 rounded-xl transition-all",
                  activeSection === section.id ?
                  "bg-primary/10 text-primary" :
                  "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => {
                  scrollTo(section.id);
                  setMobileMenuOpen(false);
                }}>

                      {section.label}
                    </Button>

              )}
                {user &&
              <Link to={getDashboardRoute()} className="sm:hidden">
                    <Button variant="ghost" className="justify-start font-semibold h-11 rounded-xl w-full text-muted-foreground hover:text-foreground">
                      Dashboard
                    </Button>
                  </Link>
              }
                {!user &&
              <Link to="/auth" className="sm:hidden">
                    <Button variant="ghost" className="justify-start font-semibold h-11 rounded-xl w-full text-muted-foreground hover:text-foreground">
                      Login
                    </Button>
                  </Link>
              }
              </div>
            </div>
          }
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-12 pb-16 md:pt-20 md:pb-32 lg:pt-28 lg:pb-40 overflow-hidden">
        <div className="container mx-auto px-4 relative">
          {/* Announcement Banner */}
          <div className="flex justify-center mb-6 md:mb-10">
            <div className="inline-flex items-center gap-2 md:gap-3 bg-primary/5 border border-primary/15 rounded-full pl-2 pr-3 md:pr-5 py-1.5 text-xs md:text-sm font-medium text-foreground hover:scale-105 transition-transform cursor-pointer group">
              <span className="bg-primary text-primary-foreground text-xs font-bold px-2.5 md:px-3 py-1 rounded-full">
                NEW
              </span>
              <span className="text-muted-foreground group-hover:text-foreground transition-colors">
                Never miss a lead again — even at 2 AM
              </span>
              <ChevronRight className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>
          
          <div className="grid lg:grid-cols-2 gap-10 md:gap-16 lg:gap-24 items-center">
            <FloatIn direction="left">
            <div className="text-center lg:text-left">
              <h1 className="text-5xl md:text-6xl lg:text-8xl font-black leading-[1.05] tracking-tighter">
                <span className="text-foreground">
                  Never lose
                </span>
                <br />
                <span className="text-primary drop-shadow-[0_2px_12px_hsl(var(--primary)/0.3)]">
                  another lead.
                </span>
              </h1>
              
              <p className="mt-5 md:mt-8 text-lg md:text-xl lg:text-2xl text-muted-foreground leading-relaxed max-w-xl mx-auto lg:mx-0 font-light">
                AI chat that engages visitors <span className="text-primary font-bold">24/7</span>, captures leads naturally, and alerts your team—staying{' '}
                <span className="relative inline-block">
                  <span className="text-primary font-bold">compliant</span>
                  <span className="absolute -bottom-1 left-0 right-0 h-[3px] bg-primary/30 rounded-full" />
                </span>.
              </p>
              
              {/* Benefit Pills */}
              <div className="mt-8 flex flex-wrap gap-3 justify-center lg:justify-start">
                {[
                { icon: Clock, text: '< 5 sec response' },
                { icon: Shield, text: 'Compliant' },
                { icon: Brain, text: 'AI-powered' }].
                map((pill, i) =>
                <div
                  key={i}
                  className="inline-flex items-center gap-2 bg-card/80 border border-border/50 rounded-full px-4 py-2 text-sm font-medium text-foreground shadow-sm hover:shadow-md hover:border-primary/30 transition-all">

                    <pill.icon className="h-4 w-4 text-primary" />
                    {pill.text}
                  </div>
                )}
              </div>

              {/* CTA Buttons */}
              <div className="mt-8 md:mt-10 flex flex-col sm:flex-row gap-3 md:gap-4 justify-center lg:justify-start animate-fade-in" style={{ animationDelay: '0.15s' }}>
                <Link to="/auth" className="w-full sm:w-auto">
                  <Button size="lg" className="bg-gradient-to-r from-primary via-primary to-orange-500 text-primary-foreground hover:opacity-90 shadow-2xl shadow-primary/30 gap-2 px-6 md:px-8 h-12 md:h-14 text-base md:text-lg font-bold rounded-2xl w-full sm:w-auto group transition-all duration-300 hover:shadow-3xl hover:shadow-primary/40 hover:-translate-y-1">
                    Start for Free
                    <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Link to="/demo" className="w-full sm:w-auto">
                  <Button size="lg" variant="outline" className="gap-2 px-6 md:px-8 h-12 md:h-14 text-base md:text-lg font-bold rounded-2xl border-2 border-border hover:border-primary/50 hover:bg-primary/5 w-full sm:w-auto group transition-all duration-300 backdrop-blur-sm">
                    <Play className="h-5 w-5 group-hover:scale-110 transition-transform text-primary" />
                    Try Live Demo
                  </Button>
                </Link>
              </div>
              
              <div className="mt-5 md:mt-6 flex flex-wrap items-center gap-2.5 md:gap-3 justify-center lg:justify-start animate-fade-in" style={{ animationDelay: '0.25s' }}>
                {['Free 7-day trial', 'No credit card', '5 min setup'].map((text, i) =>
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 bg-primary/[0.07] text-primary border border-primary/15 rounded-full px-3.5 py-1.5 text-xs md:text-sm font-semibold shadow-sm">

                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {text}
                  </span>
                )}
              </div>
            </div>
            </FloatIn>
            <FloatIn direction="right" delay={0.15}>
            <div className="relative hidden lg:block">
              {/* Floating badges */}
              <div className="absolute -top-6 left-4 lg:-left-8 bg-card/95 backdrop-blur-xl rounded-2xl px-4 py-3 shadow-2xl border border-green-500/30 z-20 animate-bounce-slow">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse shadow-lg shadow-green-500/50" />
                  <span className="text-sm font-bold text-green-600">Lead Captured!</span>
                </div>
              </div>
              
              <div className="absolute -bottom-4 left-8 lg:-left-4 bg-card/95 backdrop-blur-xl rounded-2xl px-4 py-3 shadow-2xl border border-primary/30 z-20 animate-fade-in" style={{ animationDelay: '2s' }}>
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary animate-pulse" />
                  <span className="text-sm font-bold text-foreground">Avg. <span className="text-primary">4 sec</span> response</span>
                </div>
              </div>
              
              <div className="absolute top-1/3 -right-4 lg:-right-12 bg-gradient-to-r from-primary/20 to-primary/10 backdrop-blur-xl rounded-2xl px-3 py-2 shadow-xl border border-primary/30 z-20 animate-fade-in hidden md:block" style={{ animationDelay: '3s' }}>
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                  <span className="text-xs font-bold text-primary">AI Powered</span>
                </div>
              </div>

              {/* Main chat mockup */}
              <div className="relative bg-card/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-border/50 overflow-hidden max-w-md mx-auto lg:mx-0 transform hover:scale-[1.02] transition-all duration-500 group">
                {/* Glow effect */}
                <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-transparent to-primary/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <div className="relative">
                  {/* Chat Header */}
                  <div className="bg-gradient-to-r from-primary via-primary to-orange-500 px-5 py-4 flex items-center justify-between relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                    
                    <div className="flex items-center gap-3 relative">
                      <div className="h-12 w-12 rounded-full ring-2 ring-white/30 shadow-lg overflow-hidden">
                        <img src={emilyAvatar} alt="Care Assist" className="h-full w-full object-cover" />
                      </div>
                      <div>
                        <p className="text-white font-bold text-base">Care Assist</p>
                        <div className="flex items-center gap-1.5">
                          <span className="h-2.5 w-2.5 rounded-full bg-green-400 animate-pulse shadow-lg shadow-green-400/50" />
                          <p className="text-white/90 text-xs font-medium">Online • Responds instantly</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Chat Messages */}
                  <div className="p-5 space-y-4 bg-gradient-to-b from-muted/10 via-muted/20 to-muted/30 min-h-[360px]">
                    <AnimatedChatMessage delay={0.5} isBot>
                      Hi! I'm here to help. Are you looking for treatment options for yourself or a loved one?
                    </AnimatedChatMessage>
                    
                    <AnimatedChatMessage delay={2.5} isBot={false}>
                      For my brother. He's struggling with addiction.
                    </AnimatedChatMessage>
                    
                    <AnimatedChatMessage delay={4.5} isBot>
                      I'm so glad you reached out. That takes courage. We have programs that can help. What's the best number to reach you?
                    </AnimatedChatMessage>
                    
                    <AnimatedChatMessage delay={6.5} isBot={false}>
                      555-123-4567
                    </AnimatedChatMessage>
                    
                    <AnimatedChatMessage delay={8.5} isBot>
                      <span className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500 animate-pulse" />
                        <span>Got it! Someone from our team will call you shortly.</span>
                      </span>
                    </AnimatedChatMessage>
                  </div>
                  
                  {/* Chat Input */}
                  <div className="p-4 border-t border-border/50 bg-card/50 backdrop-blur-sm">
                    <div className="flex items-center gap-3 bg-muted/50 rounded-xl px-4 py-3.5 border border-border/50 group-hover:border-primary/30 transition-colors">
                      <span className="text-sm text-muted-foreground flex-1 font-medium">Type a message...</span>
                      <div className="h-9 w-9 rounded-lg bg-gradient-to-r from-primary to-orange-500 flex items-center justify-center shadow-md shadow-primary/30">
                        <Send className="h-4 w-4 text-white" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Background decorations */}
              <div className="absolute -z-10 -top-20 -left-20 w-72 h-72 bg-primary/25 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
              <div className="absolute -z-10 -bottom-20 -right-20 w-80 h-80 bg-orange-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '5s', animationDelay: '1s' }} />
            </div>
            </FloatIn>
          </div>
        </div>
      </section>

      {/* Animated Stats Section */}
      <section className="relative py-12 md:py-20 overflow-hidden">
        <div className="container mx-auto px-4 relative">
          <FloatIn direction="up">
          <div className="text-center mb-10 md:mb-14">
            <h2 className="text-2xl md:text-4xl font-extrabold text-foreground tracking-tight">
              Trusted by treatment centers <span className="text-primary">nationwide</span>
            </h2>
          </div>
          </FloatIn>
          <div className="max-w-5xl mx-auto bg-gradient-to-br from-card/80 via-card/60 to-primary/[0.03] backdrop-blur-sm rounded-3xl border border-border/30 shadow-[0_2px_40px_-12px_hsl(var(--primary)/0.08)] p-2 md:p-4">
            <div className="grid grid-cols-2 md:grid-cols-4">
              {stats.map((stat, index) =>
              <div key={index} className={cn(
                "relative",
                index < 2 && "border-b border-border/20 md:border-b-0",
                index % 2 === 0 && "border-r border-border/20 md:border-r",
                index === 1 && "md:border-r md:border-border/20",
                index === 2 && "md:border-r md:border-border/20 border-r-0"
              )}>
                  <StatCounter {...stat} />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof / Testimonials */}
      <section id="testimonials" className="relative py-16 md:py-24 overflow-hidden">
        <div className="container mx-auto px-4">
          <FloatIn direction="up">
          <div className="text-center mb-10 md:mb-16">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-bold mb-4 md:mb-6 border border-primary/20">
              <Star className="h-3.5 w-3.5 md:h-4 md:w-4 fill-primary" />
              Trusted by 100+ Treatment Centers
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-6xl font-black text-foreground mb-4 tracking-tight">
              Real Results from
              <span className="bg-gradient-to-r from-primary to-orange-500 bg-clip-text text-transparent"> Real Centers</span>
            </h2>
          </div>
          </FloatIn>
          
          <div className="relative max-w-6xl mx-auto overflow-hidden">
            {/* Fade edges */}
            <div className="absolute left-0 top-0 bottom-0 w-16 md:w-24 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-16 md:w-24 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
            
            <div className="flex gap-4 md:gap-6 lg:gap-8 animate-slide-testimonials">
              {[...testimonials, ...testimonials, ...testimonials, ...testimonials].map((testimonial, index) =>
              <div
                key={index}
                className="group relative bg-card p-6 md:p-8 rounded-2xl md:rounded-3xl border border-border/50 hover:border-primary/30 transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 flex-shrink-0 w-[320px] md:w-[380px]">

                  {/* Glow on hover */}
                  <div className="absolute -inset-px bg-gradient-to-r from-primary/20 to-orange-500/20 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl" />
                  
                  <div className="relative">
                    {/* Google Review header */}
                    <div className="flex items-center justify-between mb-4">
                      <img src={googleGLogo} alt="Google" className="h-6 w-6" />
                      <span className="text-xs text-muted-foreground">{testimonial.timeAgo}</span>
                    </div>

                    {/* Stars */}
                    <div className="flex gap-0.5 mb-4">
                      {[...Array(testimonial.rating)].map((_, i) =>
                    <Star key={i} className="h-4 w-4 text-[#FBBC04] fill-[#FBBC04]" />
                    )}
                    </div>

                    {/* Quote */}
                    <p className="text-foreground text-base leading-relaxed mb-6 font-medium">"{testimonial.quote}"</p>

                    {/* Author with headshot */}
                    <div className="flex items-center gap-3 pt-5 border-t border-border/50">
                      <img
                      src={testimonialHeadshots[index % testimonials.length]}
                      alt={testimonial.author}
                      className="h-12 w-12 rounded-full object-cover ring-2 ring-border/50" />

                      <div>
                        <p className="font-bold text-foreground">{testimonial.author}</p>
                        <p className="text-xs text-muted-foreground">{testimonial.role}, {testimonial.facility}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="relative py-16 md:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/30 to-background" />
        
        <div className="container mx-auto px-4 relative">
          <FloatIn direction="left">
          <div className="text-center mb-10 md:mb-16">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-bold mb-4 md:mb-6 border border-primary/20">
              <Sparkles className="h-3.5 w-3.5 md:h-4 md:w-4" />
              Purpose-Built Features
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-6xl font-black text-foreground mb-4 tracking-tight">
              Built for
              <span className="bg-gradient-to-r from-primary to-orange-500 bg-clip-text text-transparent"> Behavioral Health</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Every feature designed with treatment centers in mind.
            </p>
          </div>
          </FloatIn>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-5 max-w-6xl mx-auto">
            {features.map((feature) =>
            <FlipCard key={feature.title} feature={feature} />
            )}
          </div>
        </div>
      </section>

      {/* Integrations Section */}
      <section id="integrations" className="relative py-16 md:py-24 overflow-hidden">
        <div className="container mx-auto px-4 relative">
          <FloatIn direction="right">
          <div className="text-center mb-10 md:mb-16">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-bold mb-4 md:mb-6 border border-primary/20">
              <Settings className="h-3.5 w-3.5 md:h-4 md:w-4" />
              Seamless Integrations
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-6xl font-black text-foreground mb-4 tracking-tight">
              Never Miss a
              <span className="bg-gradient-to-r from-primary to-orange-500 bg-clip-text text-transparent"> Lead Again</span>
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Every lead is instantly pushed to the tools your team already uses—so no opportunity slips through the cracks.
            </p>
          </div>
          </FloatIn>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5 max-w-6xl mx-auto">
            {/* Salesforce */}
            <div className="group relative bg-card rounded-2xl md:rounded-3xl border border-border/40 hover:border-primary/20 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#00A1E0] to-[#1798c1] opacity-60 group-hover:opacity-100 transition-opacity" />
              <div className="p-5 md:p-7">
                <div className="h-14 w-14 rounded-2xl bg-[#00A1E0]/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <img src={salesforceLogo} alt="Salesforce" className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">Salesforce</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  Export captured leads directly into Salesforce with one click. Full contact details, conversation history, and GCLID tracking included.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-xs font-semibold bg-muted/60 text-muted-foreground px-2.5 py-1 rounded-full">One-click export</span>
                  <span className="text-xs font-semibold bg-muted/60 text-muted-foreground px-2.5 py-1 rounded-full">GCLID tracking</span>
                </div>
              </div>
            </div>

            {/* Slack */}
            <div className="group relative bg-card rounded-2xl md:rounded-3xl border border-border/40 hover:border-primary/20 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#4A154B] to-[#611f69] opacity-60 group-hover:opacity-100 transition-opacity" />
              <div className="p-5 md:p-7">
                <div className="h-14 w-14 rounded-2xl bg-[#4A154B]/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <img src={slackLogo} alt="Slack" className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">Slack</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  Instant Slack alerts the second a new lead comes in or the AI escalates to your team. Stay in the loop 24/7.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-xs font-semibold bg-muted/60 text-muted-foreground px-2.5 py-1 rounded-full">Instant alerts</span>
                  <span className="text-xs font-semibold bg-muted/60 text-muted-foreground px-2.5 py-1 rounded-full">Escalations</span>
                </div>
              </div>
            </div>

            {/* Google Calendar */}
            <div className="group relative bg-card rounded-2xl md:rounded-3xl border border-border/40 hover:border-primary/20 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#4285F4] to-[#34A853] opacity-60 group-hover:opacity-100 transition-opacity" />
              <div className="p-5 md:p-7">
                <div className="h-14 w-14 rounded-2xl bg-[#4285F4]/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <img src={googleCalendarLogo} alt="Google Calendar" className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">Calendar</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  Visitors book consultations directly in chat. No back-and-forth—just automatic scheduling.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-xs font-semibold bg-muted/60 text-muted-foreground px-2.5 py-1 rounded-full">Auto-booking</span>
                  <span className="text-xs font-semibold bg-muted/60 text-muted-foreground px-2.5 py-1 rounded-full">Reminders</span>
                </div>
              </div>
            </div>

            {/* Email */}
            <div className="group relative bg-card rounded-2xl md:rounded-3xl border border-border/40 hover:border-primary/20 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-orange-500 opacity-60 group-hover:opacity-100 transition-opacity" />
              <div className="p-5 md:p-7">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <img src={gmailLogo} alt="Gmail" className="h-7 w-7" />
                  </div>
                  <div className="h-14 w-14 rounded-2xl bg-[#0078D4]/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <img src={outlookLogo} alt="Outlook" className="h-7 w-7" />
                  </div>
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">Email</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  Lead summaries and conversation transcripts delivered straight to your inbox—Gmail, Outlook, or any provider.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-xs font-semibold bg-muted/60 text-muted-foreground px-2.5 py-1 rounded-full">Lead alerts</span>
                  <span className="text-xs font-semibold bg-muted/60 text-muted-foreground px-2.5 py-1 rounded-full">Summaries</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative py-16 md:py-24 overflow-hidden">
        <div className="container mx-auto px-4">
          <FloatIn direction="up">
          <div className="text-center mb-10 md:mb-16">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-bold mb-4 md:mb-6 border border-primary/20">
              <Zap className="h-3.5 w-3.5 md:h-4 md:w-4" />
              Why Care Assist?
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-6xl font-black text-foreground mb-4 tracking-tight">
              From Missed Calls to
              <span className="bg-gradient-to-r from-primary to-orange-500 bg-clip-text text-transparent"> Instant Care</span>
            </h2>
          </div>
          </FloatIn>
          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-2 gap-5 md:gap-8 lg:gap-12 items-stretch">
              <FloatIn direction="left">
              <div className="relative group">
                <div className="absolute -inset-3 bg-gradient-to-br from-red-500/8 to-red-500/3 rounded-3xl blur-2xl opacity-80 group-hover:opacity-100 transition-opacity" />
                <div className="relative h-full bg-card rounded-2xl md:rounded-3xl p-7 md:p-10 border border-red-200/60 shadow-lg hover:shadow-xl transition-shadow duration-300">
                  <div className="inline-flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-full text-sm font-bold mb-6 border border-red-100">
                    <Clock className="h-4 w-4" />
                    The Problem
                  </div>
                  <h3 className="text-2xl md:text-3xl lg:text-4xl font-black text-foreground mb-5 md:mb-7 tracking-tight leading-tight">
                    Every Minute Matters
                  </h3>
                  <div className="space-y-5 text-base md:text-lg text-muted-foreground leading-relaxed">
                    <p>
                      <span className="text-foreground font-bold">78% of treatment inquiries</span> happen outside business hours.
                    </p>
                    <p>
                      Average response time:{' '}
                      <span className="text-red-500 font-black text-xl md:text-2xl">4+ hours</span>
                    </p>
                    <p className="text-muted-foreground/90 italic">
                      By then, the moment of motivation has passed.
                    </p>
                  </div>
                </div>
              </div>
              </FloatIn>
              
              <FloatIn direction="right" delay={0.15}>
              <div className="relative group">
                <div className="absolute -inset-3 bg-gradient-to-br from-green-500/8 to-green-500/3 rounded-3xl blur-2xl opacity-80 group-hover:opacity-100 transition-opacity" />
                <div className="relative h-full bg-card rounded-2xl md:rounded-3xl p-7 md:p-10 border border-green-200/60 shadow-lg hover:shadow-xl transition-shadow duration-300">
                  <div className="inline-flex items-center gap-2 bg-green-50 text-green-600 px-4 py-2 rounded-full text-sm font-bold mb-6 border border-green-100">
                    <Heart className="h-4 w-4" />
                    The Solution
                  </div>
                  <h3 className="text-2xl md:text-3xl lg:text-4xl font-black text-foreground mb-5 md:mb-7 tracking-tight leading-tight">
                    Instant, Empathetic Response
                  </h3>
                  <div className="space-y-5 text-base md:text-lg text-muted-foreground leading-relaxed">
                    <p>
                      Care Assist responds in{' '}
                      <span className="text-green-500 font-black text-xl md:text-2xl">under 5 seconds</span>
                    </p>
                    <p>
                      Trained on <span className="text-foreground font-bold">thousands of behavioral health conversations</span>
                    </p>
                    <p className="text-muted-foreground/90 italic">
                      Genuine empathy, every time.
                    </p>
                  </div>
                </div>
              </div>
              </FloatIn>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="relative py-16 md:py-32 overflow-hidden">
        <div className="container mx-auto px-4 relative">
          <FloatIn direction="up">
          <div className="text-center mb-10 md:mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-6xl font-black text-foreground mb-4 tracking-tight">
              Simple,
              <span className="bg-gradient-to-r from-primary to-orange-500 bg-clip-text text-transparent"> Transparent Pricing</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Start with a 7-day free trial. No credit card required.
            </p>
          </div>
          </FloatIn>
          <PricingSection showComparison={true} ctaPath="/auth" />
        </div>
      </section>

      {/* Contact & Scheduling Section */}
      <section id="contact" className="relative py-16 md:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/30 to-muted/50" />
        
        <div className="container mx-auto px-4 relative">
          <div className="text-center mb-10 md:mb-14">
            <h2 className="text-3xl md:text-4xl lg:text-6xl font-black text-foreground mb-4 tracking-tight">
              Let's Get
              <span className="bg-gradient-to-r from-primary to-orange-500 bg-clip-text text-transparent"> Started</span>
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Book a strategy call — we'll get back to you within 24 hours.
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            {/* Calendly Embed */}
            <div className="relative bg-card rounded-2xl md:rounded-3xl border border-border/50 shadow-lg overflow-hidden">
              <div className="p-6 md:p-8 border-b border-border/40">
                <h3 className="text-xl md:text-2xl font-black text-foreground">Book a Strategy Call</h3>
                <p className="text-sm text-muted-foreground mt-1">Schedule a free intro or demo call</p>
              </div>
              <div className="w-full" style={{ minHeight: 500 }}>
                <iframe
                  src="https://calendly.com/care-assist-support/support-call-clone?hide_gdpr_banner=1"
                  title="Schedule a call with Care Assist"
                  width="100%"
                  height="500"
                  frameBorder="0"
                  className="border-0"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-border/50 py-12 bg-muted/30 backdrop-blur-sm">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
                <MessageSquare className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-bold text-lg text-foreground">Care Assist</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2026 Care Assist. Helping treatment centers help more people.
            </p>
            <div className="flex gap-6 text-sm">
              <Link to="/privacy" className="text-muted-foreground hover:text-foreground transition-colors font-medium">Privacy</Link>
              <Link to="/terms" className="text-muted-foreground hover:text-foreground transition-colors font-medium">Terms</Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Sales & Support Chat */}
      <SalesChatBot />
    </div>);

};

export default Index;