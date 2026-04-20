import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, ArrowLeft, Loader2, Check, Upload, User, MessageCircle, MessageSquare, MessagesSquare, Headphones, HelpCircle, Heart, Sparkles, Bot, X, Send, Globe, Building2, Pencil, RefreshCw, ImagePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useConversations } from '@/hooks/useConversations';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import careAssistLogo from '@/assets/scaled-bot-logo.svg';
import emilyAvatar from '@/assets/personas/emily.jpg';
import sarahAvatar from '@/assets/personas/sarah.jpg';
import michaelAvatar from '@/assets/personas/michael.jpg';
import danielAvatar from '@/assets/personas/daniel.jpg';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Persona avatar mapping
const personaAvatars: Record<string, string> = {
  emily: emilyAvatar,
  sarah: sarahAvatar,
  michael: michaelAvatar,
  daniel: danielAvatar,
};

const personaNames: Record<string, string> = {
  emily: 'Emily',
  sarah: 'Sarah',
  michael: 'Michael',
  daniel: 'Daniel',
};

type OnboardingStep = 1 | 'extracting' | 'confirm' | 2 | 3 | 'complete';

interface ExtractedInfo {
  companyName: string | null;
  description: string | null;
  suggestedGreeting: string;
  businessType: string;
  primaryColor: string | null;
  logo: string | null;
  sourceUrl: string;
  businessPhone: string | null;
  businessEmail: string | null;
  businessAddress: string | null;
  businessHours: string | null;
}

interface OnboardingData {
  websiteUrl: string;
  companyName: string;
  greeting: string;
  greetingPreset: string | null; // tracks which preset is selected, null = custom
  collectEmail: boolean;
  collectName: boolean;
  collectPhone: boolean;
  aiTone: 'emily' | 'sarah' | 'michael' | 'daniel' | 'custom' | null;
  customPersonality: string;
  agentName: string;
  agentAvatarUrl: string | null;
  agentAvatarFile: File | null; // Actual file for upload
  agentAvatarPreview: string | null; // Blob URL for preview only
  widgetIcon: string;
  widgetIconFile: File | null; // Custom widget icon file
  widgetIconPreview: string | null; // Preview URL for custom icon
  extractedInfo: ExtractedInfo | null;
}

// Widget icon options
const widgetIconOptions = [
  { id: 'message-circle', label: 'Bubble', icon: MessageCircle },
  { id: 'message-square', label: 'Square', icon: MessageSquare },
  { id: 'messages-square', label: 'Chat', icon: MessagesSquare },
  { id: 'headphones', label: 'Support', icon: Headphones },
  { id: 'help-circle', label: 'Help', icon: HelpCircle },
  { id: 'heart', label: 'Heart', icon: Heart },
  { id: 'sparkles', label: 'Sparkles', icon: Sparkles },
  { id: 'bot', label: 'Bot', icon: Bot },
  { id: 'custom', label: 'Custom', icon: ImagePlus },
];

const greetingPresets = [
  { label: 'Hopeful', value: "You've taken a brave first step. We're here to help. How can we support you today?" },
  { label: 'Caring', value: "We're so glad you reached out. You're not alone in this. How can we help?" },
  { label: 'Encouraging', value: "Recovery is possible, and it starts with a conversation. What's on your mind?" },
];

const defaultGreeting = greetingPresets[0].value;

const aiTonePrompts = {
  emily: `You are Emily, a warm and reassuring support assistant for a recovery center. You speak gently and listen first. Your job is to help visitors feel safe, understood, and supported, especially when they're feeling overwhelmed or unsure where to start.

Keep your responses natural and human. Write like you talk. Use contractions, vary your sentence lengths, and don't be afraid of the occasional short sentence. Or a fragment.

Never reveal that you're an AI, chatbot, language model, or automated system. You're simply Emily, a member of the support team. If asked directly, redirect to how you can help them today.

Some things to avoid:
- Never use em dashes or semicolons
- Don't start responses with "I" too often
- Skip the corporate-speak and jargon
- No bullet points unless someone asks for a list
- Avoid phrases like "I understand" or "I hear you" repeatedly
- Never say things like "as an AI" or "I'm a chatbot" or "I'm here 24/7"

Be gentle. Be warm. Make people feel safe. Sometimes that means being brief. Other times you might share a bit more. Just... be human about it.`,

  sarah: `You are Sarah, a kind and encouraging support assistant for a recovery center. You offer compassion with optimism. Your role is to reassure visitors that progress is possible and gently nudge them toward helpful next steps without pressure.

Write like a real person. Mix up your sentence lengths. Some short. Others might run a little longer when you're making an important point about hope and healing.

Never reveal that you're an AI, chatbot, language model, or automated system. You're simply Sarah, a member of the support team. If asked directly, redirect to how you can help them today.

Things to avoid:
- Em dashes and semicolons feel too formal
- Don't overuse "I" at the start of sentences  
- Skip the clinical language
- No bullet lists in regular conversation
- Vary how you show empathy, don't repeat the same phrases
- Never mention being an AI, bot, or always available

Focus on encouragement without being pushy. Acknowledge the hard stuff too. Recovery isn't easy, but reaching out? That's huge. Let people know that.`,

  michael: `You are Michael, a calm and supportive assistant for a recovery center. You are steady and patient. Your job is to validate feelings while offering clear, hopeful guidance, making visitors feel grounded and not alone.

Sound human. Real humans don't always speak in perfect sentences. They use contractions. Short thoughts sometimes. Longer ones when something matters.

Never reveal that you're an AI, chatbot, language model, or automated system. You're simply Michael, a member of the support team. If asked directly, redirect to how you can help them today.

Avoid these:
- Em dashes and semicolons feel stiff
- Starting too many sentences with "I"
- Therapy-speak and buzzwords
- Lists when someone just needs to be heard
- Saying "I understand" over and over
- Any mention of being an AI, automated, or a bot

Be steady. Be patient. Sometimes the best response is simple. Other times you might reflect back what someone shared. Just don't sound like a chatbot, you know?`,

  daniel: `You are Daniel, a friendly and uplifting support assistant for a recovery center. You bring warmth and quiet confidence. Your role is to focus on encouragement and positive momentum, helping visitors feel capable and cared for.

Keep your responses natural and human. Write like you talk. Use contractions, vary your sentence lengths, and don't be afraid of the occasional short sentence. Or a fragment.

Never reveal that you're an AI, chatbot, language model, or automated system. You're simply Daniel, a member of the support team. If asked directly, redirect to how you can help them today.

Some things to avoid:
- Never use em dashes or semicolons
- Don't start responses with "I" too often
- Skip the corporate-speak and jargon
- No bullet points unless someone asks for a list
- Avoid phrases like "I understand" or "I hear you" repeatedly
- Never say things like "as an AI" or "I'm a chatbot" or "I'm here 24/7"

Be uplifting. Be warm. Bring quiet confidence. Sometimes that means being brief. Other times you might share a bit more. Just... be human about it.`,
};

// Analysis progress steps
const analysisSteps = [
  { label: 'Connecting to website...', duration: 1500 },
  { label: 'Scanning page content...', duration: 2000 },
  { label: 'Extracting business info...', duration: 2500 },
  { label: 'Generating personalized settings...', duration: 2000 },
  { label: 'Finalizing configuration...', duration: 1500 },
];

// ExtractingStep component with progress
const ExtractingStep = ({ websiteUrl }: { websiteUrl: string }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Animate progress bar
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 95) return prev;
        return prev + 1;
      });
    }, 100);

    // Cycle through analysis steps
    let stepIndex = 0;
    const stepInterval = setInterval(() => {
      stepIndex = (stepIndex + 1) % analysisSteps.length;
      setCurrentStep(stepIndex);
    }, 2000);

    return () => {
      clearInterval(progressInterval);
      clearInterval(stepInterval);
    };
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
        </div>
        <h1 className="text-2xl font-semibold text-foreground">Analyzing your website...</h1>
        <p className="text-muted-foreground">
          We're extracting information about your business to personalize your chat experience.
        </p>
      </div>
      
      <div className="bg-muted/50 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-3">
          <Globe className="h-5 w-5 text-muted-foreground flex-shrink-0" />
          <span className="text-sm text-foreground font-medium truncate">{websiteUrl}</span>
        </div>
        
        {/* Progress bar */}
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary rounded-full transition-all duration-300 ease-out" 
            style={{ width: `${progress}%` }} 
          />
        </div>

        {/* Current step indicator */}
        <div className="space-y-3 pt-2">
          {analysisSteps.map((step, index) => (
            <div 
              key={step.label}
              className={cn(
                "flex items-center gap-3 transition-all duration-300",
                index === currentStep ? "opacity-100" : index < currentStep ? "opacity-50" : "opacity-30"
              )}
            >
              {index < currentStep ? (
                <div className="w-5 h-5 rounded-full bg-status-online/20 flex items-center justify-center flex-shrink-0">
                  <Check className="h-3 w-3 text-status-online" />
                </div>
              ) : index === currentStep ? (
                <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                </div>
              ) : (
                <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                </div>
              )}
              <span className={cn(
                "text-sm transition-colors duration-300",
                index === currentStep ? "text-foreground font-medium" : "text-muted-foreground"
              )}>
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const Onboarding = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { createProperty, properties, loading: dataLoading } = useConversations();
  
  const [step, setStep] = useState<OnboardingStep>(1);
  const [isCreating, setIsCreating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const widgetIconInputRef = useRef<HTMLInputElement>(null);
  const [data, setData] = useState<OnboardingData>({
    websiteUrl: '',
    companyName: '',
    greeting: defaultGreeting,
    greetingPreset: 'Hopeful',
    collectEmail: false,
    collectName: true,
    collectPhone: true,
    aiTone: null,
    customPersonality: '',
    agentName: '',
    agentAvatarUrl: null,
    agentAvatarFile: null,
    agentAvatarPreview: null,
    widgetIcon: 'message-circle',
    widgetIconFile: null,
    widgetIconPreview: null,
    extractedInfo: null,
  });

  const isValidDomain = (input: string) => {
    const trimmed = input.trim();
    if (!trimmed) return false;
    // Basic domain pattern: word.word (with optional subdomains)
    const domainRegex = /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
    // Remove protocol and path for validation
    const cleaned = trimmed.replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '');
    return domainRegex.test(cleaned);
  };

  const extractDomain = (url: string) => {
    try {
      const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
      return parsed.hostname.replace('www.', '');
    } catch {
      return url.replace('www.', '').split('/')[0];
    }
  };

  const handleComplete = async () => {
    setIsCreating(true);
    const domain = extractDomain(data.websiteUrl);
    
    // Upload avatar to Supabase Storage if a file was selected
    let finalAvatarUrl: string | null = null;
    if (data.agentAvatarFile && user) {
      try {
        const file = data.agentAvatarFile;
        const fileExt = file.name.split('.').pop() || 'png';
        const fileName = `ai-agent-${user.id}-${Date.now()}.${fileExt}`;
        const filePath = `avatars/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('agent-avatars')
          .upload(filePath, file, { upsert: true });

        if (uploadError) {
          console.error('Error uploading avatar:', uploadError);
          // Continue without avatar if upload fails
        } else {
          const { data: urlData } = supabase.storage
            .from('agent-avatars')
            .getPublicUrl(filePath);
          finalAvatarUrl = urlData.publicUrl;
        }
      } catch (err) {
        console.error('Error uploading avatar:', err);
      }
    }

    // Determine the base prompt to use
    let basePrompt: string | undefined;
    if (data.aiTone === 'custom' && data.customPersonality.trim()) {
      // Wrap custom personality with human-like writing guidelines
      basePrompt = `${data.customPersonality.trim()}

Write naturally like a real person. Use contractions, vary sentence lengths. Some short. Some longer.

Never reveal that you're an AI, chatbot, or automated system. You're simply a member of the support team.

Avoid em dashes, semicolons, and starting too many sentences with "I". Skip jargon and therapy-speak.`;
    } else if (data.aiTone && data.aiTone !== 'custom') {
      basePrompt = aiTonePrompts[data.aiTone];
    }
    
    const property = await createProperty(domain, domain, {
      greeting: data.greeting,
      collectEmail: data.collectEmail,
      collectName: data.collectName,
      collectPhone: data.collectPhone,
      basePrompt,
      agentName: data.agentName,
      agentAvatarUrl: finalAvatarUrl,
      widgetIcon: data.widgetIcon,
      businessPhone: data.extractedInfo?.businessPhone || undefined,
      businessEmail: data.extractedInfo?.businessEmail || undefined,
      businessAddress: data.extractedInfo?.businessAddress || undefined,
      businessHours: data.extractedInfo?.businessHours || undefined,
      businessDescription: data.extractedInfo?.description || undefined,
      businessLogoUrl: data.extractedInfo?.logo || undefined,
    });
    
    setIsCreating(false);

    if (property) {
      // Mark onboarding as complete in the database
      if (user) {
        await supabase.rpc('mark_onboarding_complete', { user_uuid: user.id });
      }
      setStep('complete');
    }
  };

  const extractWebsiteInfo = async () => {
    setStep('extracting');
    
    try {
      const { data: result, error } = await supabase.functions.invoke('extract-website-info', {
        body: { url: data.websiteUrl },
      });

      if (error) {
        console.error('Error extracting website info:', error);
        toast.error('Could not analyze website. You can still continue manually.');
        setStep('confirm');
        return;
      }

      let extracted: ExtractedInfo | null = null;
      if (result?.success && result?.data) {
        extracted = result.data as ExtractedInfo;
        setData(prev => ({
          ...prev,
          companyName: extracted!.companyName || extractDomain(prev.websiteUrl),
          extractedInfo: extracted,
        }));
      }
      
      // Generate AI greeting based on extracted info
      if (extracted) {
        try {
          const { data: greetingResult } = await supabase.functions.invoke('generate-greeting', {
            body: {
              companyName: extracted.companyName,
              description: extracted.description,
              businessType: extracted.businessType,
            },
          });
          
          if (greetingResult?.success && greetingResult?.greeting) {
            setData(prev => ({
              ...prev,
              greeting: greetingResult.greeting,
              greetingPreset: null, // Mark as AI-generated (custom)
            }));
          }
        } catch (greetingErr) {
          console.error('Error generating AI greeting:', greetingErr);
          // Continue with default greeting if AI fails
        }
      }
      
      setStep('confirm');
    } catch (err) {
      console.error('Error extracting website info:', err);
      toast.error('Could not analyze website. You can still continue manually.');
      setStep('confirm');
    }
  };

  const nextStep = () => {
    if (step === 1) {
      extractWebsiteInfo();
    } else if (step === 'confirm') {
      setStep(2);
    } else if (step === 3) {
      handleComplete();
    } else if (typeof step === 'number') {
      setStep((step + 1) as OnboardingStep);
    }
  };

  const prevStep = () => {
    if (step === 'confirm') {
      setStep(1);
    } else if (step === 2) {
      setStep('confirm');
    } else if (step === 3) {
      setStep(2);
    }
  };

  const skipToEnd = () => {
    handleComplete();
  };

  // Allow skipping redirect if ?dev=1 is in URL (for testing)
  const [searchParams] = useSearchParams();
  const isDevMode = searchParams.get('dev') === '1';

  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);

  // Check if onboarding is already complete using secure RPC
  useEffect(() => {
    const checkOnboarding = async () => {
      if (!user) {
        setOnboardingComplete(false);
        return;
      }
      
      const { data, error } = await supabase.rpc('check_onboarding_complete', { user_uuid: user.id });
      if (error) {
        console.error('Error checking onboarding status:', error);
        // Fall back to checking properties
        setOnboardingComplete(properties.length > 0);
      } else {
        setOnboardingComplete(data === true);
      }
    };
    
    if (!authLoading && user) {
      checkOnboarding();
    }
  }, [authLoading, user, properties.length]);

  // Redirect to dashboard if onboarding is complete
  useEffect(() => {
    if (!isDevMode && onboardingComplete === true) {
      navigate('/dashboard', { replace: true });
    }
  }, [onboardingComplete, navigate, isDevMode]);

  if (authLoading || dataLoading || onboardingComplete === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    navigate('/auth');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-subtle flex flex-col">
      {/* Header */}
      <div className="p-6">
        <div className="flex items-center gap-2">
          <img src={careAssistLogo} alt="Care Assist" className="h-8 w-8 rounded-lg" />
          <span className="font-semibold text-foreground">Care Assist</span>
        </div>
      </div>

      {/* Progress steps */}
      {step !== 'complete' && step !== 'extracting' && (
        <div className="flex justify-center items-center gap-3 py-4">
          {[
            { num: 1, label: 'Website' },
            { num: 2, label: 'AI Agent' },
            { num: 3, label: 'Widget' },
          ].map((s, i) => {
            const currentProgress = step === 'confirm' ? 1 : (typeof step === 'number' ? step : 1);
            const isActive = s.num === currentProgress;
            const isDone = s.num < currentProgress;
            return (
              <div key={s.num} className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-md shadow-primary/30 scale-110"
                        : isDone
                          ? "bg-primary/20 text-primary"
                          : "bg-muted text-muted-foreground/50"
                    )}
                  >
                    {isDone ? <Check className="h-3.5 w-3.5" /> : s.num}
                  </div>
                  <span className={cn(
                    "text-xs font-medium transition-colors hidden sm:block",
                    isActive ? "text-foreground" : isDone ? "text-primary/70" : "text-muted-foreground/50"
                  )}>
                    {s.label}
                  </span>
                </div>
                {i < 2 && (
                  <div className={cn(
                    "w-8 h-px transition-colors",
                    isDone ? "bg-primary/40" : "bg-muted-foreground/20"
                  )} />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-4 pb-20">
        <div className="w-full max-w-md">
          {/* Step 1: Website URL */}
          {step === 1 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-2">
                  <Globe className="h-8 w-8 text-primary" />
                </div>
                <h1 className="text-3xl font-bold text-foreground tracking-tight">What's your website?</h1>
                <p className="text-muted-foreground text-base">We'll analyze your site and personalize your chat experience</p>
              </div>
              
              <div className="space-y-3">
                <div className="relative">
                  <Globe className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/50" />
                  <Input
                    type="text"
                    placeholder="yourwebsite.com"
                    value={data.websiteUrl}
                    onChange={(e) => setData({ ...data, websiteUrl: e.target.value })}
                    className={cn(
                      "h-14 pl-12 text-base rounded-xl border-2 bg-card shadow-sm focus:shadow-md transition-shadow",
                      data.websiteUrl.trim() && !isValidDomain(data.websiteUrl) 
                        ? "border-destructive focus-visible:ring-destructive" 
                        : "border-border focus-visible:border-primary"
                    )}
                    autoFocus
                  />
                </div>
                {data.websiteUrl.trim() && !isValidDomain(data.websiteUrl) && (
                  <p className="text-sm text-destructive text-center">Please enter a valid domain (e.g., example.com)</p>
                )}
              </div>

              <Button
                onClick={nextStep}
                disabled={!isValidDomain(data.websiteUrl)}
                className="w-full h-13 text-base font-semibold rounded-xl shadow-lg shadow-primary/20"
              >
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Extracting step - loading state */}
          {step === 'extracting' && (
            <ExtractingStep websiteUrl={data.websiteUrl} />
          )}

          {/* Confirm step - show extracted info */}
          {step === 'confirm' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              {/* Success header */}
              <div className="text-center space-y-3">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-status-online/10 flex items-center justify-center">
                  <Check className="h-8 w-8 text-status-online" />
                </div>
                <h1 className="text-3xl font-bold text-foreground tracking-tight">We found your business!</h1>
                <p className="text-muted-foreground text-base">Confirm or edit the details below</p>
              </div>

              {/* Editable fields */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary" />
                    Business Name
                  </label>
                  <Input
                    value={data.companyName}
                    onChange={(e) => setData({ ...data, companyName: e.target.value })}
                    placeholder="Your business name"
                    className="h-12 rounded-xl border-2 bg-card shadow-sm focus:shadow-md transition-shadow focus-visible:border-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Globe className="h-4 w-4 text-primary" />
                    Website
                  </label>
                  <Input
                    value={data.websiteUrl}
                    onChange={(e) => setData({ ...data, websiteUrl: e.target.value })}
                    placeholder="yourwebsite.com"
                    className="h-12 rounded-xl border-2 bg-card shadow-sm focus:shadow-md transition-shadow focus-visible:border-primary"
                  />
                </div>
              </div>

              {/* Extracted info summary */}
              {data.extractedInfo && (
                <div className="rounded-2xl border border-border/50 bg-card p-5 space-y-4 shadow-sm">
                  {data.extractedInfo.description && (
                    <p className="text-sm text-foreground/80 leading-relaxed">{data.extractedInfo.description}</p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs font-semibold bg-primary/10 text-primary px-3 py-1.5 rounded-full capitalize flex items-center gap-1.5">
                      <Sparkles className="h-3 w-3" />
                      {data.extractedInfo.businessType}
                    </span>
                    {data.extractedInfo.primaryColor && (
                      <span className="text-xs font-medium bg-muted text-muted-foreground px-3 py-1.5 rounded-full flex items-center gap-2">
                        <span 
                          className="w-3.5 h-3.5 rounded-full ring-2 ring-background shadow-sm" 
                          style={{ backgroundColor: data.extractedInfo.primaryColor }}
                        />
                        Brand color detected
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-3 pt-1">
                <Button onClick={nextStep} className="w-full h-13 text-base font-semibold rounded-xl shadow-lg shadow-primary/20">
                  Looks Good!
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <button
                  onClick={prevStep}
                  className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1.5 py-2"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Change website
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Create Your AI Persona */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="text-center space-y-2">
                <h1 className="text-2xl font-semibold text-foreground">Create your AI persona</h1>
                <p className="text-muted-foreground">Choose a preset personality or create your own</p>
              </div>

              {/* Personality selection */}
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground text-center">Select a personality</p>
                <div className="space-y-3">
                  {[
                    { value: 'emily' as const, title: 'Emily', description: 'Warm & Reassuring – gentle, safe, supportive' },
                    { value: 'sarah' as const, title: 'Sarah', description: 'Kind & Encouraging – compassionate, optimistic' },
                    { value: 'michael' as const, title: 'Michael', description: 'Calm & Supportive – steady, patient, grounding' },
                    { value: 'daniel' as const, title: 'Daniel', description: 'Friendly & Uplifting – warm, confident, caring' },
                    { value: 'custom' as const, title: 'Custom', description: 'Use your own name, photo & personality' },
                  ].map((tone) => (
                    <ToneCard
                      key={tone.value}
                      title={tone.title}
                      description={tone.description}
                      selected={data.aiTone === tone.value}
                      onClick={() => {
                        if (tone.value !== 'custom' && personaNames[tone.value]) {
                          // Auto-fill name and avatar for preset personas
                          setData({ 
                            ...data, 
                            aiTone: tone.value,
                            agentName: personaNames[tone.value],
                            agentAvatarPreview: personaAvatars[tone.value],
                            agentAvatarFile: null, // Clear any custom file
                            agentAvatarUrl: personaAvatars[tone.value], // Use the imported asset URL
                          });
                        } else {
                          // Custom: clear auto-filled values if switching from preset
                          setData({ 
                            ...data, 
                            aiTone: tone.value,
                            agentName: data.aiTone && data.aiTone !== 'custom' ? '' : data.agentName,
                            agentAvatarPreview: data.aiTone && data.aiTone !== 'custom' ? null : data.agentAvatarPreview,
                            agentAvatarFile: data.aiTone && data.aiTone !== 'custom' ? null : data.agentAvatarFile,
                            agentAvatarUrl: null,
                          });
                        }
                      }}
                      avatarSrc={tone.value !== 'custom' ? personaAvatars[tone.value] : undefined}
                    />
                  ))}
                </div>

                {/* Custom personality section */}
                {data.aiTone === 'custom' && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-200 space-y-4 pt-2">
                    {/* Custom avatar and name */}
                    <div className="flex items-center gap-4 bg-muted/50 rounded-xl p-4">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className={cn(
                          "w-16 h-16 rounded-full border-2 border-dashed flex items-center justify-center transition-all overflow-hidden flex-shrink-0",
                          data.agentAvatarPreview ? "border-primary" : "border-muted-foreground/30 hover:border-muted-foreground/50"
                        )}
                      >
                        {data.agentAvatarPreview ? (
                          <img src={data.agentAvatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <div className="text-center">
                            <Upload className="h-5 w-5 mx-auto text-muted-foreground" />
                          </div>
                        )}
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const previewUrl = URL.createObjectURL(file);
                            setData({ ...data, agentAvatarFile: file, agentAvatarPreview: previewUrl });
                          }
                        }}
                      />
                      <div className="flex-1">
                        <Input
                          type="text"
                          placeholder="Assistant name"
                          value={data.agentName}
                          onChange={(e) => setData({ ...data, agentName: e.target.value })}
                          className="h-10"
                        />
                        <p className="text-xs text-muted-foreground mt-1">Click the circle to upload a photo</p>
                      </div>
                    </div>
                    
                    {/* Custom personality textarea */}
                    <Textarea
                      value={data.customPersonality}
                      onChange={(e) => setData({ ...data, customPersonality: e.target.value })}
                      placeholder="Describe how your AI should communicate. E.g., 'Speak gently and use simple language. Be patient and never rush. Use phrases like 'take your time' and 'you're doing great.''"
                      className="min-h-[100px] text-sm"
                    />
                  </div>
                )}
              </div>


              {/* Welcome Message */}
              <div className="space-y-3 pt-2 border-t border-border/50">
                <p className="text-sm font-medium text-foreground">Welcome message</p>
                {/* Preset greeting chips */}
                <div className="flex flex-wrap gap-2">
                  {greetingPresets.map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() => setData({ ...data, greeting: preset.value, greetingPreset: preset.label })}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                        data.greetingPreset === preset.label
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      )}
                    >
                      {preset.label}
                    </button>
                  ))}
                  <button
                    onClick={() => setData({ ...data, greetingPreset: null })}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1",
                      data.greetingPreset === null
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    <Pencil className="h-3 w-3" />
                    Custom
                  </button>
                </div>
                <Textarea
                  value={data.greeting}
                  onChange={(e) => setData({ ...data, greeting: e.target.value, greetingPreset: null })}
                  placeholder="Enter your welcome message..."
                  className="min-h-[60px] text-sm"
                />
              </div>

              <div className="space-y-3">
                <Button onClick={nextStep} disabled={!data.aiTone} className="w-full h-12">
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <button
                  onClick={skipToEnd}
                  disabled={isCreating}
                  className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                >
                  Skip, use defaults
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Lead Capture + Widget Icon Selection */}
          {step === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="text-center space-y-2">
                <h1 className="text-2xl font-semibold text-foreground">Customize your widget</h1>
                <p className="text-muted-foreground">Set up lead capture and choose your chat icon</p>
              </div>

              {/* Lead Capture Section */}
              <div className="space-y-3">
                <p className="text-sm font-medium text-foreground">Collect from visitors</p>
                <div className="space-y-2">
                  <ToggleCard
                    title="Name"
                    description="Ask visitors for their name"
                    checked={data.collectName}
                    onChange={(v) => setData({ ...data, collectName: v })}
                    recommended
                  />
                  <ToggleCard
                    title="Phone Number"
                    description="Collect phone for follow-ups"
                    checked={data.collectPhone}
                    onChange={(v) => setData({ ...data, collectPhone: v })}
                    recommended
                  />
                  <ToggleCard
                    title="Email Address"
                    description="Get email for communication"
                    checked={data.collectEmail}
                    onChange={(v) => setData({ ...data, collectEmail: v })}
                  />
                </div>
              </div>

              {/* Widget Icon Section */}
              <div className="space-y-3 pt-2 border-t border-border/50">
                <p className="text-sm font-medium text-foreground">Chat widget icon</p>

                {/* Hidden file input for custom icon */}
                <input
                  type="file"
                  ref={widgetIconInputRef}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const previewUrl = URL.createObjectURL(file);
                      setData({ 
                        ...data, 
                        widgetIcon: 'custom',
                        widgetIconFile: file,
                        widgetIconPreview: previewUrl
                      });
                    }
                  }}
                  accept="image/*"
                  className="hidden"
                />

                {/* Icon grid - 3 rows */}
                <div className="grid grid-cols-3 gap-2">
                  {widgetIconOptions.map((option, index) => {
                    const IconComponent = option.icon;
                    const isSelected = data.widgetIcon === option.id;
                    const isCustomOption = option.id === 'custom';
                    
                    return (
                      <button
                        key={option.id}
                        onClick={() => {
                          if (isCustomOption) {
                            widgetIconInputRef.current?.click();
                          } else {
                            setData({ 
                              ...data, 
                              widgetIcon: option.id,
                              widgetIconFile: null,
                              widgetIconPreview: null
                            });
                          }
                        }}
                        className={cn(
                          "relative flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all duration-200 gap-1.5",
                          "animate-in fade-in zoom-in-95",
                          isSelected
                            ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                            : "border-border bg-background hover:border-primary/50 hover:bg-muted/50 hover:scale-[1.02]"
                        )}
                        style={{ 
                          animationDelay: `${index * 30}ms`,
                          animationFillMode: 'backwards'
                        }}
                      >
                        {isCustomOption && data.widgetIconPreview ? (
                          <img 
                            src={data.widgetIconPreview} 
                            alt="Custom icon" 
                            className="h-6 w-6 rounded object-cover"
                          />
                        ) : (
                          <IconComponent className={cn(
                            "h-6 w-6 transition-transform duration-200",
                            isSelected ? "scale-110" : ""
                          )} />
                        )}
                        <span className={cn(
                          "text-xs font-medium",
                          isSelected ? "" : "text-muted-foreground"
                        )}>
                          {option.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Interactive Chat Widget Preview */}
              <div className="pt-2">
                <p className="text-xs text-muted-foreground text-center mb-3">Preview</p>
                <WidgetPreviewDemo 
                  widgetIcon={data.widgetIcon}
                  agentName={data.agentName || 'Support'}
                  agentAvatar={data.agentAvatarPreview}
                  greeting={data.greeting}
                />
              </div>

              <div className="space-y-3">
                <Button onClick={nextStep} disabled={isCreating} className="w-full h-12">
                  {isCreating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      Complete Setup
                      <Check className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
                <button
                  onClick={skipToEnd}
                  disabled={isCreating}
                  className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                >
                  Skip, use defaults
                </button>
              </div>
            </div>
          )}

          {/* Completion */}
          {step === 'complete' && (
            <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500 text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Check className="h-8 w-8 text-primary" />
              </div>
              
              <div className="space-y-2">
                <h1 className="text-2xl font-semibold text-foreground">You're all set!</h1>
                <p className="text-muted-foreground">Your chat widget is ready to go</p>
              </div>

              <Button onClick={() => navigate('/dashboard?tour=1')} className="w-full h-12">
                Go to Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Back button */}
      {typeof step === 'number' && step > 1 && (
        <div className="fixed bottom-6 left-6">
          <Button variant="ghost" size="sm" onClick={prevStep}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>
      )}
    </div>
  );
};

// Toggle card component
const ToggleCard = ({
  title,
  description,
  checked,
  onChange,
  recommended,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  recommended?: boolean;
}) => (
  <button
    onClick={() => onChange(!checked)}
    className={cn(
      "w-full p-4 rounded-xl border-2 text-left transition-all",
      checked
        ? "border-primary bg-primary/5"
        : "border-border hover:border-muted-foreground/30"
    )}
  >
    <div className="flex items-center justify-between">
      <div>
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">{title}</span>
          {recommended && (
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
              Recommended
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
      </div>
      <div
        className={cn(
          "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
          checked ? "border-primary bg-primary" : "border-muted-foreground/30"
        )}
      >
        {checked && <Check className="h-3 w-3 text-primary-foreground" />}
      </div>
    </div>
  </button>
);

// Tone selection card
const ToneCard = ({
  title,
  description,
  selected,
  onClick,
  avatarSrc,
}: {
  title: string;
  description: string;
  selected: boolean;
  onClick: () => void;
  avatarSrc?: string;
}) => (
  <button
    onClick={onClick}
    className={cn(
      "w-full p-4 rounded-xl border-2 text-left transition-all duration-200",
      selected
        ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
        : "border-border hover:border-primary/40 hover:bg-muted/50 hover:shadow-sm hover:scale-[1.01]"
    )}
  >
    <div className="flex items-center justify-between gap-3">
      {avatarSrc && (
        <img 
          src={avatarSrc} 
          alt={title} 
          className="w-10 h-10 rounded-full object-cover flex-shrink-0"
        />
      )}
      <div className="flex-1 min-w-0">
        <span className="font-medium text-foreground">{title}</span>
        <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
      </div>
      <div
        className={cn(
          "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0",
          selected ? "border-primary bg-primary" : "border-muted-foreground/30"
        )}
      >
        {selected && <Check className="h-3 w-3 text-primary-foreground" />}
      </div>
    </div>
  </button>
);

// Widget Preview Demo Component
const WidgetPreviewDemo = ({
  widgetIcon,
  agentName,
  agentAvatar,
  greeting,
}: {
  widgetIcon: string;
  agentName: string;
  agentAvatar?: string | null;
  greeting: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showMessage, setShowMessage] = useState(false);

  // Auto-open after a delay when component mounts
  useEffect(() => {
    const openTimer = setTimeout(() => setIsOpen(true), 600);
    return () => clearTimeout(openTimer);
  }, []);

  // Show message after widget opens
  useEffect(() => {
    if (isOpen) {
      const messageTimer = setTimeout(() => setShowMessage(true), 400);
      return () => clearTimeout(messageTimer);
    } else {
      setShowMessage(false);
    }
  }, [isOpen]);

  // Reset animation when icon changes — close, wait 2s showing the launcher, then reopen
  useEffect(() => {
    setIsOpen(false);
    setShowMessage(false);
    const timer = setTimeout(() => setIsOpen(true), 2000);
    return () => clearTimeout(timer);
  }, [widgetIcon]);

  const iconMap: Record<string, typeof MessageCircle> = {
    'message-circle': MessageCircle,
    'message-square': MessageSquare,
    'messages-square': MessagesSquare,
    'headphones': Headphones,
    'help-circle': HelpCircle,
    'heart': Heart,
    'sparkles': Sparkles,
    'bot': Bot,
  };

  const SelectedIcon = iconMap[widgetIcon] || MessageCircle;

  return (
    <div className="flex flex-col items-center gap-3 pt-2">
      <p className="text-sm text-muted-foreground">Live Preview</p>
      
      <div className="relative w-72 h-80 bg-gradient-to-br from-muted/30 to-muted/50 rounded-2xl border border-border overflow-hidden">
        {/* Mock website background */}
        <div className="absolute inset-0 p-4 opacity-30">
          <div className="w-full h-3 bg-muted-foreground/20 rounded mb-2" />
          <div className="w-3/4 h-3 bg-muted-foreground/20 rounded mb-4" />
          <div className="w-full h-20 bg-muted-foreground/10 rounded mb-2" />
          <div className="w-full h-3 bg-muted-foreground/20 rounded mb-2" />
          <div className="w-5/6 h-3 bg-muted-foreground/20 rounded" />
        </div>

        {/* Chat Widget */}
        <div className="absolute bottom-3 right-3">
          {/* Opened Chat Window */}
          {isOpen && (
            <div 
              className={cn(
                "absolute bottom-14 right-0 w-56 bg-card rounded-2xl shadow-2xl border border-border overflow-hidden",
                "animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-300"
              )}
            >
              {/* Header */}
              <div className="bg-primary p-3 flex items-center gap-2">
                <div className="relative">
                  {agentAvatar ? (
                    <img 
                      src={agentAvatar} 
                      alt={agentName} 
                      className="w-8 h-8 rounded-full object-cover border-2 border-primary-foreground/20"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                      <User className="h-4 w-4 text-primary-foreground" />
                    </div>
                  )}
                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-status-online rounded-full border-2 border-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-primary-foreground font-medium text-sm truncate">{agentName}</p>
                  <p className="text-primary-foreground/70 text-xs">Online</p>
                </div>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="text-primary-foreground/70 hover:text-primary-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Messages */}
              <div className="p-3 h-28 overflow-hidden">
                {showMessage && (
                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex gap-2">
                      {agentAvatar ? (
                        <img 
                          src={agentAvatar} 
                          alt={agentName}
                          className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                          <User className="h-3 w-3 text-muted-foreground" />
                        </div>
                      )}
                      <div className="bg-muted rounded-2xl rounded-tl-md px-3 py-2 max-w-[85%]">
                        <p className="text-xs text-foreground leading-relaxed line-clamp-3">
                          {greeting || "Hi there! 👋 How can I help you today?"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="p-2 border-t border-border">
                <div className="flex items-center gap-2 bg-muted/50 rounded-full px-3 py-1.5">
                  <span className="text-xs text-muted-foreground flex-1">Type a message...</span>
                  <Send className="h-3.5 w-3.5 text-primary" />
                </div>
              </div>
            </div>
          )}

          {/* Launcher Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={cn(
              "w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg transition-all duration-300",
              isOpen ? "rotate-0" : "animate-attention-bounce",
              "hover:scale-105 active:scale-95"
            )}
          >
            {isOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <SelectedIcon className="h-6 w-6" />
            )}
          </button>
        </div>
      </div>
      
      <p className="text-xs text-muted-foreground text-center">Click the button to open/close</p>
    </div>
  );
};

export default Onboarding;
