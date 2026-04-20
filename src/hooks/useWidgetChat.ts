import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { maybeDropCapitalization, maybeDropApostrophes } from '@/utils/typoInjector';

declare global {
  interface Window {
    __scaledbot_session_id?: string;
  }
}

interface Message {
  id: string;
  content: string;
  sender_type: 'agent' | 'visitor';
  created_at: string;
  sequence_number?: number;
  agent_name?: string;
  agent_avatar?: string | null;
}

export interface AIAgent {
  id: string;
  name: string;
  avatar_url: string | null;
  personality_prompt: string | null;
}

interface PropertySettings {
  ai_response_delay_min_ms: number;
  ai_response_delay_max_ms: number;
  typing_indicator_min_ms: number;
  typing_indicator_max_ms: number;
  smart_typing_enabled: boolean;
  typing_wpm: number;
  max_ai_messages_before_escalation: number;
  escalation_keywords: string[];
  auto_escalation_enabled: boolean;
  require_email_before_chat: boolean;
  require_name_before_chat: boolean;
  require_phone_before_chat: boolean;
  require_insurance_card_before_chat: boolean;
  insurance_collection_prompt: string | null;
  natural_lead_capture_enabled: boolean;
  proactive_message_enabled: boolean;
  proactive_message: string | null;
  proactive_message_delay_seconds: number;
  greeting: string | null;
  ai_base_prompt: string | null;
  widget_icon: string | null;
  calendly_url: string | null;
  drop_capitalization_enabled: boolean;
  drop_apostrophes_enabled: boolean;
  quick_reply_after_first_enabled: boolean;
  business_phone: string | null;
  business_email: string | null;
  business_address: string | null;
  business_hours: string | null;
  business_description: string | null;
  property_name: string | null;
}

interface WidgetChatConfig {
  propertyId: string;
  greeting?: string;
  isPreview?: boolean;
}

const DEFAULT_SETTINGS: PropertySettings = {
  ai_response_delay_min_ms: 15000,
  ai_response_delay_max_ms: 15000,
  typing_indicator_min_ms: 1500,
  typing_indicator_max_ms: 3000,
  smart_typing_enabled: true,
  typing_wpm: 60,
  max_ai_messages_before_escalation: 5,
  escalation_keywords: ['crisis', 'emergency', 'suicide', 'help me', 'urgent'],
  auto_escalation_enabled: true,
  require_email_before_chat: false,
  require_name_before_chat: true,
  require_phone_before_chat: true,
  require_insurance_card_before_chat: true,
  insurance_collection_prompt: null,
  natural_lead_capture_enabled: true,
  proactive_message_enabled: false,
  proactive_message: null,
  proactive_message_delay_seconds: 30,
  greeting: null,
  ai_base_prompt: null,
  widget_icon: 'message-circle',
  calendly_url: null,
  drop_capitalization_enabled: true,
  drop_apostrophes_enabled: true,
  quick_reply_after_first_enabled: false,
  business_phone: null,
  business_email: null,
  business_address: null,
  business_hours: null,
  business_description: null,
  property_name: null,
};

const getOrCreateSessionId = (): string => {
  const key = 'chat_session_id';
  try {
    let sessionId = localStorage.getItem(key);
    if (!sessionId) {
      sessionId = `sess-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem(key, sessionId);
    }
    return sessionId;
  } catch {
    // Some browsers block localStorage in 3rd-party iframes; fall back to in-memory.
    if (!window.__scaledbot_session_id) {
      window.__scaledbot_session_id = `sess-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }
    return window.__scaledbot_session_id;
  }
};

const getBrowserInfo = (): string => {
  const ua = navigator.userAgent;
  let browser = 'Unknown';
  
  if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Safari')) browser = 'Safari';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Edge')) browser = 'Edge';
  
  const os = ua.includes('Windows') ? 'Windows' 
    : ua.includes('Mac') ? 'macOS' 
    : ua.includes('Linux') ? 'Linux' 
    : ua.includes('Android') ? 'Android' 
    : ua.includes('iOS') ? 'iOS' 
    : 'Unknown';
  
  return `${browser}, ${os}`;
};

const getParentPageUrl = (): string | null => {
  // Prefer the parentUrl query param injected by the embed script (most reliable).
  try {
    const params = new URLSearchParams(window.location.search);
    const parentUrl = params.get('parentUrl');
    if (parentUrl) return parentUrl;
  } catch {
    // ignore
  }

  // Fallback: document.referrer (unreliable — can be stripped by referrer policies).
  const ref = document.referrer;
  if (!ref) return null;

  // Avoid self-reporting the embed URL.
  if (ref.includes('/widget-embed/')) return null;
  return ref;
};

const getEffectivePageUrl = (): string => {
  return getParentPageUrl() ?? window.location.href;
};

const getEffectivePagePath = (): string => {
  const parentUrl = getParentPageUrl();
  if (!parentUrl) return window.location.pathname;

  try {
    const u = new URL(parentUrl);
    // Keep query params for attribution/debugging.
    return `${u.pathname}${u.search}`;
  } catch {
    return parentUrl;
  }
};

const getPageInfo = () => {
  const url = getEffectivePageUrl();
  const pageTitle = url === window.location.href ? document.title : null;
  return { url, pageTitle };
};

// Extract GCLID and other tracking parameters from URL
const getTrackingParams = () => {
  const parentUrl = getParentPageUrl();
  const params = parentUrl
    ? (() => {
        try {
          return new URL(parentUrl).searchParams;
        } catch {
          return new URLSearchParams();
        }
      })()
    : new URLSearchParams(window.location.search);

  return {
    gclid: params.get('gclid') || null, // Google Click ID
  };
};

const randomInRange = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-ai`;
const TRACK_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/track-page-analytics`;
const LOCATION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-visitor-location`;
const UPDATE_VISITOR_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-visitor`;
const BOOTSTRAP_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/widget-bootstrap`;
const SAVE_MESSAGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/widget-save-message`;
const SET_AI_QUEUE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/widget-set-ai-queue`;

// Secure visitor update through edge function
const updateVisitorSecure = async (
  visitorId: string,
  sessionId: string,
  updates: Record<string, unknown>
) => {
  try {
    const response = await fetch(UPDATE_VISITOR_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ visitorId, sessionId, updates }),
    });
    
    if (!response.ok) {
      console.error('Failed to update visitor:', await response.text());
    }
  } catch (error) {
    console.error('Error updating visitor:', error);
  }
};

// Mark the conversation as active/closed based on widget visibility.
// Uses a lightweight RPC function instead of an Edge Function to eliminate
// HTTP overhead and cold starts (runs as a single SQL call).
const updateConversationPresenceSecure = async (args: {
  propertyId: string;
  visitorId: string;
  sessionId: string;
  status: 'active' | 'closed';
}) => {
  try {
    const { error } = await supabase.rpc('touch_conversation_presence', {
      p_visitor_id: args.visitorId,
      p_session_id: args.sessionId,
      p_status: args.status,
    });
    if (error) {
      console.error('Failed to update conversation presence:', error.message);
    }
  } catch (error) {
    // Swallow errors (especially on unload), but log in case it's systematic.
    console.error('Error updating conversation presence:', error);
  }
};

const fetchVisitorLocation = async (visitorId: string) => {
  try {
    await fetch(LOCATION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ visitorId }),
    });
  } catch (error) {
    console.error('Failed to fetch visitor location:', error);
  }
};

  const trackAnalyticsEvent = async (
  propertyId: string,
  eventType: 'chat_open' | 'human_escalation'
) => {
  const { url, pageTitle } = getPageInfo();
  try {
    await fetch(TRACK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({
        property_id: propertyId,
        url,
          page_title: pageTitle,
        event_type: eventType,
      }),
    });
  } catch (error) {
    console.error('Failed to track analytics event:', error);
  }
};

function buildBusinessContext(s: PropertySettings): string | null {
  const parts: string[] = [];
  if (s.property_name) parts.push(`Business name: ${s.property_name}`);
  if (s.business_description) parts.push(`Description: ${s.business_description}`);
  if (s.business_phone) parts.push(`Phone: ${s.business_phone}`);
  if (s.business_email) parts.push(`Email: ${s.business_email}`);
  if (s.business_address) parts.push(`Address: ${s.business_address}`);
  if (s.business_hours) parts.push(`Hours: ${s.business_hours}`);
  return parts.length > 0 ? parts.join('\n') : null;
}

async function streamAIResponse({
  messages,
  onDelta,
  onDone,
  onError,
  personalityPrompt,
  agentName,
  basePrompt,
  naturalLeadCaptureFields,
  calendlyUrl,
  propertyContext,
  insuranceCollectionPrompt,
  signal,
}: {
  messages: { role: 'user' | 'assistant'; content: string }[];
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
  personalityPrompt?: string | null;
  agentName?: string;
  basePrompt?: string | null;
  naturalLeadCaptureFields?: string[];
  calendlyUrl?: string | null;
  propertyContext?: string | null;
  insuranceCollectionPrompt?: string | null;
  signal?: AbortSignal;
}) {
  try {
    const resp = await fetch(CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ messages, personalityPrompt, agentName, basePrompt, naturalLeadCaptureFields, calendlyUrl, propertyContext, insuranceCollectionPrompt }),
      signal,
    });

    if (!resp.ok) {
      const error = await resp.json();
      onError(error.error || 'Failed to get AI response');
      return;
    }

    if (!resp.body) {
      onError('No response body');
      return;
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = '';
    let streamDone = false;

    while (!streamDone) {
      if (signal?.aborted) {
        reader.cancel();
        return; // Silently abort — caller handles cleanup
      }
      const { done, value } = await reader.read();
      if (done) break;
      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);

        if (line.endsWith('\r')) line = line.slice(0, -1);
        if (line.startsWith(':') || line.trim() === '') continue;
        if (!line.startsWith('data: ')) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === '[DONE]') {
          streamDone = true;
          break;
        }

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) onDelta(content);
        } catch {
          textBuffer = line + '\n' + textBuffer;
          break;
        }
      }
    }

    if (signal?.aborted) return; // Aborted during final flush — skip

    // Final flush
    if (textBuffer.trim()) {
      for (let raw of textBuffer.split('\n')) {
        if (!raw) continue;
        if (raw.endsWith('\r')) raw = raw.slice(0, -1);
        if (raw.startsWith(':') || raw.trim() === '') continue;
        if (!raw.startsWith('data: ')) continue;
        const jsonStr = raw.slice(6).trim();
        if (jsonStr === '[DONE]') continue;
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) onDelta(content);
        } catch { /* ignore */ }
      }
    }

    onDone();
  } catch (error) {
    // AbortError is expected when we cancel — don't log it as an error
    if (error instanceof Error && error.name === 'AbortError') return;
    console.error('Stream error:', error);
    onError('Connection error. Please try again.');
  }
}

export const useWidgetChat = ({ propertyId, greeting, isPreview = false }: WidgetChatConfig) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [visitorId, setVisitorId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [chatOpenTracked, setChatOpenTracked] = useState(false);
  const [humanEscalationTracked, setHumanEscalationTracked] = useState(false);
  const [settings, setSettings] = useState<PropertySettings>(DEFAULT_SETTINGS);
  const [isEscalated, setIsEscalated] = useState(false); // Escalation triggered (conversation visible to agents)
  const [humanHasTakenOver, setHumanHasTakenOver] = useState(false); // Human agent has actually responded
  const [requiresLeadCapture, setRequiresLeadCapture] = useState(false);
  const [visitorInfo, setVisitorInfo] = useState<{ name?: string; email?: string }>({});
  const [showProactiveMessage, setShowProactiveMessage] = useState(false);
  const [aiAgents, setAiAgents] = useState<AIAgent[]>([]);
  const [currentAiAgent, setCurrentAiAgent] = useState<AIAgent | null>(null);
  const [greetingText, setGreetingText] = useState<string>(''); // Static greeting from property settings
  const [geoBlocked, setGeoBlocked] = useState(false);
  const [geoBlockedMessage, setGeoBlockedMessage] = useState<string>('');
  
  const aiMessageCountRef = useRef(0);
  const proactiveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aiAgentIndexRef = useRef(0);
  const visitorIdRef = useRef<string | null>(null); // Ref to track current visitor ID for extraction
  const conversationIdRef = useRef<string | null>(null);
  const bootstrapPromiseRef = useRef<Promise<void> | null>(null); // Mutex for ensureWidgetIds
  
  const lastSeqRef = useRef<number>(0); // Track last sequence number for message polling
  const humanHasTakenOverRef = useRef(false); // True only when a human agent has actually responded
  const aiEnabledRef = useRef<boolean>(true); // Tracks dashboard AI toggle (do not conflate with human takeover)
  const prevAiEnabledRef = useRef<boolean | null>(null);
  const autoReplyInFlightRef = useRef(false);
  const lastAutoReplyVisitorSeqRef = useRef<number>(0);
  // True while sendMessage's hybrid flow (generate→queue→wait→send) is in progress.
  // Prevents autoReplyIfPending from firing a duplicate AI message for the same visitor turn.
  const hybridFlowActiveRef = useRef(false);
  // AbortController for the currently in-flight AI stream. When a new visitor message
  // arrives mid-generation, we abort the old stream so it never calls onDone, then
  // wait for the flow lock to release before running ONE fresh generation with the
  // full updated history.
  const aiAbortControllerRef = useRef<AbortController | null>(null);
  // Monotonically increasing counter: each sendMessage call increments this.
  // During the hybrid flow, the flow checks whether its own generation matches the current
  // value — if not, a newer message has arrived and this flow should abort.
  const aiGenerationIdRef = useRef(0);
  // Ref that always tracks the latest messages array for use in callbacks without stale closures
  const messagesRef = useRef<Message[]>([]);
  // Realtime-driven conversation state (updated by subscription, consumed by hybrid flow)
  const convStateRef = useRef<{
    aiQueuedAt: string | null;
    aiQueuedPaused: boolean;
    aiQueuedPreview: string | null;
    aiQueuedWindowMs: number | null;
    aiEnabled: boolean;
  }>({
    aiQueuedAt: null,
    aiQueuedPaused: false,
    aiQueuedPreview: null,
    aiQueuedWindowMs: null,
    aiEnabled: true,
  });

  const calculateTypingTimeMs = useCallback((text: string): number => {
    const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
    const wordsPerSecond = (settings.typing_wpm || DEFAULT_SETTINGS.typing_wpm) / 60;
    return Math.ceil((wordCount / wordsPerSecond) * 1000);
  }, [settings.typing_wpm]);

  const toAiHistoryFromDb = useCallback((dbMessages: { sender_type: string; content: string }[]) => {
    // Keep greeting/proactive out of the AI history; proactive is UI-only anyway.
    return dbMessages
      .filter(m => String(m.content || '').trim() !== '')
      .map(m => ({
        role: m.sender_type === 'visitor' ? 'user' as const : 'assistant' as const,
        content: String(m.content),
      }));
  }, []);


  // --- Shared helpers to avoid duplication across autoReply, hybrid flow, and preview ---
  const buildNaturalLeadCaptureFields = useCallback((): string[] => {
    const fields: string[] = [];
    if (settings.natural_lead_capture_enabled) {
      // Always collect name and phone conversationally when natural lead capture is enabled
      // The require_*_before_chat flags are for pre-chat gates, not conversational collection
      fields.push('name');
      fields.push('phone');
      if (settings.require_email_before_chat) fields.push('email');
      if (settings.require_insurance_card_before_chat) fields.push('insurance_card');
    }
    return fields;
  }, [settings.natural_lead_capture_enabled, settings.require_email_before_chat, settings.require_insurance_card_before_chat]);

  const computeResponseDelay = useCallback((opts?: { demoOrPreview?: boolean }): number => {
    if (opts?.demoOrPreview) return randomInRange(1000, 2000);
    const isFirst = aiMessageCountRef.current === 0;
    const useQuickReply = settings.quick_reply_after_first_enabled && !isFirst;
    return useQuickReply
      ? randomInRange(5000, 5000)
      : randomInRange(settings.ai_response_delay_min_ms, settings.ai_response_delay_max_ms);
  }, [settings.quick_reply_after_first_enabled, settings.ai_response_delay_min_ms, settings.ai_response_delay_max_ms]);

  // These are now handled by the consolidated widget-bootstrap call.

  // Cycle to next AI agent
  const cycleToNextAgent = useCallback(() => {
    if (aiAgents.length <= 1) return;
    
    aiAgentIndexRef.current = (aiAgentIndexRef.current + 1) % aiAgents.length;
    setCurrentAiAgent(aiAgents[aiAgentIndexRef.current]);
  }, [aiAgents]);

  // Apply settings from bootstrap response
  const applySettings = useCallback((s: Record<string, unknown>): PropertySettings => {
    const merged: PropertySettings = {
      ...DEFAULT_SETTINGS,
      ai_response_delay_min_ms: (s.ai_response_delay_min_ms as number) ?? DEFAULT_SETTINGS.ai_response_delay_min_ms,
      ai_response_delay_max_ms: (s.ai_response_delay_max_ms as number) ?? DEFAULT_SETTINGS.ai_response_delay_max_ms,
      typing_indicator_min_ms: (s.typing_indicator_min_ms as number) ?? DEFAULT_SETTINGS.typing_indicator_min_ms,
      typing_indicator_max_ms: (s.typing_indicator_max_ms as number) ?? DEFAULT_SETTINGS.typing_indicator_max_ms,
      smart_typing_enabled: (s.smart_typing_enabled as boolean) ?? DEFAULT_SETTINGS.smart_typing_enabled,
      typing_wpm: (s.typing_wpm as number) ?? DEFAULT_SETTINGS.typing_wpm,
      max_ai_messages_before_escalation: (s.max_ai_messages_before_escalation as number) ?? DEFAULT_SETTINGS.max_ai_messages_before_escalation,
      escalation_keywords: (s.escalation_keywords as string[]) ?? DEFAULT_SETTINGS.escalation_keywords,
      auto_escalation_enabled: (s.auto_escalation_enabled as boolean) ?? DEFAULT_SETTINGS.auto_escalation_enabled,
      require_email_before_chat: (s.require_email_before_chat as boolean) ?? DEFAULT_SETTINGS.require_email_before_chat,
      require_name_before_chat: (s.require_name_before_chat as boolean) ?? DEFAULT_SETTINGS.require_name_before_chat,
      require_phone_before_chat: (s.require_phone_before_chat as boolean) ?? DEFAULT_SETTINGS.require_phone_before_chat,
      require_insurance_card_before_chat: (s.require_insurance_card_before_chat as boolean) ?? DEFAULT_SETTINGS.require_insurance_card_before_chat,
      insurance_collection_prompt: (s as any).insurance_collection_prompt ?? null,
      natural_lead_capture_enabled: (s.natural_lead_capture_enabled as boolean) ?? DEFAULT_SETTINGS.natural_lead_capture_enabled,
      proactive_message_enabled: (s.proactive_message_enabled as boolean) ?? DEFAULT_SETTINGS.proactive_message_enabled,
      proactive_message: (s.proactive_message as string) ?? null,
      proactive_message_delay_seconds: (s.proactive_message_delay_seconds as number) ?? DEFAULT_SETTINGS.proactive_message_delay_seconds,
      greeting: (s.greeting as string) ?? null,
      ai_base_prompt: (s.ai_base_prompt as string) ?? null,
      widget_icon: (s.widget_icon as string) ?? DEFAULT_SETTINGS.widget_icon,
      calendly_url: (s.calendly_url as string) ?? null,
      drop_capitalization_enabled: (s.drop_capitalization_enabled as boolean) ?? DEFAULT_SETTINGS.drop_capitalization_enabled,
      drop_apostrophes_enabled: (s.drop_apostrophes_enabled as boolean) ?? DEFAULT_SETTINGS.drop_apostrophes_enabled,
      quick_reply_after_first_enabled: (s.quick_reply_after_first_enabled as boolean) ?? DEFAULT_SETTINGS.quick_reply_after_first_enabled,
      business_phone: (s.business_phone as string) ?? null,
      business_email: (s.business_email as string) ?? null,
      business_address: (s.business_address as string) ?? null,
      business_hours: (s.business_hours as string) ?? null,
      business_description: (s.business_description as string) ?? null,
      property_name: (s.name as string) ?? null,
    };

    setSettings(merged);

    const naturalEnabled = merged.natural_lead_capture_enabled ?? true;
    if (!naturalEnabled && (merged.require_email_before_chat || merged.require_name_before_chat)) {
      setRequiresLeadCapture(true);
    } else {
      setRequiresLeadCapture(false);
    }

    return merged;
  }, []);

  const ensureWidgetIds = useCallback(async () => {
    if (!propertyId || propertyId === 'demo' || isPreview) return;
    if (visitorIdRef.current) return; // Already have visitor

    // Mutex: if another call is already bootstrapping, piggyback on it
    if (bootstrapPromiseRef.current) {
      await bootstrapPromiseRef.current;
      return;
    }

    const doBootstrap = async () => {

    const sessionId = getOrCreateSessionId();
    const trackingParams = getTrackingParams();

    try {
      const response = await fetch(BOOTSTRAP_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          propertyId,
          sessionId,
          currentPage: getEffectivePagePath(),
          browserInfo: getBrowserInfo(),
          gclid: trackingParams.gclid,
        }),
      });

      if (!response.ok) {
        console.error('Widget bootstrap failed:', response.status, await response.text());
        return;
      }

      const data = await response.json();

      // Handle geo-blocking
      if (data?.geoBlocked) {
        setGeoBlocked(true);
        setGeoBlockedMessage(data.geoBlockedMessage || "We're sorry, our services are currently not available in your area.");
        setLoading(false);
        return;
      }

      if (data?.visitorId) {
        setVisitorId(data.visitorId);
        visitorIdRef.current = data.visitorId;
      }
      // Store greeting from property settings for static display
      if (data?.greeting) {
        setGreetingText(data.greeting);
      }
      if (data?.conversationId) {
        setConversationId(data.conversationId);
        conversationIdRef.current = data.conversationId;
      }
      if (data?.visitorInfo) {
        setVisitorInfo({
          name: data.visitorInfo?.name || undefined,
          email: data.visitorInfo?.email || undefined,
        });
        if (data.visitorInfo?.name || data.visitorInfo?.email) {
          setRequiresLeadCapture(false);
        }
      }

      // Apply settings and AI agents from consolidated bootstrap response
      let bootstrapAgents: AIAgent[] = [];
      if (data?.settings) {
        applySettings(data.settings);
      }
      if (data?.aiAgents && Array.isArray(data.aiAgents) && data.aiAgents.length > 0) {
        bootstrapAgents = data.aiAgents;
        setAiAgents(data.aiAgents);
        setCurrentAiAgent(data.aiAgents[0]);
        // Cache agent info so repeat visits render instantly with no flash
        try {
          const { name, avatar_url } = data.aiAgents[0];
          localStorage.setItem(`ca-agent-${propertyId}`, JSON.stringify({ name, avatar_url }));
        } catch {}
      } else {
        setAiAgents([]);
        setCurrentAiAgent(null);
      }

      // Optimization #4: Use messages from bootstrap response (no separate GET_MESSAGES call)
      if (data?.visitorId && data?.conversationId) {
        const existingMessages = data.messages || [];
        // Track current AI enabled state from server.
        aiEnabledRef.current = (data?.aiEnabled ?? true) as boolean;
        prevAiEnabledRef.current = aiEnabledRef.current;
        // Initialize Realtime-driven conversation state
        convStateRef.current = {
          aiQueuedAt: data?.aiQueuedAt ?? null,
          aiQueuedPaused: data?.aiQueuedPaused ?? false,
          aiQueuedPreview: data?.aiQueuedPreview ?? null,
          aiQueuedWindowMs: data?.aiQueuedWindowMs ?? null,
          aiEnabled: aiEnabledRef.current,
        };
        
        if (existingMessages.length > 0) {
          // Map DB messages to UI format
          const greetingAgent = bootstrapAgents.length > 0 ? bootstrapAgents[0] : null;
          const mappedMessages: Message[] = existingMessages.map((m: { id: string; content: string; sender_type: string; sender_id: string; created_at: string; sequence_number: number }) => ({
            id: m.id,
            content: m.content,
            sender_type: m.sender_type === 'agent' ? 'agent' : 'visitor',
            created_at: m.created_at,
            sequence_number: m.sequence_number,
            agent_name: m.sender_type === 'agent' ? greetingAgent?.name : undefined,
            agent_avatar: m.sender_type === 'agent' ? greetingAgent?.avatar_url : undefined,
          }));

          setMessages(mappedMessages);
          
          // Update lastSeqRef to prevent re-fetching these messages
          const maxSeq = Math.max(...existingMessages.map((m: { sequence_number: number }) => m.sequence_number || 0));
          lastSeqRef.current = maxSeq;

          // Check if a human has taken over (any agent message not from ai-bot)
          const humanAgentMsg = existingMessages.find((m: { sender_type: string; sender_id: string }) => 
            m.sender_type === 'agent' && m.sender_id !== 'ai-bot'
          );
          if (humanAgentMsg) {
            setHumanHasTakenOver(true);
            humanHasTakenOverRef.current = true;
          }
        }
      }

      // Fire-and-forget geolocation fetch
      if (data?.visitorId) {
        fetchVisitorLocation(data.visitorId).catch(() => {});
      }
    } catch (e) {
      console.error('Widget bootstrap error:', e);
    }
    };

    // Set the mutex promise so concurrent callers wait on this one
    bootstrapPromiseRef.current = doBootstrap().finally(() => {
      bootstrapPromiseRef.current = null;
    });
    await bootstrapPromiseRef.current;
  }, [propertyId, isPreview]);


  // Check for escalation keywords in message
  const checkForEscalationKeywords = useCallback((content: string): boolean => {
    if (!settings.auto_escalation_enabled) return false;
    const lowerContent = content.toLowerCase();
    return settings.escalation_keywords.some(keyword => 
      lowerContent.includes(keyword.toLowerCase())
    );
  }, [settings.auto_escalation_enabled, settings.escalation_keywords]);

  // Trigger escalation - silently escalate without announcing to visitor
  const triggerEscalation = useCallback(async () => {
    if (isEscalated) return;
    
    setIsEscalated(true);
    
    // Track escalation event
    if (propertyId && propertyId !== 'demo' && !humanEscalationTracked) {
      setHumanEscalationTracked(true);
      trackAnalyticsEvent(propertyId, 'human_escalation');
    }

    // For preview mode, create a real test conversation in the database
    if (isPreview && propertyId && propertyId !== 'demo') {
      try {
        // Create a test visitor
        const testSessionId = `test-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        const { data: testVisitor, error: visitorError } = await supabase
          .from('visitors')
          .insert({
            property_id: propertyId,
            session_id: testSessionId,
            browser_info: 'Test Widget Preview',
            current_page: '/widget-preview',
          })
          .select()
          .single();

        if (!visitorError && testVisitor) {
          // Fetch geolocation for test visitor (non-blocking)
          fetchVisitorLocation(testVisitor.id);
        }

        if (visitorError || !testVisitor) {
          console.error('Error creating test visitor:', visitorError);
        } else {
          // Create a test conversation marked with is_test = true
          const { data: testConversation, error: convError } = await supabase
            .from('conversations')
            .insert({
              property_id: propertyId,
              visitor_id: testVisitor.id,
              status: 'active',
              is_test: true,
            })
            .select()
            .single();

          if (convError || !testConversation) {
            console.error('Error creating test conversation:', convError);
          } else {
            // Include all messages including the greeting with sequence numbers
            const allMessages = messages.filter(m => m.content.trim() !== '');
            const messagesToSave = allMessages.map((m, index) => ({
              conversation_id: testConversation.id,
              sender_id: m.sender_type === 'visitor' ? testVisitor.id : 'ai-bot',
              sender_type: m.sender_type,
              content: m.content,
              sequence_number: index + 1,
            }));

            if (messagesToSave.length > 0) {
              await supabase.from('messages').insert(messagesToSave);
            }

            setConversationId(testConversation.id);
            setVisitorId(testVisitor.id);
            visitorIdRef.current = testVisitor.id; // Update ref immediately for extraction

            // Visitor info extraction is handled server-side
          }
        }
      } catch (error) {
        console.error('Error creating test conversation:', error);
      }
    } else if (conversationId) {
      // Update existing conversation status to active (for human agent)
      await supabase
        .from('conversations')
        .update({ status: 'active' })
        .eq('id', conversationId);

      // Save the greeting if it exists and hasn't been saved yet
      const greetingMsg = messages.find(m => m.id === 'greeting');
      if (greetingMsg && visitorId) {
        // Check if greeting is already in DB
        const { data: existingMsgs } = await supabase
          .from('messages')
          .select('id')
          .eq('conversation_id', conversationId)
          .limit(1);
        
        // If no messages yet, add the greeting first with sequence_number 1
        if (!existingMsgs || existingMsgs.length === 0) {
          await supabase.from('messages').insert({
            conversation_id: conversationId,
            sender_id: 'ai-bot',
            sender_type: 'agent',
            content: greetingMsg.content,
            sequence_number: 1,
          });
        }
      }

      // Fire escalation notifications (non-blocking)
      const lastVisitorMsg = [...messages].reverse().find(m => m.sender_type === 'visitor');
      const escalationPayload = JSON.stringify({
        propertyId,
        eventType: 'escalation',
        conversationId,
        message: lastVisitorMsg?.content,
      });
      const notifyHeaders = { 'Content-Type': 'application/json' };

      fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email-notification`, {
        method: 'POST',
        headers: notifyHeaders,
        body: escalationPayload,
      }).catch(err => console.error('Escalation email notification error:', err));

      fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-slack-notification`, {
        method: 'POST',
        headers: notifyHeaders,
        body: escalationPayload,
      }).catch(err => console.error('Escalation Slack notification error:', err));

    }

    // NO announcement message - AI will keep chatting until human takes over
    // The conversation is now in 'active' status so human agents can see and respond
  }, [isEscalated, propertyId, humanEscalationTracked, conversationId, isPreview, messages, visitorId]);

  const autoReplyIfPending = useCallback(async () => {
    if (autoReplyInFlightRef.current) return;
    if (hybridFlowActiveRef.current) return; // sendMessage hybrid flow is handling this turn
    if (isTyping) return;
    if (isPreview || !propertyId || propertyId === 'demo') return;

    const convId = conversationIdRef.current;
    const vId = visitorIdRef.current;
    if (!convId || !vId) return;

    // Optimization #5: Use local messages state instead of re-fetching from DB
    const serverAiEnabled = aiEnabledRef.current;
    if (!serverAiEnabled) return;
    if (humanHasTakenOverRef.current) return;

    autoReplyInFlightRef.current = true;

    try {
      // Use current messages from state (set via setMessages) — no DB round-trip needed
      const currentMessages = messagesRef.current;
      const dbMessages = currentMessages
        .filter(m => m.id !== 'proactive' && m.id !== 'greeting')
        .map(m => ({ sender_type: m.sender_type, content: m.content, sequence_number: m.sequence_number }));

      if (dbMessages.length === 0) return;
      const last = dbMessages[dbMessages.length - 1];
      if (last.sender_type !== 'visitor') return;
      const lastVisitorSeq = typeof last.sequence_number === 'number' ? last.sequence_number : 0;
      if (lastVisitorSeq <= lastAutoReplyVisitorSeqRef.current) return;

      // Mark handled so we don't auto-reply repeatedly on subsequent polls.
      lastAutoReplyVisitorSeqRef.current = lastVisitorSeq;

      const responseDelay = computeResponseDelay();

      const respondingAgent = currentAiAgent;
      const naturalLeadCaptureFields = buildNaturalLeadCaptureFields();

      const aiHistory = toAiHistoryFromDb(dbMessages);

      // Step 1: Generate AI response immediately (generation time counts against the window)
      const generationStart = Date.now();
      let aiContent = '';
      let generationError = false;

      await new Promise<void>((resolve) => {
        streamAIResponse({
          messages: aiHistory,
          personalityPrompt: respondingAgent?.personality_prompt,
          agentName: respondingAgent?.name,
          basePrompt: settings.ai_base_prompt,
           naturalLeadCaptureFields: naturalLeadCaptureFields.length > 0 ? naturalLeadCaptureFields : undefined,
           calendlyUrl: settings.calendly_url,
           insuranceCollectionPrompt: settings.insurance_collection_prompt,
            propertyContext: buildBusinessContext(settings),
          onDelta: (delta) => { aiContent += delta; },
          onDone: () => {
            if (settings.drop_capitalization_enabled) aiContent = maybeDropCapitalization(aiContent);
            if (settings.drop_apostrophes_enabled) aiContent = maybeDropApostrophes(aiContent);
            resolve();
          },
          onError: (err) => {
            console.error('AI Error (autoReply):', err);
            generationError = true;
            resolve();
          },
        });
      });

      if (generationError || !aiContent) return;

      // If a sendMessage hybrid flow started while we were generating, abort
      if (hybridFlowActiveRef.current) return;

      // Step 2: Wait remaining window time (human-priority window minus generation elapsed)
      const generationElapsed = Date.now() - generationStart;
      const remainingDelay = Math.max(0, responseDelay - generationElapsed);
      if (remainingDelay > 0) await sleep(remainingDelay);

      // Abort if a sendMessage hybrid flow started during the delay
      if (hybridFlowActiveRef.current) return;

      // Step 3: Smart typing on top of the window
      const aiMessageId = `ai-auto-${Date.now()}`;
      setIsTyping(true);

      if (settings.smart_typing_enabled) {
        const calculatedTypingTime = calculateTypingTimeMs(aiContent);
        const minTypingTime = randomInRange(settings.typing_indicator_min_ms, settings.typing_indicator_max_ms);
        const targetTypingTime = Math.max(calculatedTypingTime, minTypingTime);
        await sleep(targetTypingTime);
      } else {
        const typingDuration = randomInRange(settings.typing_indicator_min_ms, settings.typing_indicator_max_ms);
        await sleep(typingDuration);
      }

      // Abort if a sendMessage hybrid flow started during typing
      if (hybridFlowActiveRef.current) {
        setIsTyping(false);
        return;
      }

      // Step 4: Save to DB and reveal to visitor
      const saveAiToDb = async (finalContent: string) => {
        const autoSessionId = getOrCreateSessionId();
        const saveResp = await fetch(SAVE_MESSAGE_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            conversationId: convId,
            visitorId: vId,
            sessionId: autoSessionId,
            senderType: 'agent',
            content: finalContent,
          }),
        });
        if (!saveResp.ok) console.error('Failed to save auto AI message:', await saveResp.text());
      };

      if (aiContent) await saveAiToDb(aiContent);

      setMessages(prev => [...prev, {
        id: aiMessageId,
        content: aiContent,
        sender_type: 'agent' as const,
        created_at: new Date().toISOString(),
        agent_name: respondingAgent?.name,
        agent_avatar: respondingAgent?.avatar_url,
      }]);
      setIsTyping(false);

      aiMessageCountRef.current += 1;
      cycleToNextAgent();

      if (settings.auto_escalation_enabled && aiMessageCountRef.current >= settings.max_ai_messages_before_escalation) {
        await triggerEscalation();
      }
    } catch (e) {
      console.error('autoReplyIfPending error:', e);
    } finally {
      autoReplyInFlightRef.current = false;
    }
  }, [
    isTyping,
    isPreview,
    propertyId,
    settings,
    currentAiAgent,
    calculateTypingTimeMs,
    cycleToNextAgent,
    toAiHistoryFromDb,
    triggerEscalation,
  ]);

  // Start proactive message timer
  const startProactiveTimer = useCallback(() => {
    if (!settings.proactive_message_enabled || !settings.proactive_message) return;
    
    if (proactiveTimerRef.current) {
      clearTimeout(proactiveTimerRef.current);
    }

    proactiveTimerRef.current = setTimeout(() => {
      // Use messagesRef to avoid stale closure over messages array
      if (messagesRef.current.length === 0) {
        setShowProactiveMessage(true);
        setMessages(prev => [...prev, {
          id: 'proactive',
          content: settings.proactive_message!,
          sender_type: 'agent',
          created_at: new Date().toISOString(),
        }]);
      }
    }, settings.proactive_message_delay_seconds * 1000);
  }, [settings.proactive_message_enabled, settings.proactive_message, settings.proactive_message_delay_seconds]);

  const initializeChat = useCallback(async () => {
    // For preview/demo mode, use greeting prop directly
    if (!propertyId || propertyId === 'demo' || isPreview) {
      if (greeting) {
        setGreetingText(greeting);
      }
      setLoading(false);
      return;
    }

    // Hydrate from cache so repeat visits render with real agent info instantly
    try {
      const cached = localStorage.getItem(`ca-agent-${propertyId}`);
      if (cached) {
        setCurrentAiAgent(JSON.parse(cached));
        // Cache hit — render immediately, bootstrap updates in background
        setLoading(false);
        void ensureWidgetIds();
        return;
      }
    } catch {}

    // No cache — await bootstrap so widget never shows with default values
    await ensureWidgetIds();
    setLoading(false);
  }, [propertyId, greeting, isPreview, ensureWidgetIds]);

  // Submit lead info
  const submitLeadInfo = async (name?: string, email?: string) => {
    setVisitorInfo({ name, email });
    setRequiresLeadCapture(false);

    // Use ref to get the most current visitor ID (state may be stale in preview mode)
    const currentVisitorId = visitorIdRef.current || visitorId;
    if (currentVisitorId && (name || email)) {
      const sessionId = getOrCreateSessionId();
      await updateVisitorSecure(currentVisitorId, sessionId, { 
        name: name || null, 
        email: email || null 
      });
    }
  };

  const sendMessage = async (content: string, opts?: { skipAiReply?: boolean }) => {
    // Clear proactive timer when user sends a message
    if (proactiveTimerRef.current) {
      clearTimeout(proactiveTimerRef.current);
      proactiveTimerRef.current = null;
    }

    const visitorMessage: Message = {
      id: `msg-${Date.now()}`,
      content,
      sender_type: 'visitor',
      created_at: new Date().toISOString(),
    };
    
    setMessages(prev => [...prev, visitorMessage]);

    // For real embeds, make sure visitor exists (conversation created atomically with first message save)
    if (!isPreview && propertyId && propertyId !== 'demo') {
      await ensureWidgetIds();

      // Optimization #2+3: Save visitor message to DB (creates conversation atomically if needed)
      // This is fire-and-forget — we don't await it to allow AI generation to start in parallel
      const vId = visitorIdRef.current;
      if (vId) {
        const sessionId = getOrCreateSessionId();
        const convId = conversationIdRef.current; // may be null for first message
        // Always await: we need conversationId for new convs AND ai_enabled for the AI gate check.
        await fetch(SAVE_MESSAGE_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            conversationId: convId || undefined,
            propertyId: convId ? undefined : propertyId, // only needed when creating
            visitorId: vId,
            sessionId,
            senderType: 'visitor',
            content,
          }),
        }).then(async (resp) => {
          if (resp.ok) {
            const data = await resp.json();
            if (data.conversationId && !conversationIdRef.current) {
              conversationIdRef.current = data.conversationId;
              setConversationId(data.conversationId);
            }
            // Server enforces property-level AI kill switch — trust its response over stale Realtime ref
            if (typeof data.ai_enabled === 'boolean') {
              aiEnabledRef.current = data.ai_enabled;
            }
          }
        }).catch(e => console.error('Failed to save visitor message:', e));
      }
    }

    // Track chat_open event on first message
    if (!chatOpenTracked && propertyId && propertyId !== 'demo') {
      setChatOpenTracked(true);
      trackAnalyticsEvent(propertyId, 'chat_open');
    }

    // Check for escalation keywords - trigger escalation but continue AI response
    if (checkForEscalationKeywords(content)) {
      await triggerEscalation();
      // Don't return - let AI continue responding until human takes over
    }

    // aiEnabledRef is kept in sync via Realtime subscription — no server refresh needed
    const aiEnabledNow = aiEnabledRef.current;

    // Stop AI if either:
    // - dashboard has AI disabled, OR
    // - a human agent has actually responded
    // Visitor message was already saved to DB immediately above, just return.
    if (!aiEnabledNow || humanHasTakenOverRef.current) {
      if (isPreview && conversationId && visitorId) {
        // Preview/portal context: save message via supabase directly
        const { data: maxSeqData } = await supabase
          .from('messages')
          .select('sequence_number')
          .eq('conversation_id', conversationId)
          .order('sequence_number', { ascending: false })
          .limit(1)
          .maybeSingle();
        const nextSeq = (maxSeqData?.sequence_number || 0) + 1;
        await supabase.from('messages').insert({
          conversation_id: conversationId,
          sender_id: visitorId,
          sender_type: 'visitor',
          content,
          sequence_number: nextSeq,
        });
      }
      return;
    }

    // Skip AI response if caller explicitly requested it (e.g. demo closing message)
    if (opts?.skipAiReply) return;

    // Build conversation history for AI (proactive messages are transient UI only)
    const conversationHistory = messages
      .filter(m => m.id !== 'proactive')
      .map(m => ({
        role: m.sender_type === 'visitor' ? 'user' as const : 'assistant' as const,
        content: m.content,
      }));
    
    conversationHistory.push({ role: 'user', content });

    // --- HYBRID MODEL: Generate First, Queue with Preview, Then Wait ---
    // New flow for real (non-preview) conversations:
    // 1. Generate the AI response immediately (during the delay window, not after)
    // 2. Set ai_queued_at + ai_queued_preview so dashboard shows an editable bubble
    // 3. Poll for human agent during the human-priority window
    // 4. If human replied → clear queue, skip AI
    // 5. If window elapsed → reveal in widget (with smart typing duration added on top)
    // responseDelay = human-priority window (AI settings for first msg, 15-25s for quick reply)
    // Smart typing duration is added AFTER the window, not within it.
    const isDemoOrPreview = isPreview || !propertyId || propertyId === 'demo';
    const responseDelay = computeResponseDelay({ demoOrPreview: isDemoOrPreview });

    // Store current agent for this message (before cycling)
    const respondingAgent = currentAiAgent;

    // Build natural lead capture fields list
    const naturalLeadCaptureFields = buildNaturalLeadCaptureFields();

    if (!isPreview && propertyId && propertyId !== 'demo' && !humanHasTakenOverRef.current) {
      // --- RAPID MESSAGE HANDLING ---
      // Increment generation ID FIRST so each caller gets a unique ID.
      // When multiple callers wait for the lock, only the newest (highest ID) proceeds.
      const myGenerationId = ++aiGenerationIdRef.current;

      if (hybridFlowActiveRef.current) {
        // Abort the in-flight generation so it releases the lock quickly
        if (aiAbortControllerRef.current) {
          aiAbortControllerRef.current.abort();
        }
        // Wait for the previous flow to release the lock — with a hard 15s timeout
        // to prevent permanent freezes if the previous flow hangs.
        const lockReleased = await new Promise<boolean>((resolve) => {
          const start = Date.now();
          const check = () => {
            if (!hybridFlowActiveRef.current) { resolve(true); return; }
            if (Date.now() - start > 15000) {
              // Force-release the stuck lock after 15s
              console.warn('[useWidgetChat] Lock wait timed out — force releasing');
              hybridFlowActiveRef.current = false;
              resolve(true);
              return;
            }
            setTimeout(check, 50);
          };
          check();
        });
        // After waking up, check if a NEWER sendMessage call claimed the slot.
        // If so, bail — that newer call will handle the response.
        if (aiGenerationIdRef.current !== myGenerationId) {
          return;
        }
      }

      const convId = conversationIdRef.current;
      const vId = visitorIdRef.current;
      const sessionId = getOrCreateSessionId();

      // Block autoReplyIfPending from firing a duplicate for this same visitor turn
      hybridFlowActiveRef.current = true;

      try {

      // Optimization #5: Use local messages ref for fresh history instead of DB round-trip
      // messagesRef.current always has the latest messages (synced via useEffect)
      let freshHistory = conversationHistory;
      const latestMessages = messagesRef.current;
      if (latestMessages.length > 0) {
        const localHistory = latestMessages
          .filter(m => m.id !== 'proactive' && m.id !== 'greeting' && String(m.content || '').trim() !== '')
          .map(m => ({
            role: m.sender_type === 'visitor' ? 'user' as const : 'assistant' as const,
            content: String(m.content),
          }));
        if (localHistory.length > 0) {
          freshHistory = localHistory;
        }
      }

      // Step 1: Generate AI response immediately using the FULL conversation history
      const generationStart = Date.now();
      let aiContent = '';
      let generationError = false;
      let generationAborted = false;

      // Create a fresh AbortController for this generation so it can be cancelled
      const abortController = new AbortController();
      aiAbortControllerRef.current = abortController;

      await new Promise<void>((resolve) => {
        streamAIResponse({
          messages: freshHistory,
          personalityPrompt: respondingAgent?.personality_prompt,
          agentName: respondingAgent?.name,
          basePrompt: settings.ai_base_prompt,
           naturalLeadCaptureFields: naturalLeadCaptureFields.length > 0 ? naturalLeadCaptureFields : undefined,
           calendlyUrl: settings.calendly_url,
           insuranceCollectionPrompt: settings.insurance_collection_prompt,
            propertyContext: buildBusinessContext(settings),
          signal: abortController.signal,
          onDelta: (delta) => { aiContent += delta; },
          onDone: () => {
            if (settings.drop_capitalization_enabled) aiContent = maybeDropCapitalization(aiContent);
            if (settings.drop_apostrophes_enabled) aiContent = maybeDropApostrophes(aiContent);
            resolve();
          },
          onError: (err) => {
            if (abortController.signal.aborted) {
              generationAborted = true;
            } else {
              console.error('AI generation error:', err);
              generationError = true;
            }
            resolve();
          },
        });
      });

      // If this generation was aborted by a newer sendMessage call, release lock and exit.
      // The newer call is already waiting and will take over.
      if (generationAborted || abortController.signal.aborted) {
        console.warn('[useWidgetChat] Generation aborted by newer message');
        hybridFlowActiveRef.current = false;
        return;
      }

      if (generationError || !aiContent) {
        console.warn('[useWidgetChat] Generation failed or empty:', { generationError, hasContent: !!aiContent });
        hybridFlowActiveRef.current = false;
        return;
      }

      // Generation ID check: if a newer message somehow bypassed the abort (race edge case),
      // release lock and exit — the newer flow owns the response.
      if (aiGenerationIdRef.current !== myGenerationId) {
        hybridFlowActiveRef.current = false;
        return;
      }

      // Step 2: Set queue state with the generated preview so dashboard shows editable bubble
      // IMPORTANT: await this so we know the queue is set before polling starts.
      // If fire-and-forget, the first poll may see aiQueuedAt===null and falsely cancel.
      let queueWasSet = false;
      if (convId && vId) {
        try {
          const queueResp = await fetch(SET_AI_QUEUE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
            body: JSON.stringify({ conversationId: convId, visitorId: vId, sessionId, action: 'queue', preview: aiContent, windowMs: responseDelay }),
          });
          queueWasSet = queueResp.ok;
          if (queueResp.ok) {
            convStateRef.current = {
              ...convStateRef.current,
              aiQueuedAt: new Date().toISOString(),
              aiQueuedPaused: false,
              aiQueuedPreview: aiContent,
              aiQueuedWindowMs: responseDelay,
            };
          } else {
            console.warn('[useWidgetChat] Queue set failed:', queueResp.status);
          }
        } catch (queueErr) {
          console.warn('[useWidgetChat] Queue set error:', queueErr);
        }
      }

      // Step 3: Wait for human agent during the remaining delay window (Realtime-driven, no polling)
      const generationElapsed = Date.now() - generationStart;
      const remainingDelay = Math.max(0, responseDelay - generationElapsed);
      const REALTIME_CHECK_INTERVAL = 500; // No network calls, just ref reads
      let deadline = Date.now() + remainingDelay;
      let humanReplied = false;
      let cancelledByDashboard = false;

      while (Date.now() < deadline) {
        if (abortController.signal.aborted) break;
        const remaining = deadline - Date.now();
        await sleep(Math.min(REALTIME_CHECK_INTERVAL, remaining));
        if (abortController.signal.aborted) break;

        if (humanHasTakenOverRef.current) {
          humanReplied = true;
          break;
        }

        // Read latest state from Realtime subscription (no network call)
        const cs = convStateRef.current;

        // Cancelled by dashboard
        if (queueWasSet && cs.aiQueuedAt === null) {
          console.warn('[useWidgetChat] Dashboard cancelled AI response (via Realtime)');
          cancelledByDashboard = true;
          break;
        }

        // Paused — extend deadline
        if (cs.aiQueuedPaused) {
          // Paused — extend deadline
          deadline = Math.max(deadline, Date.now() + 60000);
        }

        // Send Now
        if (typeof cs.aiQueuedWindowMs === 'number' && cs.aiQueuedWindowMs === 0 && queueWasSet) {
          
          break;
        }

        // Edited preview
        if (cs.aiQueuedPreview && cs.aiQueuedPreview !== aiContent) {
          aiContent = cs.aiQueuedPreview;
        }
      }

      // Lock is NOT released here — kept through typing simulation to prevent
      // autoReplyIfPending from firing a duplicate. Released in the finally block.

      // If this flow was aborted by a newer sendMessage during the delay window,
      // update the queued preview with the new content that the newer flow will regenerate.
      // The newer sendMessage was waiting for this lock — it will now proceed.
      if (abortController.signal.aborted) {
        // Clear the old queue so the newer flow can set a fresh one
        const staleConvId = conversationIdRef.current;
        const staleVId = visitorIdRef.current;
        if (staleConvId && staleVId) {
          convStateRef.current = { ...convStateRef.current, aiQueuedAt: null, aiQueuedPreview: null, aiQueuedPaused: false };
          fetch(SET_AI_QUEUE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
            body: JSON.stringify({ conversationId: staleConvId, visitorId: staleVId, sessionId, action: 'clear' }),
          }).catch(() => {});
        }
        return;
      }

      // Safety net: if generation ID somehow mismatched (extreme race), clear and exit
      if (aiGenerationIdRef.current !== myGenerationId) {
        const staleConvId = conversationIdRef.current;
        const staleVId = visitorIdRef.current;
        if (staleConvId && staleVId) {
          convStateRef.current = { ...convStateRef.current, aiQueuedAt: null, aiQueuedPreview: null, aiQueuedPaused: false };
          fetch(SET_AI_QUEUE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
            body: JSON.stringify({ conversationId: staleConvId, visitorId: staleVId, sessionId, action: 'clear' }),
          }).catch(() => {});
        }
        return;
      }

      // Dashboard agent pressed Cancel — queue was already cleared by the dashboard.
      // Just release the lock and abort; do NOT send anything.
      if (cancelledByDashboard) {
        setIsTyping(false);
        return;
      }

      if (humanReplied) {
        // Clear queue state — human took over
        const clearConvId = conversationIdRef.current;
        const clearVId = visitorIdRef.current;
        if (clearConvId && clearVId) {
          convStateRef.current = { ...convStateRef.current, aiQueuedAt: null, aiQueuedPreview: null, aiQueuedPaused: false };
          fetch(SET_AI_QUEUE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
            body: JSON.stringify({ conversationId: clearConvId, visitorId: clearVId, sessionId, action: 'clear' }),
          }).catch(() => {});
        }
        return;
      }

      // Final guard: check Realtime-driven state for cancel/pause (no network calls)
      let finalGuardDone = false;
      
      while (!finalGuardDone) {
        finalGuardDone = true;
        const cs = convStateRef.current;
        
        if (queueWasSet && cs.aiQueuedAt === null) {
          hybridFlowActiveRef.current = false;
          setIsTyping(false);
          return;
        }
        if (cs.aiQueuedPaused) {
          if (cs.aiQueuedPreview) aiContent = cs.aiQueuedPreview;
          finalGuardDone = false;
          await sleep(500);
          continue;
        }
        if (cs.aiQueuedPreview) aiContent = cs.aiQueuedPreview;
      }

      // Step 4: Window elapsed — show typing indicator BEFORE clearing the queue
      const aiMessageId = `ai-${Date.now()}`;

      const doTypingSleep = async (totalMs: number): Promise<boolean> => {
        let remaining = totalMs;
        while (remaining > 0) {
          const chunk = Math.min(remaining, 500);
          await sleep(chunk);
          remaining -= chunk;

          if (abortController.signal.aborted || aiGenerationIdRef.current !== myGenerationId) {
            setIsTyping(false);
            return false;
          }

          // Check Realtime-driven state (no network calls)
          const cs = convStateRef.current;
          if (cs.aiQueuedAt === null) {
            setIsTyping(false);
            return false;
          }
          if (cs.aiQueuedPaused) {
            if (cs.aiQueuedPreview) aiContent = cs.aiQueuedPreview;
            setIsTyping(false);
            while (convStateRef.current.aiQueuedPaused) {
              await sleep(500);
              if (convStateRef.current.aiQueuedAt === null) return false;
              if (convStateRef.current.aiQueuedPreview) aiContent = convStateRef.current.aiQueuedPreview;
            }
            setIsTyping(true);
          }
        }
        return true;
      };

      // Immediate pre-typing pause check (Realtime-based, no network calls)
      {
        const cs = convStateRef.current;
        if (queueWasSet && cs.aiQueuedAt === null) {
          hybridFlowActiveRef.current = false;
          setIsTyping(false);
          return;
        }
        if (cs.aiQueuedPaused) {
          if (cs.aiQueuedPreview) aiContent = cs.aiQueuedPreview;
          while (convStateRef.current.aiQueuedPaused) {
            await sleep(500);
            if (convStateRef.current.aiQueuedAt === null) {
              hybridFlowActiveRef.current = false;
              setIsTyping(false);
              return;
            }
            if (convStateRef.current.aiQueuedPreview) aiContent = convStateRef.current.aiQueuedPreview;
          }
        }
        if (cs.aiQueuedPreview) aiContent = cs.aiQueuedPreview;
      }

      if (settings.smart_typing_enabled) {
        setIsTyping(true);
        const typingStartTime = Date.now();
        const calculatedTypingTime = calculateTypingTimeMs(aiContent);
        const minTypingTime = randomInRange(settings.typing_indicator_min_ms, settings.typing_indicator_max_ms);
        const targetTypingTime = Math.max(calculatedTypingTime, minTypingTime);
        const elapsedTyping = Date.now() - typingStartTime;
        const remainingTyping = targetTypingTime - elapsedTyping;
        if (remainingTyping > 0) {
          const ok = await doTypingSleep(remainingTyping);
          if (!ok) return;
        }
      } else {
        setIsTyping(true);
        const typingDuration = randomInRange(settings.typing_indicator_min_ms, settings.typing_indicator_max_ms);
        const ok = await doTypingSleep(typingDuration);
        if (!ok) return;
      }

      // If aborted (newer message took over) during typing, abort before saving
      if (abortController.signal.aborted || aiGenerationIdRef.current !== myGenerationId) {
        setIsTyping(false);
        return;
      }

      // Step 5: Typing done — now save the message to DB, clear the queue, and reveal to visitor
      const finalConvId = conversationIdRef.current;
      const finalVId = visitorIdRef.current;
      if (finalConvId && finalVId) {
        // Save AI message AND clear queue in a single call
        fetch(SAVE_MESSAGE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
          body: JSON.stringify({ conversationId: finalConvId, visitorId: finalVId, sessionId, senderType: 'agent', content: aiContent, aiQueueAction: 'clear' }),
        }).catch(e => console.error('Failed to save AI message:', e));

        convStateRef.current = { ...convStateRef.current, aiQueuedAt: null, aiQueuedPreview: null, aiQueuedPaused: false };
      }

      setMessages(prev => [...prev, {
        id: aiMessageId,
        content: aiContent,
        sender_type: 'agent' as const,
        created_at: new Date().toISOString(),
        agent_name: respondingAgent?.name,
        agent_avatar: respondingAgent?.avatar_url,
      }]);
      setIsTyping(false);
      aiMessageCountRef.current += 1;
      cycleToNextAgent();

      if (settings.auto_escalation_enabled && aiMessageCountRef.current >= settings.max_ai_messages_before_escalation) {
        await triggerEscalation();
      }

      } catch (flowError) {
        console.error('[useWidgetChat] Hybrid flow error:', flowError);
        setIsTyping(false);
      } finally {
        // GUARANTEED lock release — prevents permanent freezes
        hybridFlowActiveRef.current = false;
      }
      // === END HYBRID FLOW ===

    } else {
      // Preview mode or human already taken over: run original flow (generate + delay + reveal)
      await sleep(responseDelay);

      const aiMessageId = `ai-${Date.now()}`;
      let aiContent = '';

      if (settings.smart_typing_enabled) {
        await streamAIResponse({
          messages: conversationHistory,
          personalityPrompt: respondingAgent?.personality_prompt,
          agentName: respondingAgent?.name,
          basePrompt: settings.ai_base_prompt,
           naturalLeadCaptureFields: naturalLeadCaptureFields.length > 0 ? naturalLeadCaptureFields : undefined,
           calendlyUrl: settings.calendly_url,
           insuranceCollectionPrompt: settings.insurance_collection_prompt,
            propertyContext: buildBusinessContext(settings),
          onDelta: (delta) => { aiContent += delta; },
          onDone: async () => {
            if (settings.drop_capitalization_enabled) aiContent = maybeDropCapitalization(aiContent);
            if (settings.drop_apostrophes_enabled) aiContent = maybeDropApostrophes(aiContent);

            setIsTyping(true);
            const typingStartTime = Date.now();
            const calculatedTypingTime = calculateTypingTimeMs(aiContent);
            const minTypingTime = randomInRange(settings.typing_indicator_min_ms, settings.typing_indicator_max_ms);
            const targetTypingTime = Math.max(calculatedTypingTime, minTypingTime);
            const elapsedTime = Date.now() - typingStartTime;
            const remainingTime = targetTypingTime - elapsedTime;
            if (remainingTime > 0) await sleep(remainingTime);

            setMessages(prev => [...prev, {
              id: aiMessageId,
              content: aiContent,
              sender_type: 'agent' as const,
              created_at: new Date().toISOString(),
              agent_name: respondingAgent?.name,
              agent_avatar: respondingAgent?.avatar_url,
            }]);
            setIsTyping(false);
            aiMessageCountRef.current += 1;
            cycleToNextAgent();
            if (settings.auto_escalation_enabled && aiMessageCountRef.current >= settings.max_ai_messages_before_escalation) {
              await triggerEscalation();
            }
          },
          onError: (error) => {
            setIsTyping(false);
            console.error('AI Error:', error);
            setMessages(prev => [...prev, {
              id: `error-${Date.now()}`,
              content: "I'm having trouble connecting right now. Please try again in a moment, or speak directly with our team.",
              sender_type: 'agent',
              created_at: new Date().toISOString(),
            }]);
          },
        });
      } else {
        setIsTyping(true);
        const typingDuration = randomInRange(settings.typing_indicator_min_ms, settings.typing_indicator_max_ms);
        await sleep(typingDuration);

        await streamAIResponse({
          messages: conversationHistory,
          personalityPrompt: respondingAgent?.personality_prompt,
          agentName: respondingAgent?.name,
          basePrompt: settings.ai_base_prompt,
           naturalLeadCaptureFields: naturalLeadCaptureFields.length > 0 ? naturalLeadCaptureFields : undefined,
           calendlyUrl: settings.calendly_url,
           insuranceCollectionPrompt: settings.insurance_collection_prompt,
            propertyContext: buildBusinessContext(settings),
           
          onDelta: (delta) => {
            aiContent += delta;
            setMessages(prev => {
              const existing = prev.find(m => m.id === aiMessageId);
              if (existing) return prev.map(m => m.id === aiMessageId ? { ...m, content: aiContent } : m);
              return [...prev, { id: aiMessageId, content: aiContent, sender_type: 'agent' as const, created_at: new Date().toISOString(), agent_name: respondingAgent?.name, agent_avatar: respondingAgent?.avatar_url }];
            });
          },
          onDone: async () => {
            if (settings.drop_capitalization_enabled) aiContent = maybeDropCapitalization(aiContent);
            if (settings.drop_apostrophes_enabled) aiContent = maybeDropApostrophes(aiContent);
            setMessages(prev => prev.map(m => m.id === aiMessageId ? { ...m, content: aiContent } : m));
            setIsTyping(false);
            aiMessageCountRef.current += 1;
            cycleToNextAgent();
            if (settings.auto_escalation_enabled && aiMessageCountRef.current >= settings.max_ai_messages_before_escalation) {
              await triggerEscalation();
            }
          },
          onError: (error) => {
            setIsTyping(false);
            console.error('AI Error:', error);
            setMessages(prev => [...prev, { id: `error-${Date.now()}`, content: "I'm having trouble connecting right now. Please try again in a moment, or speak directly with our team.", sender_type: 'agent', created_at: new Date().toISOString() }]);
          },
        });
      }
    }

    // Visitor info extraction is now handled server-side in widget-save-message
    // (only for visitor messages, with debouncing). No client-side call needed.

    // NOTE: For real embeds the visitor message was already saved to DB at the top of sendMessage
    // (awaited, before the hybrid flow). For preview mode with a test conversation, save via
    // supabase directly.
    if (isPreview && conversationId && visitorId && propertyId && propertyId !== 'demo') {
      const { data: maxSeqData } = await supabase
        .from('messages')
        .select('sequence_number')
        .eq('conversation_id', conversationId)
        .order('sequence_number', { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextSeq = (maxSeqData?.sequence_number || 0) + 1;

      const { error: msgErr } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: visitorId,
        sender_type: 'visitor',
        content,
        sequence_number: nextSeq,
      });
      if (msgErr) console.error('Error saving visitor message (preview):', msgErr);

      // Visitor info extraction is handled server-side in widget-save-message
    }
  };

  useEffect(() => {
    initializeChat();
  }, [initializeChat]);

  // Keep messagesRef in sync with messages state for use in callbacks
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Presence: keep conversations "active" while the widget is visible, and attempt
  // to mark them "closed" when the tab hides/unloads.
  useEffect(() => {
    if (isPreview || !propertyId || propertyId === 'demo') return;
    if (!visitorId || !conversationId) return;

    const sessionId = getOrCreateSessionId();
    let disposed = false;

    const markActive = () => {
      if (disposed) return;
      if (document.visibilityState !== 'visible') return;
      void updateConversationPresenceSecure({
        propertyId,
        visitorId,
        sessionId,
        status: 'active',
      });
    };

    const markClosed = () => {
      if (disposed) return;
      void updateConversationPresenceSecure({
        propertyId,
        visitorId,
        sessionId,
        status: 'closed',
      });
    };

    // Immediately mark active once we have a conversation.
    markActive();

    // Heartbeat so the dashboard can close stale conversations even if unload doesn't fire.
    const heartbeatId = window.setInterval(markActive, 30000);

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        markClosed();
      } else {
        markActive();
      }
    };

    const onPageHide = () => markClosed();
    const onBeforeUnload = () => markClosed();

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('beforeunload', onBeforeUnload);

    return () => {
      disposed = true;
      window.clearInterval(heartbeatId);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('beforeunload', onBeforeUnload);

      // Best-effort close if the widget is unmounting while a conversation exists.
      if (document.visibilityState !== 'visible') {
        markClosed();
      }
    };
  }, [conversationId, isPreview, propertyId, visitorId]);

  // Start proactive message timer when widget opens
  useEffect(() => {
    startProactiveTimer();
    return () => {
      if (proactiveTimerRef.current) {
        clearTimeout(proactiveTimerRef.current);
      }
    };
  }, [startProactiveTimer]);


  // Realtime subscriptions for messages and conversation state (replaces polling)
  useEffect(() => {
    if (isPreview || !propertyId || propertyId === 'demo') return;

    const convId = conversationIdRef.current;
    if (!convId) return;

    let disposed = false;

    const channel = supabase
      .channel(`widget-rt-${convId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${convId}`,
        },
        (payload) => {
          if (disposed) return;
          const msg = payload.new as Record<string, unknown>;
          // Only process human agent messages (AI messages are added locally by the hybrid flow)
          if (msg.sender_type === 'agent' && msg.sender_id !== 'ai-bot') {
            if (!humanHasTakenOverRef.current) {
              setHumanHasTakenOver(true);
              humanHasTakenOverRef.current = true;
            }
            setIsEscalated(true);

            const newMsg: Message = {
              id: msg.id as string,
              content: msg.content as string,
              sender_type: 'agent',
              created_at: msg.created_at as string,
            };
            setMessages(prev => {
              if (prev.some(m => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
            if (typeof msg.sequence_number === 'number') {
              lastSeqRef.current = Math.max(lastSeqRef.current, msg.sequence_number);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations',
          filter: `id=eq.${convId}`,
        },
        (payload) => {
          if (disposed) return;
          const conv = payload.new as Record<string, unknown>;
          convStateRef.current = {
            aiQueuedAt: (conv.ai_queued_at as string | null) ?? null,
            aiQueuedPaused: (conv.ai_queued_paused as boolean) ?? false,
            aiQueuedPreview: (conv.ai_queued_preview as string | null) ?? null,
            aiQueuedWindowMs: (conv.ai_queued_window_ms as number | null) ?? null,
            aiEnabled: (conv.ai_enabled as boolean) ?? true,
          };

          // Handle AI enabled toggle
          const serverAiEnabled = (conv.ai_enabled as boolean) ?? true;
          const prev = prevAiEnabledRef.current;
          aiEnabledRef.current = serverAiEnabled;
          prevAiEnabledRef.current = serverAiEnabled;

          if (prev === false && serverAiEnabled === true) {
            if (humanHasTakenOverRef.current) {
              setHumanHasTakenOver(false);
              humanHasTakenOverRef.current = false;
            }
            void autoReplyIfPending();
          }
        }
      )
      .subscribe();

    return () => {
      disposed = true;
      supabase.removeChannel(channel);
    };
  }, [conversationId, propertyId, isPreview, autoReplyIfPending]);

  return {
    messages,
    sendMessage,
    loading,
    isTyping,
    visitorId,
    conversationId,
    settings,
    isEscalated,
    humanHasTakenOver,
    requiresLeadCapture,
    submitLeadInfo,
    visitorInfo,
    currentAiAgent,
    aiAgents,
    greetingText, // Static greeting for UI display
    geoBlocked,
    geoBlockedMessage,
  };
};
