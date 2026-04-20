import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Minimize2, User, Mail, ImagePlus, MessageSquare, MessagesSquare, Headphones, HelpCircle, Heart, Sparkles, Bot, Globe, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useWidgetChat } from '@/hooks/useWidgetChat';
import { supabase } from '@/integrations/supabase/client';

export interface HardcodedMessage {
  type: 'agent' | 'visitor';
  text: string;
}

interface ChatWidgetProps {
  propertyId?: string;
  primaryColor?: string;
  textColor?: string;
  borderColor?: string;
  widgetSize?: 'small' | 'medium' | 'large';
  borderRadius?: number;
  greeting?: string;
  agentName?: string;
  agentAvatar?: string;
  isPreview?: boolean;
  autoOpen?: boolean;
  widgetIcon?: string;
  effectType?: string;
  effectInterval?: number;
  effectIntensity?: string;
  /** Array of visitor messages to auto-type into the input and send sequentially */
  autoPlayScript?: string[];
  /** When true, hides the input and shows a "Start Your Own Chat" button */
  demoOverlay?: boolean;
  /** Callback when user clicks "Start Your Own Chat" */
  onStartOwnChat?: () => void;
  /** Speed multiplier for autoplay: 1 = normal, 2 = 2x faster, etc. */
  autoPlaySpeed?: number;
  /** When true, the widget panel fills its parent container (100% width/height) */
  fillContainer?: boolean;
  /** A closing agent message to inject locally after the autoplay script ends */
  closingAgentMessage?: string;
  /** Fired with the 0-based index each time an autoplay script message is sent */
  onScriptMessageSent?: (index: number) => void;
  /** Fully hardcoded conversation — bypasses AI/autoplay entirely and renders static messages */
  hardcodedMessages?: HardcodedMessage[];
  /** Hardcoded agent replies injected locally (with typing sim) instead of calling the AI, one per visitor message */
  scriptedAgentReplies?: string[];
}

export const ChatWidget = ({
  propertyId = 'demo',
  primaryColor = '#F97316',
  textColor = 'hsl(0, 0%, 100%)',
  borderColor = 'hsl(0, 0%, 0%, 0.1)',
  widgetSize = 'medium',
  borderRadius = 24,
  greeting = "Hi there! 👋 How can I help you today?",
  agentName = "Support",
  agentAvatar,
  isPreview = false,
  autoOpen = false,
  widgetIcon,
  effectType = 'none',
  effectInterval = 5,
  effectIntensity = 'medium',
  autoPlayScript,
  demoOverlay = false,
  onStartOwnChat,
  autoPlaySpeed = 1,
  fillContainer = false,
  closingAgentMessage,
  onScriptMessageSent,
  hardcodedMessages,
  scriptedAgentReplies,
}: ChatWidgetProps) => {
  // Detect mobile using screen width (window.innerWidth is unreliable inside a small iframe)
  const isMobileWidget = typeof window !== 'undefined' && (window.screen?.width || window.innerWidth) < 768;

  const [isOpen, setIsOpen] = useState(autoOpen);
  const [isClosing, setIsClosing] = useState(false);
  const [showAttentionBounce, setShowAttentionBounce] = useState(true);
  const [inputValue, setInputValue] = useState('');
  const [leadName, setLeadName] = useState('');
  const [leadEmail, setLeadEmail] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isTypingRef = useRef(false);
  const messagesCountRef = useRef(0);

  const {
    messages,
    sendMessage,
    isTyping,
    loading,
    settings,
    requiresLeadCapture,
    submitLeadInfo,
    visitorInfo,
    visitorId,
    currentAiAgent,
    aiAgents,
    greetingText,
    geoBlocked,
    geoBlockedMessage,
  } = useWidgetChat({ propertyId, greeting, isPreview });

  // Keep refs in sync for autoplay polling
  useEffect(() => { isTypingRef.current = isTyping; }, [isTyping]);
  useEffect(() => { messagesCountRef.current = messages.length; }, [messages.length]);

  // Widget icon mapping
  const widgetIconMap: Record<string, LucideIcon> = {
    'message-circle': MessageCircle,
    'message-square': MessageSquare,
    'messages-square': MessagesSquare,
    'headphones': Headphones,
    'help-circle': HelpCircle,
    'heart': Heart,
    'sparkles': Sparkles,
    'bot': Bot,
  };

  // Get the icon component from prop override, settings, or default
  const WidgetIconComponent = widgetIconMap[widgetIcon || settings?.widget_icon || 'message-circle'] || MessageCircle;

  // Use AI agent info if available, otherwise use props
  const displayName = currentAiAgent?.name || agentName;
  const displayAvatar = currentAiAgent?.avatar_url || agentAvatar;
  // Only reveal name/avatar once real agent data is available — prevents flash of defaults
  const agentReady = !!currentAiAgent;

  // Periodic effect animation
  const [effectActive, setEffectActive] = useState(false);
  const [ringActive, setRingActive] = useState(false);

  useEffect(() => {
    if (effectType === 'none' || isOpen) return;
    const id = setInterval(() => {
      if (effectType === 'ring') {
        setRingActive(true);
        setTimeout(() => setRingActive(false), 1500);
      } else {
        setEffectActive(true);
        setTimeout(() => setEffectActive(false), 800);
      }
    }, effectInterval * 1000);
    return () => clearInterval(id);
  }, [effectType, effectInterval, isOpen]);

  const getEffectStyle = (): React.CSSProperties => {
    if (!effectActive || effectType === 'none' || effectType === 'ring') return {};
    const scale = effectIntensity === 'subtle' ? 1.05 : effectIntensity === 'strong' ? 1.15 : 1.1;
    const translate = effectIntensity === 'subtle' ? 4 : effectIntensity === 'strong' ? 12 : 8;

    switch (effectType) {
      case 'pulse':
        return { animation: `widget-pulse 0.8s ease-in-out` };
      case 'bounce':
        return { animation: `widget-bounce 0.6s ease-out` };
      case 'wiggle':
        return { animation: `widget-wiggle 0.5s ease-in-out` };
      case 'heartbeat':
        return { animation: `widget-heartbeat 0.8s ease-in-out` };
      default:
        return {};
    }
  };



  const scrollToBottom = () => {
    // Primary: scroll the container directly (works when flex-1 has bounded height)
    // Fallback: scrollIntoView with block:nearest to avoid page-level scroll
    const doScroll = () => {
      const container = messagesContainerRef.current;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
      const end = messagesEndRef.current;
      if (end) {
        end.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      }
    };
    setTimeout(doScroll, 0);
    setTimeout(doScroll, 100);
    setTimeout(doScroll, 300);
  };

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSend = () => {
    if (!inputValue.trim()) return;
    sendMessage(inputValue.trim());
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Autoplay: show visitor typing bubble, then send, then wait for AI
  const autoPlayIndexRef = useRef(0);
  const autoPlayActiveRef = useRef(false);
  const [visitorTyping, setVisitorTyping] = useState(false);
  const [closingMessage, setClosingMessage] = useState<{ text: string; time: Date } | null>(null);
  const [agentClosingTyping, setAgentClosingTyping] = useState(false);
  const [localAgentMessages, setLocalAgentMessages] = useState<{ text: string; time: Date }[]>([]);

  // Scroll to bottom whenever any chat content changes (always after paint)
  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, visitorTyping, agentClosingTyping, closingMessage, localAgentMessages]);

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [isOpen]);

  useEffect(() => {
    if (!autoPlayScript || autoPlayScript.length === 0 || !isOpen) return;
    if (autoPlayActiveRef.current) return;
    autoPlayActiveRef.current = true;

    let cancelled = false;

    const waitForAiDone = (): Promise<void> => {
      return new Promise((resolve) => {
        const startCount = messagesCountRef.current;
        let elapsed = 0;
        const poll = () => {
          if (cancelled) { resolve(); return; }
          if (!isTypingRef.current && messagesCountRef.current > startCount) {
            resolve();
            return;
          }
          elapsed += 200;
          if (elapsed > 90000) { resolve(); return; }
          setTimeout(poll, 200);
        };
        setTimeout(poll, 1000);
      });
    };

    const s = (ms: number) => ms / autoPlaySpeed; // speed-adjusted delay

    const injectAgentReply = async (reply: string) => {
      await sleep(s(1200));
      if (cancelled) return;
      setAgentClosingTyping(true);
      await sleep(s(900 + reply.length * 22));
      if (cancelled) return;
      setAgentClosingTyping(false);
      setLocalAgentMessages(prev => [...prev, { text: reply, time: new Date() }]);
    };

    const runScript = async () => {
      // Wait for greeting to appear
      await sleep(s(2000));

      while (autoPlayIndexRef.current < autoPlayScript.length && !cancelled) {
        const text = autoPlayScript[autoPlayIndexRef.current];
        const isLastMessage = autoPlayIndexRef.current === autoPlayScript.length - 1;

        // Show visitor typing bubble for a natural duration
        await sleep(s(1000));
        if (cancelled) return;
        setVisitorTyping(true);
        await sleep(s(1200 + text.length * 30)); // longer text = longer typing
        if (cancelled) return;
        setVisitorTyping(false);

        // Brief pause then send
        await sleep(s(300));
        if (cancelled) return;

        const hasScriptedReply = scriptedAgentReplies && scriptedAgentReplies[autoPlayIndexRef.current];
        const useClosing = isLastMessage && !!closingAgentMessage && !hasScriptedReply;
        sendMessage(text, (hasScriptedReply || useClosing) ? { skipAiReply: true } : undefined);
        const sentIndex = autoPlayIndexRef.current;
        autoPlayIndexRef.current++;
        onScriptMessageSent?.(sentIndex);

        // Inject scripted agent reply locally (no AI)
        if (hasScriptedReply) {
          await injectAgentReply(scriptedAgentReplies[sentIndex]);
          if (cancelled) return;
          if (isLastMessage) break;
          await sleep(s(600));
          continue;
        }

        // After the last script message, inject the closing agent message locally
        if (isLastMessage) {
          if (closingAgentMessage) {
            await sleep(s(1200));
            if (cancelled) return;
            setAgentClosingTyping(true);
            await sleep(s(1000 + closingAgentMessage.length * 25));
            if (cancelled) return;
            setAgentClosingTyping(false);
            setClosingMessage({ text: closingAgentMessage, time: new Date() });
          }
          break;
        }

        // Wait for AI to fully finish responding
        await waitForAiDone();
        if (cancelled) return;
        await sleep(s(800));
      }
    };

    runScript();

    return () => {
      cancelled = true;
      autoPlayActiveRef.current = false;
      setVisitorTyping(false);
      setAgentClosingTyping(false);
    };
  }, [autoPlayScript, isOpen]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImage(true);

    try {
      for (const file of Array.from(files)) {
        // Check file type
        if (!file.type.startsWith('image/')) {
          continue;
        }

        // Create a unique filename
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(2, 9);
        const ext = file.name.split('.').pop() || 'jpg';
        const fileName = `widget-uploads/${timestamp}-${randomStr}.${ext}`;

        // Upload to Supabase storage
        const { data, error } = await supabase.storage
          .from('agent-avatars')
          .upload(fileName, file, { upsert: true });

        if (error) {
          console.error('Failed to upload image:', error);
          continue;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('agent-avatars')
          .getPublicUrl(fileName);

        if (urlData?.publicUrl) {
          // Send message with image
          sendMessage(`[Image uploaded: ${file.name}]\n${urlData.publicUrl}`);
          
          // Save insurance card URL to visitor record
          if (visitorId) {
            const sessionId = window.__scaledbot_session_id || localStorage.getItem('chat_session_id') || '';
            fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-visitor`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
              },
              body: JSON.stringify({ visitorId, sessionId, updates: { insurance_card_url: urlData.publicUrl } }),
            }).catch(err => console.error('Failed to save insurance card URL:', err));
          }
        }
      }
    } catch (error) {
      console.error('Error uploading images:', error);
    }

    setUploadingImage(false);
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleLeadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = settings.require_name_before_chat ? leadName.trim() : undefined;
    const email = settings.require_email_before_chat ? leadEmail.trim() : undefined;
    
    // Basic validation
    if (settings.require_name_before_chat && !name) return;
    if (settings.require_email_before_chat && !email) return;
    if (email && !email.includes('@')) return;

    submitLeadInfo(name, email);
  };

  // Dynamic border radius styles
  const panelRadius = `${borderRadius}px`;
  const buttonRadius = `${Math.min(borderRadius, 32)}px`;
  const messageRadiusLarge = `${Math.min(borderRadius, 24)}px`;
  const messageRadiusSmall = `${Math.max(borderRadius / 3, 4)}px`;

  // Widget size dimensions — smaller on mobile
  const desktopSizeConfig = {
    small: { width: 278, height: 390, button: 44 },
    medium: { width: 315, height: 435, button: 48 },
    large: { width: 360, height: 495, button: 52 },
  };
  const mobileSizeConfig = {
    small: { width: 240, height: 330, button: 40 },
    medium: { width: 270, height: 375, button: 44 },
    large: { width: 300, height: 420, button: 48 },
  };
  const currentSize = isMobileWidget ? mobileSizeConfig[widgetSize] : desktopSizeConfig[widgetSize];

  // In preview mode, still respect widgetSize so demo/mobile can render a truly smaller widget.
  // On mobile (non-preview), fill the entire iframe which is already sized to the screen
  const previewPanelStyle: React.CSSProperties = fillContainer
    ? {
        width: '100%',
        height: '100%',
        borderRadius: panelRadius,
        border: `1px solid ${borderColor}`,
      }
    : isPreview
    ? {
        width: `min(${currentSize.width}px, 92vw)`,
        height: `min(${currentSize.height}px, 78vh)`,
        borderRadius: panelRadius,
        border: `1px solid ${borderColor}`,
      }
    : { width: `${currentSize.width}px`, height: `${currentSize.height}px`, borderRadius: panelRadius, border: `1px solid ${borderColor}` };

  // Tell the parent page how big the iframe should be.
  // This removes the “big box” around the widget when it’s closed.
  useEffect(() => {
    if (isPreview) return;

    let inIframe = false;
    try {
      inIframe = window.self !== window.top;
    } catch {
      inIframe = true;
    }

    if (!inIframe) return;

    if (!isOpen) {
      // Extra padding when effects are active so animations (bounce, pulse, ring) aren't clipped by the iframe
      const hasEffect = effectType && effectType !== 'none';
      const padding = hasEffect ? 48 : 32;
      const width = currentSize.button + padding;
      const height = currentSize.button + padding;
      window.parent.postMessage(
        { type: 'scaledbot_widget_resize', width, height, fullscreen: false },
        '*'
      );
    } else if (isMobileWidget) {
      const padding = 32;
      const width = currentSize.width + padding;
      const height = currentSize.height + padding;
      window.parent.postMessage(
        { type: 'scaledbot_widget_resize', width, height, fullscreen: false },
        '*'
      );
    } else {
      const padding = 32;
      const width = currentSize.width + padding;
      const height = currentSize.height + padding;
      window.parent.postMessage(
        { type: 'scaledbot_widget_resize', width, height, fullscreen: false },
        '*'
      );
    }
  }, [isOpen, widgetSize, isPreview, isMobileWidget, currentSize.width, currentSize.height, currentSize.button, effectType]);

  // Convert HSL string to ensure compatibility
  const widgetStyle = {
    '--widget-primary': primaryColor,
    '--widget-text': textColor,
    '--widget-border': borderColor,
    '--widget-radius': panelRadius,
    '--widget-button-radius': buttonRadius,
    '--widget-message-radius-lg': messageRadiusLarge,
    '--widget-message-radius-sm': messageRadiusSmall,
  } as React.CSSProperties;

  // Show lead capture form
  const showLeadForm = requiresLeadCapture && !visitorInfo.name && !visitorInfo.email;

  // Don't render until bootstrap completes — prevents flash of default name/avatar
  if (loading && !isPreview) return null;

  return (
    <div 
      className={cn(
        "z-50 font-sans pointer-events-none",
        isPreview ? "relative" : "fixed bottom-4 right-4"
      )}
      style={{ ...widgetStyle, background: 'transparent' }}
    >

      {/* Chat Panel */}
      {(isOpen || isClosing) && (
        <div 
          className={cn(
            "mb-4 bg-card/95 backdrop-blur-lg overflow-hidden flex flex-col pointer-events-auto",
            isClosing ? "animate-scale-out" : "animate-scale-in"
          )}
          onAnimationEnd={() => {
            if (isClosing) {
              setIsClosing(false);
              setIsOpen(false);
            }
          }}
          style={previewPanelStyle}
        >
          {/* Header */}
          <div 
            className="px-5 py-4 flex items-center justify-between relative overflow-hidden"
            style={{ background: 'var(--widget-primary)' }}
          >
            {/* Gradient overlay */}
            <div 
              className="absolute inset-0 opacity-30"
              style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 100%)' }}
            />
            <div className="flex items-center gap-3 relative z-10">
              <div
                className="h-11 w-11 backdrop-blur-sm flex items-center justify-center overflow-hidden"
                style={{ borderRadius: buttonRadius, background: `color-mix(in srgb, ${textColor} 20%, transparent)`, visibility: agentReady ? 'visible' : 'hidden' }}
              >
                {displayAvatar ? (
                  <img src={displayAvatar} alt={displayName} className="h-full w-full object-cover" />
                ) : (
                  <MessageCircle className="h-5 w-5" style={{ color: textColor }} />
                )}
              </div>
              <div>
                <h3 className="font-semibold" style={{ color: textColor, visibility: agentReady ? 'visible' : 'hidden' }}>{displayName}</h3>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full animate-pulse" style={{ background: textColor }} />
                  <span className="text-xs" style={{ color: textColor, opacity: 0.8 }}>
                    {aiAgents.length > 1 ? `AI Agent (${aiAgents.length} available)` : 'Here to help'}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 relative z-10">
              <button 
                onClick={() => setIsClosing(true)}
                className="h-9 w-9 rounded-full flex items-center justify-center transition-all duration-300"
                style={{ background: 'transparent' }}
                onMouseEnter={(e) => e.currentTarget.style.background = `color-mix(in srgb, ${textColor} 20%, transparent)`}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <X className="h-4 w-4" style={{ color: textColor }} />
              </button>
            </div>
          </div>

          {/* Welcome Message */}
          <div className="px-5 py-3 bg-gradient-to-r from-accent/30 to-muted/30 border-b border-border/30">
            <p className="text-xs text-muted-foreground text-center">
              🔒 100% Private & Confidential. Take your time. 💚
            </p>
          </div>

          {/* Lead Capture Form */}
          {geoBlocked ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 bg-gradient-to-b from-background to-muted/20 text-center">
              <div 
                className="h-16 w-16 flex items-center justify-center mb-4 bg-muted/50"
                style={{ borderRadius: buttonRadius }}
              >
                <Globe className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Service Unavailable</h3>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-[280px]">
                {geoBlockedMessage}
              </p>
            </div>
          ) : showLeadForm ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 bg-gradient-to-b from-background to-muted/20">
              <div 
                className="h-16 w-16 flex items-center justify-center mb-4"
                style={{ background: 'var(--widget-primary)', borderRadius: buttonRadius }}
              >
                <MessageCircle className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Before we chat</h3>
              <p className="text-sm text-muted-foreground text-center mb-6">
                Please share a few details so we can better assist you.
              </p>
              <form onSubmit={handleLeadSubmit} className="w-full space-y-4">
                {settings.require_name_before_chat && (
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={leadName}
                      onChange={(e) => setLeadName(e.target.value)}
                      placeholder="Your name"
                      required
                      className="w-full pl-11 pr-4 py-3 border border-border/50 bg-background/80 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all duration-300 placeholder:text-muted-foreground/60"
                      style={{ borderRadius: `${Math.min(borderRadius, 16)}px` }}
                    />
                  </div>
                )}
                {settings.require_email_before_chat && (
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="email"
                      value={leadEmail}
                      onChange={(e) => setLeadEmail(e.target.value)}
                      placeholder="Your email"
                      required
                      className="w-full pl-11 pr-4 py-3 border border-border/50 bg-background/80 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all duration-300 placeholder:text-muted-foreground/60"
                      style={{ borderRadius: `${Math.min(borderRadius, 16)}px` }}
                    />
                  </div>
                )}
                <button
                  type="submit"
                  className="w-full py-3 text-white font-medium text-sm transition-all duration-300 hover:opacity-90"
                  style={{ background: 'var(--widget-primary)', borderRadius: `${Math.min(borderRadius, 16)}px` }}
                >
                  Start Chat
                </button>
              </form>
            </div>
          ) : (
            <>
              {/* Messages */}
              <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-background to-muted/20 scrollbar-thin">
                {/* Static Greeting - displayed first, not stored as a message */}
                {greetingText && !hardcodedMessages && (
                  <div className="flex gap-3 animate-fade-in">
                    <div
                      className="h-9 w-9 flex items-center justify-center flex-shrink-0 shadow-sm overflow-hidden"
                      style={{ background: displayAvatar ? 'transparent' : 'var(--widget-primary)', borderRadius: buttonRadius, visibility: agentReady ? 'visible' : 'hidden' }}
                    >
                      {displayAvatar ? (
                        <img src={displayAvatar} alt={displayName} className="h-full w-full object-cover" />
                      ) : (
                        <MessageCircle className="h-4 w-4 text-white" />
                      )}
                    </div>
                    <div className="max-w-[75%] flex flex-col">
                      <div
                        className="px-4 py-3 shadow-sm bg-card border border-border/30"
                        style={{ borderRadius: `${messageRadiusLarge} ${messageRadiusLarge} ${messageRadiusLarge} ${messageRadiusSmall}` }}
                      >
                        <p className="text-xs text-foreground whitespace-pre-wrap break-words leading-relaxed text-left">
                          {greetingText}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Hardcoded conversation — fully static, no AI */}
                {hardcodedMessages && hardcodedMessages.map((msg, index) => (
                  <div
                    key={index}
                    className={cn(
                      "flex gap-3 animate-fade-in",
                      msg.type === 'visitor' ? "flex-row-reverse" : "flex-row"
                    )}
                    style={{ animationDelay: `${index * 80}ms` }}
                  >
                    {msg.type === 'agent' && (
                      <div 
                        className="h-9 w-9 flex items-center justify-center flex-shrink-0 shadow-sm overflow-hidden"
                        style={{ background: displayAvatar ? 'transparent' : 'var(--widget-primary)', borderRadius: buttonRadius }}
                      >
                        {displayAvatar ? (
                          <img src={displayAvatar} alt={displayName} className="h-full w-full object-cover" />
                        ) : (
                          <MessageCircle className="h-4 w-4 text-white" />
                        )}
                      </div>
                    )}
                    <div className={cn("max-w-[75%]", msg.type === 'agent' && "flex flex-col")}>
                      <div
                        className={cn(
                          "px-4 py-3 shadow-sm",
                          msg.type === 'visitor' ? "" : "bg-card border border-border/30"
                        )}
                        style={msg.type === 'visitor'
                          ? {
                              background: 'var(--widget-primary)',
                              color: 'white',
                              borderRadius: `${messageRadiusLarge} ${messageRadiusLarge} ${messageRadiusSmall} ${messageRadiusLarge}`,
                            }
                          : {
                              borderRadius: `${messageRadiusLarge} ${messageRadiusLarge} ${messageRadiusLarge} ${messageRadiusSmall}`,
                            }
                        }
                      >
                        <p className="text-xs whitespace-pre-wrap leading-relaxed text-left">{msg.text}</p>
                      </div>
                    </div>
                  </div>
                ))}

                {!hardcodedMessages && (() => {
                  const shouldInterleaveScriptedReplies = Array.isArray(scriptedAgentReplies) && scriptedAgentReplies.length > 0;

                  if (shouldInterleaveScriptedReplies) {
                    // Interleave visitor messages with their corresponding local scripted replies
                    const visitorMessages = messages.filter(m => m.sender_type === 'visitor');
                    const agentBackendMessages = messages.filter(m => m.sender_type !== 'visitor');
                    const allItems: React.ReactNode[] = [];

                    // Render backend agent messages (if any)
                    agentBackendMessages.forEach((msg, index) => {
                      const msgAgentName = msg.agent_name || displayName;
                      const msgAgentAvatar = msg.agent_avatar || displayAvatar;
                      allItems.push(
                        <div key={msg.id} className="flex gap-3 animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
                          <div className="h-9 w-9 flex items-center justify-center flex-shrink-0 shadow-sm overflow-hidden"
                            style={{ background: msgAgentAvatar ? 'transparent' : 'var(--widget-primary)', borderRadius: buttonRadius }}>
                            {msgAgentAvatar ? <img src={msgAgentAvatar} alt={msgAgentName} className="h-full w-full object-cover" /> : <MessageCircle className="h-4 w-4 text-white" />}
                          </div>
                          <div className="max-w-[75%] flex flex-col">
                            <div className="px-4 py-3 shadow-sm bg-card border border-border/30"
                              style={{ borderRadius: `${messageRadiusLarge} ${messageRadiusLarge} ${messageRadiusLarge} ${messageRadiusSmall}` }}>
                              <p className="text-xs whitespace-pre-wrap leading-relaxed text-left">{msg.content}</p>
                              <p className="text-xs mt-1.5 text-right text-muted-foreground">{format(new Date(msg.created_at), 'h:mm a')}</p>
                            </div>
                          </div>
                        </div>
                      );
                    });

                    // Interleave: visitor msg[i] then localAgentMessages[i]
                    visitorMessages.forEach((msg, index) => {
                      allItems.push(
                        <div key={msg.id} className="flex gap-3 flex-row-reverse animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
                          <div className="max-w-[75%]">
                            <div className="px-4 py-3 shadow-sm"
                              style={{ background: 'var(--widget-primary)', color: 'white', borderRadius: `${messageRadiusLarge} ${messageRadiusLarge} ${messageRadiusSmall} ${messageRadiusLarge}` }}>
                              {msg.content.includes('[Image uploaded:') && msg.content.includes('https://') ? (
                                <div className="space-y-2">
                                  <p className="text-sm text-opacity-80">📷 Image uploaded</p>
                                  <img src={msg.content.split('\n').pop() || ''} alt="Uploaded"
                                    className="max-w-full rounded-lg max-h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                    onClick={() => window.open(msg.content.split('\n').pop(), '_blank')} />
                                </div>
                              ) : (
                                <p className="text-xs whitespace-pre-wrap leading-relaxed text-left">{msg.content}</p>
                              )}
                              <p className="text-xs mt-1.5 text-right text-white/70">{format(new Date(msg.created_at), 'h:mm a')}</p>
                            </div>
                          </div>
                        </div>
                      );

                      const agentReply = localAgentMessages[index];
                      if (agentReply) {
                        allItems.push(
                          <div key={`local-agent-${index}`} className="flex gap-3 items-end animate-fade-in">
                            <div className="h-9 w-9 flex items-center justify-center flex-shrink-0 shadow-sm overflow-hidden"
                              style={{ background: displayAvatar ? 'transparent' : 'var(--widget-primary)', borderRadius: buttonRadius }}>
                              {displayAvatar ? <img src={displayAvatar} alt={displayName} className="h-full w-full object-cover" /> : <MessageCircle className="h-4 w-4 text-white" />}
                            </div>
                            <div className="flex flex-col">
                              <div className="bg-card px-4 py-3 shadow-sm border border-border/30 text-xs text-foreground"
                                style={{ borderRadius: `${messageRadiusLarge} ${messageRadiusLarge} ${messageRadiusLarge} ${messageRadiusSmall}` }}>
                                {agentReply.text}
                              </div>
                              <span className="text-[10px] text-muted-foreground/60 mt-1 px-1">{format(agentReply.time, 'h:mm a')}</span>
                            </div>
                          </div>
                        );
                      }
                    });

                    return allItems;
                  }

                  const toTime = (value: string) => {
                    const timestamp = new Date(value).getTime();
                    return Number.isNaN(timestamp) ? 0 : timestamp;
                  };

                  const orderedMessages = [...messages].sort((a, b) => {
                    const aSeq = typeof a.sequence_number === 'number' ? a.sequence_number : null;
                    const bSeq = typeof b.sequence_number === 'number' ? b.sequence_number : null;

                    if (aSeq !== null && bSeq !== null && aSeq !== bSeq) return aSeq - bSeq;
                    if (aSeq !== null && bSeq === null) return -1;
                    if (aSeq === null && bSeq !== null) return 1;

                    const timeDiff = toTime(a.created_at) - toTime(b.created_at);
                    if (timeDiff !== 0) return timeDiff;

                    return a.id.localeCompare(b.id);
                  });

                  return orderedMessages.map((msg, index) => {
                    const isVisitor = msg.sender_type === 'visitor';

                    if (isVisitor) {
                      return (
                        <div key={msg.id} className="flex gap-3 flex-row-reverse animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
                          <div className="max-w-[75%]">
                            <div className="px-4 py-3 shadow-sm"
                              style={{ background: 'var(--widget-primary)', color: 'white', borderRadius: `${messageRadiusLarge} ${messageRadiusLarge} ${messageRadiusSmall} ${messageRadiusLarge}` }}>
                              {msg.content.includes('[Image uploaded:') && msg.content.includes('https://') ? (
                                <div className="space-y-2">
                                  <p className="text-sm text-opacity-80">📷 Image uploaded</p>
                                  <img src={msg.content.split('\n').pop() || ''} alt="Uploaded"
                                    className="max-w-full rounded-lg max-h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                    onClick={() => window.open(msg.content.split('\n').pop(), '_blank')} />
                                </div>
                              ) : (
                                <p className="text-xs whitespace-pre-wrap leading-relaxed text-left">{msg.content}</p>
                              )}
                              <p className="text-xs mt-1.5 text-right text-white/70">{format(new Date(msg.created_at), 'h:mm a')}</p>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    const msgAgentName = msg.agent_name || displayName;
                    const msgAgentAvatar = msg.agent_avatar || displayAvatar;

                    return (
                      <div key={msg.id} className="flex gap-3 animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
                        <div className="h-9 w-9 flex items-center justify-center flex-shrink-0 shadow-sm overflow-hidden"
                          style={{ background: msgAgentAvatar ? 'transparent' : 'var(--widget-primary)', borderRadius: buttonRadius }}>
                          {msgAgentAvatar ? <img src={msgAgentAvatar} alt={msgAgentName} className="h-full w-full object-cover" /> : <MessageCircle className="h-4 w-4 text-white" />}
                        </div>
                        <div className="max-w-[75%] flex flex-col">
                          <div className="px-4 py-3 shadow-sm bg-card border border-border/30"
                            style={{ borderRadius: `${messageRadiusLarge} ${messageRadiusLarge} ${messageRadiusLarge} ${messageRadiusSmall}` }}>
                            <p className="text-xs whitespace-pre-wrap leading-relaxed text-left">{msg.content}</p>
                            <p className="text-xs mt-1.5 text-right text-muted-foreground">{format(new Date(msg.created_at), 'h:mm a')}</p>
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}

                {!hardcodedMessages && isTyping && (
                  <div className="flex gap-3 items-end animate-fade-in">
                    <div 
                      className="h-9 w-9 flex items-center justify-center flex-shrink-0 shadow-sm overflow-hidden"
                      style={{ background: displayAvatar ? 'transparent' : 'var(--widget-primary)', borderRadius: buttonRadius }}
                    >
                      {displayAvatar ? (
                        <img src={displayAvatar} alt={displayName} className="h-full w-full object-cover" />
                      ) : (
                        <MessageCircle className="h-4 w-4 text-white" />
                      )}
                    </div>
                    <div className="flex flex-col">
                      <div 
                        className="bg-card px-4 py-3 shadow-sm border border-border/30"
                        style={{ borderRadius: `${messageRadiusLarge} ${messageRadiusLarge} ${messageRadiusLarge} ${messageRadiusSmall}` }}
                      >
                        <div className="flex gap-1.5">
                          <span className="h-2 w-2 bg-muted-foreground/40 rounded-full animate-typing-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="h-2 w-2 bg-muted-foreground/40 rounded-full animate-typing-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="h-2 w-2 bg-muted-foreground/40 rounded-full animate-typing-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Closing agent message injected locally after autoplay ends */}
                {closingMessage && (
                  <div className="flex gap-3 items-end animate-fade-in">
                    <div 
                      className="h-9 w-9 flex items-center justify-center flex-shrink-0 shadow-sm overflow-hidden"
                      style={{ background: displayAvatar ? 'transparent' : 'var(--widget-primary)', borderRadius: buttonRadius }}
                    >
                      {displayAvatar ? (
                        <img src={displayAvatar} alt={displayName} className="h-full w-full object-cover" />
                      ) : (
                        <MessageCircle className="h-4 w-4 text-white" />
                      )}
                    </div>
                    <div className="flex flex-col">
                      <div 
                        className="bg-card px-4 py-3 shadow-sm border border-border/30 text-sm text-foreground max-w-[240px]"
                        style={{ borderRadius: `${messageRadiusLarge} ${messageRadiusLarge} ${messageRadiusLarge} ${messageRadiusSmall}` }}
                      >
                        {closingMessage.text}
                      </div>
                      <span className="text-[10px] text-muted-foreground/60 mt-1 px-1">
                        {format(closingMessage.time, 'h:mm a')}
                      </span>
                    </div>
                  </div>
                )}

                {/* Agent closing typing indicator */}
                {agentClosingTyping && (
                  <div className="flex gap-3 items-end animate-fade-in">
                    <div 
                      className="h-9 w-9 flex items-center justify-center flex-shrink-0 shadow-sm overflow-hidden"
                      style={{ background: displayAvatar ? 'transparent' : 'var(--widget-primary)', borderRadius: buttonRadius }}
                    >
                      {displayAvatar ? (
                        <img src={displayAvatar} alt={displayName} className="h-full w-full object-cover" />
                      ) : (
                        <MessageCircle className="h-4 w-4 text-white" />
                      )}
                    </div>
                    <div className="flex flex-col">
                      <div 
                        className="bg-card px-4 py-3 shadow-sm border border-border/30"
                        style={{ borderRadius: `${messageRadiusLarge} ${messageRadiusLarge} ${messageRadiusLarge} ${messageRadiusSmall}` }}
                      >
                        <div className="flex gap-1.5">
                          <span className="h-2 w-2 bg-muted-foreground/40 rounded-full animate-typing-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="h-2 w-2 bg-muted-foreground/40 rounded-full animate-typing-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="h-2 w-2 bg-muted-foreground/40 rounded-full animate-typing-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {!hardcodedMessages && visitorTyping && (
                  <div className="flex gap-3 items-end justify-end animate-fade-in">
                    <div className="flex flex-col items-end">
                      <div 
                        className="px-4 py-3 shadow-sm text-white"
                        style={{ background: 'var(--widget-primary)', borderRadius: `${messageRadiusLarge} ${messageRadiusLarge} ${messageRadiusSmall} ${messageRadiusLarge}` }}
                      >
                        <div className="flex gap-1.5">
                          <span className="h-2 w-2 bg-white/50 rounded-full animate-typing-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="h-2 w-2 bg-white/50 rounded-full animate-typing-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="h-2 w-2 bg-white/50 rounded-full animate-typing-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input or Demo CTA */}
              {demoOverlay ? (
                <div className="flex-shrink-0 p-4 border-t border-border/30 bg-card/80 backdrop-blur-sm">
                  <button
                    onClick={onStartOwnChat}
                    className="w-full py-3 px-4 text-white font-semibold text-sm transition-all duration-300 hover:opacity-90 hover:scale-[1.02] active:scale-95 shadow-lg flex items-center justify-center gap-2 animate-demo-cta"
                    style={{ background: 'var(--widget-primary)', borderRadius: `${Math.min(borderRadius, 16)}px` }}
                  >
                    <MessageCircle className="h-4 w-4" />
                    Start Your Own Chat
                  </button>
                </div>
              ) : (
                <div className="flex-shrink-0 p-3 border-t border-border/30 bg-card/80 backdrop-blur-sm">
                  <div className="flex gap-2 items-center">
                    {/* Hidden file input */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    {/* Image upload button */}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImage}
                      className="h-10 w-10 flex-shrink-0 flex items-center justify-center border border-border/50 bg-background/80 text-muted-foreground hover:text-foreground hover:bg-background transition-all duration-300 disabled:opacity-50"
                      style={{ borderRadius: buttonRadius }}
                      title="Upload image"
                    >
                      {uploadingImage ? (
                        <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <ImagePlus className="h-4 w-4" />
                      )}
                    </button>
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Share what's on your mind..."
                      className="flex-1 min-w-0 px-4 py-2.5 border border-border/50 bg-background/80 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all duration-300 placeholder:text-muted-foreground/60"
                      style={{ borderRadius: `${Math.min(borderRadius, 24)}px` }}
                    />
                    <button
                      onClick={handleSend}
                      disabled={!inputValue.trim()}
                      className="h-10 w-10 flex-shrink-0 flex items-center justify-center text-white disabled:opacity-50 transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg"
                      style={{ background: 'var(--widget-primary)', borderRadius: buttonRadius }}
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Effect keyframes */}
      <style>{`
        @keyframes demo-cta-glow {
          0%, 100% { box-shadow: 0 4px 15px rgba(249, 115, 22, 0.3); }
          50% { box-shadow: 0 4px 25px rgba(249, 115, 22, 0.5); }
        }
        .animate-demo-cta { animation: demo-cta-glow 2s ease-in-out infinite; }
        @keyframes widget-pulse {
          0%, 100% { transform: scale(1); box-shadow: 0 4px 15px rgba(0,0,0,0.2); }
          50% { transform: scale(${effectIntensity === 'subtle' ? 1.05 : effectIntensity === 'strong' ? 1.15 : 1.1}); box-shadow: 0 8px 30px rgba(0,0,0,0.3); }
        }
        @keyframes widget-bounce {
          0%, 100% { transform: translateY(0); }
          30% { transform: translateY(-${effectIntensity === 'subtle' ? 6 : effectIntensity === 'strong' ? 16 : 10}px); }
          50% { transform: translateY(0); }
          70% { transform: translateY(-${effectIntensity === 'subtle' ? 3 : effectIntensity === 'strong' ? 8 : 5}px); }
        }
        @keyframes widget-wiggle {
          0%, 100% { transform: rotate(0deg); }
          20% { transform: rotate(${effectIntensity === 'subtle' ? 5 : effectIntensity === 'strong' ? 15 : 10}deg); }
          40% { transform: rotate(-${effectIntensity === 'subtle' ? 5 : effectIntensity === 'strong' ? 15 : 10}deg); }
          60% { transform: rotate(${effectIntensity === 'subtle' ? 3 : effectIntensity === 'strong' ? 10 : 6}deg); }
          80% { transform: rotate(-${effectIntensity === 'subtle' ? 3 : effectIntensity === 'strong' ? 10 : 6}deg); }
        }
        @keyframes widget-heartbeat {
          0%, 100% { transform: scale(1); }
          15% { transform: scale(${effectIntensity === 'subtle' ? 1.08 : effectIntensity === 'strong' ? 1.2 : 1.14}); }
          30% { transform: scale(1); }
          45% { transform: scale(${effectIntensity === 'subtle' ? 1.05 : effectIntensity === 'strong' ? 1.15 : 1.1}); }
          60% { transform: scale(1); }
        }
        @keyframes widget-ring-ripple {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(${effectIntensity === 'subtle' ? 1.6 : effectIntensity === 'strong' ? 2.2 : 1.8}); opacity: 0; }
        }
      `}</style>

      {/* Floating Button */}
      {!isOpen && !isClosing && (
        <div className="relative pointer-events-auto">
          {/* Ring ripple effect */}
          {ringActive && effectType === 'ring' && (
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: `color-mix(in srgb, ${primaryColor} 40%, transparent)`,
                animation: 'widget-ring-ripple 1.2s ease-out forwards',
              }}
            />
          )}
          <button
            onClick={() => {
              setShowAttentionBounce(false);
              setIsOpen(true);
            }}
            className={cn(
              "flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 shadow-lg",
              showAttentionBounce && "animate-attention-bounce"
            )}
            onAnimationEnd={() => setShowAttentionBounce(false)}
            style={{ 
              background: 'var(--widget-primary)', 
              borderRadius: buttonRadius,
              width: `${currentSize.button}px`,
              height: `${currentSize.button}px`,
              color: textColor,
              border: `2px solid color-mix(in srgb, ${primaryColor} 70%, white 30%)`,
              boxSizing: 'border-box',
              ...getEffectStyle(),
            }}
          >
            <WidgetIconComponent className={cn(
              widgetSize === 'small' ? 'h-5 w-5' : widgetSize === 'medium' ? 'h-7 w-7' : 'h-8 w-8'
            )} />
          </button>
        </div>
      )}
    </div>
  );
};

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
