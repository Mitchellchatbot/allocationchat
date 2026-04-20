import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, User, Phone, Shield, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChatWidget } from '@/components/widget/ChatWidget';
import { cn } from '@/lib/utils';
import careAssistLogo from '@/assets/scaled-bot-logo.svg';
import agentAvatar from '@/assets/personas/care-assist-agent.jpg';

const DEMO_SCRIPT = [
  "Hey! My name is Sarah, I need help for my son, he has been struggling from Alcohol addiction.",
  "Yes please... 555-123-4567 and he has insurance through his employer Blue Cross Blue Shield.",
];

const SCRIPTED_AGENT_REPLIES = [
  "I am glad you reached out, could you please provide best number to reach at and insurance provider?",
  "Thanks, got your number and insurance information. One of our team members will be in touch shortly to help you out.",
];

interface Annotation {
  icon: React.ReactNode;
  label: string;
  detail: string;
  color: string;
  triggerIndex: number;
}

const ANNOTATIONS: Annotation[] = [
  { icon: <User className="h-3.5 w-3.5" />,        label: "Name Captured",        detail: "Sarah",                  color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", triggerIndex: 0 },
  { icon: <CheckCircle2 className="h-3.5 w-3.5" />, label: "Situation Identified", detail: "Alcohol · Family member", color: "bg-blue-500/10 text-blue-600 border-blue-500/20",           triggerIndex: 0 },
  { icon: <Phone className="h-3.5 w-3.5" />,        label: "Phone Collected",       detail: "555-123-4567",           color: "bg-amber-500/10 text-amber-600 border-amber-500/20",         triggerIndex: 1 },
  { icon: <Shield className="h-3.5 w-3.5" />,       label: "Insurance Verified",    detail: "BCBS · Employer",        color: "bg-purple-500/10 text-purple-600 border-purple-500/20",      triggerIndex: 1 },
];

const DemoInsurance = () => {
  const [mode, setMode] = useState<'demo' | 'interactive'>('demo');
  const [widgetKey, setWidgetKey] = useState(0);
  const [visibleAnnotations, setVisibleAnnotations] = useState<number[]>([]);

  const handleScriptMessageSent = useCallback((index: number) => {
    const toReveal = ANNOTATIONS
      .map((a, i) => ({ ...a, i }))
      .filter(a => a.triggerIndex === index)
      .map(a => a.i);
    if (toReveal.length) {
      setVisibleAnnotations(prev => [...new Set([...prev, ...toReveal])]);
    }
  }, []);

  const handleStartOwnChat = () => {
    setMode('interactive');
    setWidgetKey(prev => prev + 1);
    setVisibleAnnotations([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      {/* Nav */}
      <nav className="bg-background/90 backdrop-blur-xl sticky top-0 z-[60] border-b border-border/50">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex h-16 items-center justify-between">
            <Link to="/demo" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm font-medium">Back to Demo</span>
            </Link>
            <div className="flex items-center gap-2">
              <img src={careAssistLogo} alt="Care Assist" className="h-8 w-8 rounded-lg object-contain" />
              <span className="font-bold text-lg text-foreground">Insurance Collection Demo</span>
            </div>
            <Link to="/auth">
              <Button className="bg-primary text-primary-foreground rounded-full px-5 h-9 text-sm font-semibold group">
                Start Free <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 md:py-12">
        {/* Header */}
        <div className="text-center mb-8 md:mb-10">
          <Badge variant="secondary" className="mb-3 text-xs font-medium px-3 py-1">
            Live Demo · Lead Capture Flow
          </Badge>
          <h1 className="text-3xl md:text-5xl font-black text-foreground tracking-tight mb-4">
            Watch <span className="text-primary">Every Detail</span> Get Captured
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            See how Care Assist naturally collects name, phone, insurance, and situation details — all within a single empathetic conversation.
          </p>
        </div>

        {/* Main content: annotations + widget */}
        <div className="flex flex-col lg:flex-row items-start justify-center gap-8 max-w-5xl mx-auto">
          {/* Left: Annotations */}
          <div className="w-full lg:w-64 flex lg:flex-col flex-wrap gap-3 order-2 lg:order-1 lg:pt-12">
            {ANNOTATIONS.map((a, i) => (
              <div
                key={i}
                className={cn(
                  "flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border text-sm font-medium transition-all duration-500",
                  a.color,
                  visibleAnnotations.includes(i)
                    ? "opacity-100 translate-x-0"
                    : "opacity-0 -translate-x-4 pointer-events-none"
                )}
              >
                {a.icon}
                <div className="min-w-0">
                  <div className="font-semibold text-xs">{a.label}</div>
                  <div className="text-[11px] opacity-70 truncate">{a.detail}</div>
                </div>
              </div>
            ))}

            {mode === 'demo' && visibleAnnotations.length === ANNOTATIONS.length && (
              <div className="mt-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <Badge className="bg-primary text-primary-foreground border-0 text-xs px-3 py-1">
                  ✓ Full lead captured in under 2 min
                </Badge>
              </div>
            )}
          </div>

          {/* Center: Widget */}
          <div className="relative order-1 lg:order-2 w-full max-w-[480px] mx-auto">
            <div className="bg-card rounded-3xl border border-border/50 shadow-2xl overflow-hidden" style={{ height: 620 }}>
              <ChatWidget
                key={widgetKey}
                propertyId="demo"
                isPreview={true}
                autoOpen={true}
                fillContainer={true}
                greeting="Hi there! 👋 I'm so glad you reached out. Before we get started, can I get your first name?"
                agentName="Emily"
                agentAvatar={agentAvatar}
                autoPlayScript={mode === 'demo' ? DEMO_SCRIPT : undefined}
                scriptedAgentReplies={mode === 'demo' ? SCRIPTED_AGENT_REPLIES : undefined}
                autoPlaySpeed={2.5}
                demoOverlay={mode === 'demo'}
                onScriptMessageSent={mode === 'demo' ? handleScriptMessageSent : undefined}
                onStartOwnChat={handleStartOwnChat}
              />
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-12 md:mt-16">
          <p className="text-muted-foreground mb-4">
            Ready to capture insurance & lead info automatically?
          </p>
          <Link to="/auth">
            <Button size="lg" className="bg-primary text-primary-foreground rounded-2xl px-8 h-13 text-base font-bold shadow-lg shadow-primary/20 group">
              Start 7-Day Free Trial
              <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default DemoInsurance;
