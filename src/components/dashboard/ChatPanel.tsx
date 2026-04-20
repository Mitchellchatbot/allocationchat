import { useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback } from 'react';
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';
import { Send, MoreVertical, User, Globe, Monitor, MapPin, Archive, UserPlus, Video, Phone, Briefcase, Calendar, Mail, ChevronRight, ChevronLeft, MessageSquare, Heart, Pill, Building, Shield, AlertTriangle, Bot, BotOff, Slash, X, Clock, Pencil, Check, MousePointerClick, Trash2, RefreshCw, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { defaultShortcuts, ChatShortcut } from '@/data/chatShortcuts';
import gsap from 'gsap';
import { cn } from '@/lib/utils';
import { Conversation, Message } from '@/types/chat';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { mockAgents } from '@/data/mockData';
import { useVideoChat } from '@/hooks/useVideoChat';
import { VideoCallModal } from '@/components/video/VideoCallModal';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ChatPanelProps {
  conversation: Conversation | null;
  onSendMessage: (content: string) => void;
  onCloseConversation: () => void;
  isAIEnabled?: boolean;
  onToggleAI?: () => void;
  propertyName?: string;
  /** ISO string of when AI response was queued (from DB) */
  aiQueuedAt?: Date | null;
  /** Total human-priority window in ms that was chosen when this message was queued */
  aiQueuedWindowMs?: number | null;
  /** Draft text of the AI response being composed (shown as a pending bubble) */
  aiQueuedPreview?: string | null;
  onCancelAIQueue?: () => void;
  /** Edit the content of the queued AI message (newContent only — targets the pending draft) */
  onEditAIQueue?: (messageId: string, newContent: string) => void;
  /** Pause / resume the AI queue timer (e.g. while editing) */
  onPauseAIQueue?: (paused: boolean) => void;
  /** Immediately deliver the queued AI message, bypassing the timer */
  onSendNow?: () => void;
  /** When set, scroll to and briefly highlight this message ID */
  scrollToMessageId?: string;
}
const formatMessageTime = (date: Date) => {
  if (isToday(date)) {
    return format(date, 'h:mm a');
  }
  if (isYesterday(date)) {
    return `Yesterday ${format(date, 'h:mm a')}`;
  }
  return format(date, 'MMM d, h:mm a');
};

const MessageBubble = ({
  message,
  isAgent,
  isPendingDelivery,
  queueSecondsLeft,
  isPaused,
  onCancel,
  onSaveEdit,
  onPauseAIQueue,
  onSendNow,
}: {
  message: Message;
  isAgent: boolean;
  isPendingDelivery?: boolean;
  /** Seconds remaining before AI sends (counts down to 0) */
  queueSecondsLeft?: number;
  isPaused?: boolean;
  onCancel?: () => void;
  onSaveEdit?: (newContent: string) => void;
  onPauseAIQueue?: (paused: boolean) => void;
  onSendNow?: () => void;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);

  const handleStartEdit = () => {
    setIsEditing(true);
    onPauseAIQueue?.(true);
  };

  const handleSaveEdit = () => {
    if (editContent.trim()) {
      onSaveEdit?.(editContent.trim());
    }
    setIsEditing(false);
    onPauseAIQueue?.(false);
  };

  const handleCancelEdit = () => {
    setEditContent(message.content);
    setIsEditing(false);
    onPauseAIQueue?.(false);
  };

  // Controls are shown while countdown is active OR timer is paused
  const countdownActive = isPendingDelivery && queueSecondsLeft != null && (queueSecondsLeft > 0 || isPaused);

  return (
    <div className={cn("flex gap-2 message-enter", isAgent ? "flex-row-reverse" : "flex-row")}>
      {!isAgent && <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarFallback className="bg-muted text-muted-foreground text-xs">
            V
          </AvatarFallback>
        </Avatar>}
      <div className="flex flex-col gap-1 max-w-[70%]">
        {/* Message bubble — fades to full opacity once countdown hits 0 */}
        <div className={cn(
          "rounded-3xl px-4 py-2.5 transition-opacity duration-700",
          isAgent ? "bg-chat-user text-chat-user-foreground rounded-br-xl" : "bg-chat-visitor text-chat-visitor-foreground rounded-bl-xl",
          isPendingDelivery && countdownActive ? "opacity-70" : "opacity-100"
        )}>
          {isPendingDelivery && isEditing ? (
            <Textarea
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              className="text-sm bg-transparent border-none shadow-none resize-none p-0 focus-visible:ring-0 text-chat-user-foreground placeholder:text-chat-user-foreground/50 min-h-[60px]"
              autoFocus
            />
          ) : (
            <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
          )}
          <p className={cn("text-xs mt-1", isAgent ? "text-chat-user-foreground/70" : "text-muted-foreground")}>
            {formatMessageTime(new Date(message.timestamp))}
          </p>
        </div>

        {/* Inline pending controls — only while countdown is still ticking */}
        {countdownActive && (
          <div className={cn("flex items-center gap-1.5 flex-wrap transition-opacity duration-300", isAgent ? "justify-end" : "justify-start")}>
            {isEditing ? (
              <>
                <Button size="sm" variant="outline" className="h-6 px-2 text-xs gap-1" onClick={handleSaveEdit}>
                  <Check className="h-3 w-3" /> Save
                </Button>
                <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={handleCancelEdit}>
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <div className={cn("h-1.5 w-1.5 rounded-full", isPaused ? "bg-amber-500" : "bg-primary/60 animate-pulse")} />
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {isPaused ? 'Paused' : `${queueSecondsLeft}s to respond`}
                  </span>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="sm" variant="ghost" className="h-6 px-1.5 text-xs" onClick={handleStartEdit}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Edit this message</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="sm" variant="default" className="h-6 px-2 text-xs gap-1" onClick={onSendNow}>
                        <Send className="h-3 w-3" /> Send Now
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Send this message immediately</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="sm" variant="ghost" className="h-6 px-1.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10" onClick={onCancel}>
                        <X className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Cancel this AI response</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};


const EmptyState = () => {
  const ref = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!ref.current) return;
    gsap.fromTo(
      ref.current,
      { opacity: 0, scale: 0.95 },
      { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(1.5)' }
    );
  }, []);

  return (
    <div ref={ref} className="flex flex-col items-center justify-center h-full text-center p-8">
      <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-4">
        <MessageSquare className="h-10 w-10 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium text-foreground mb-2">Select a conversation</h3>
      <p className="text-sm text-muted-foreground max-w-xs">
        Choose a conversation from the list to start chatting with visitors
      </p>
    </div>
  );
};

// Editable visitor info item with edit/delete
const EditableInfoItem = ({
  icon: Icon,
  label,
  value,
  fieldKey,
  visitorId,
  onUpdated,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  fieldKey: string;
  visitorId: string;
  onUpdated: (field: string, newValue: string | null) => void;
}) => {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setEditValue(value);
      setTimeout(() => editInputRef.current?.focus(), 50);
    }
  }, [editing]);

  const handleSave = async () => {
    if (editValue.trim() === value) { setEditing(false); return; }
    setSaving(true);
    const { error } = await supabase
      .from('visitors')
      .update({ [fieldKey]: editValue.trim() || null })
      .eq('id', visitorId);
    setSaving(false);
    if (!error) {
      onUpdated(fieldKey, editValue.trim() || null);
      setEditing(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('visitors')
      .update({ [fieldKey]: null })
      .eq('id', visitorId);
    setSaving(false);
    if (!error) {
      onUpdated(fieldKey, null);
    }
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1 py-1">
        <Icon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
        <input
          ref={editInputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false); }}
          className="flex-1 text-xs bg-muted/50 border border-border rounded px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-ring min-w-0"
          disabled={saving}
        />
        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={handleSave} disabled={saving}>
          <Check className="h-3 w-3 text-green-600" />
        </Button>
        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setEditing(false)}>
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  const isTruncated = value.length > 20;
  return (
    <div className="group flex items-start gap-2 py-1.5 hover:bg-muted/30 rounded px-1 -mx-1">
      <Icon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
      <span className="text-xs text-muted-foreground min-w-[50px]">{label}:</span>
      <span
        className={cn("text-xs text-foreground flex-1", isTruncated && "cursor-pointer hover:text-primary", expanded ? "whitespace-pre-wrap break-words" : "truncate")}
        onClick={() => isTruncated && setExpanded(!expanded)}
      >
        {value}
      </span>
      <div className="hidden group-hover:flex items-center gap-0.5 flex-shrink-0">
        <button onClick={() => setEditing(true)} className="p-0.5 rounded hover:bg-muted" title="Edit">
          <Pencil className="h-3 w-3 text-muted-foreground hover:text-foreground" />
        </button>
        <button onClick={handleDelete} className="p-0.5 rounded hover:bg-destructive/10" title="Clear field">
          <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
        </button>
      </div>
    </div>
  );
};

// Collapsible visitor info sidebar
const VisitorInfoSidebar = ({
  visitor,
  assignedAgent,
  propertyName,
  conversationId
}: {
  visitor: any;
  assignedAgent: any;
  propertyName?: string;
  conversationId?: string;
}) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(true);
  const [localVisitor, setLocalVisitor] = useState(visitor);
  const [isExtracting, setIsExtracting] = useState(false);

  // Sync when visitor prop changes (e.g. switching conversations or realtime update)
  useEffect(() => {
    setLocalVisitor(visitor);
  }, [visitor]);

  // Reset extraction state only when switching to a different visitor
  useEffect(() => {
    setIsExtracting(false);
  }, [visitor.id]);

  const handleFieldUpdated = useCallback((field: string, newValue: string | null) => {
    setLocalVisitor((prev: any) => ({ ...prev, [field]: newValue }));
  }, []);

  const handleReExtract = useCallback(async () => {
    if (!conversationId || !visitor.id) {
      toast({ title: 'No conversation selected', variant: 'destructive' });
      return;
    }
    setIsExtracting(true);
    try {
      // Fetch conversation messages
      const { data: msgs } = await supabase
        .from('messages')
        .select('sender_type, content')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(50);

      if (!msgs || msgs.length === 0) {
        toast({ title: 'No messages to extract from' });
        return;
      }

      const conversationHistory = msgs.map(m => ({
        role: m.sender_type === 'visitor' ? 'user' : 'assistant',
        content: m.content,
      }));

      // Use fetch with timeout instead of supabase.functions.invoke
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/extract-visitor-info`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ visitorId: visitor.id, conversationHistory }),
          signal: controller.signal,
        }
      );
      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Extraction failed');

      if (data?.extracted && data.info) {
        // Re-fetch the full visitor to get updated fields
        const { data: updated } = await supabase
          .from('visitors')
          .select('*')
          .eq('id', visitor.id)
          .single();
        if (updated) {
          setLocalVisitor(updated);
        }
        toast({ title: 'Visitor info updated', description: `Updated: ${Object.keys(data.info).join(', ')}` });
      } else {
        toast({ title: 'No new info found', description: 'All fields are already up to date.' });
      }
    } catch (err: any) {
      console.error('Re-extraction failed:', err);
      const msg = err?.name === 'AbortError' ? 'Request timed out' : (err?.message || 'Unknown error');
      toast({ title: 'Extraction failed', description: msg, variant: 'destructive' });
    } finally {
      setIsExtracting(false);
    }
  }, [conversationId, visitor.id]);

  // Check if we have any treatment-specific info
  const hasTreatmentInfo = localVisitor.addiction_history || localVisitor.drug_of_choice || localVisitor.treatment_interest || localVisitor.insurance_info || localVisitor.urgency_level || (localVisitor as any).insurance_card_url;

  // Determine urgency badge color
  const getUrgencyBadge = (urgency: string) => {
    const urgencyLower = urgency.toLowerCase();
    if (urgencyLower.includes('crisis') || urgencyLower.includes('immediate')) {
      return <Badge variant="destructive" className="text-xs">{urgency}</Badge>;
    }
    if (urgencyLower.includes('ready') || urgencyLower.includes('start')) {
      return <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-400 text-xs">{urgency}</Badge>;
    }
    return <Badge variant="secondary" className="text-xs">{urgency}</Badge>;
  };
  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sidebarRef.current) return;
    gsap.fromTo(
      sidebarRef.current,
      { opacity: 0, x: 20 },
      { opacity: 1, x: 0, duration: 0.4, ease: 'power3.out' }
    );
  }, []);

  const v = localVisitor;
  const vId = visitor.id;

  return (
    <div ref={sidebarRef} className={cn("border-l border-border/30 hidden lg:flex flex-col transition-all duration-200 bg-card w-64")}>
      <div className="flex-1 overflow-y-auto">

        {/* Property Info */}
        {propertyName && (
          <div className="px-3 pt-3 pb-1">
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-primary/5 border border-primary/10">
              <Building className="h-3.5 w-3.5 text-primary flex-shrink-0" />
              <span className="text-xs font-medium text-primary truncate">{propertyName}</span>
            </div>
          </div>
        )}

        {/* Personal Info Section */}
        <div className="p-3 space-y-0.5">
          {v.name && <EditableInfoItem icon={User} label="Name" value={v.name} fieldKey="name" visitorId={vId} onUpdated={handleFieldUpdated} />}
          {v.email && <EditableInfoItem icon={Mail} label="Email" value={v.email} fieldKey="email" visitorId={vId} onUpdated={handleFieldUpdated} />}
          {v.phone && <EditableInfoItem icon={Phone} label="Phone" value={v.phone} fieldKey="phone" visitorId={vId} onUpdated={handleFieldUpdated} />}
          {v.age && <EditableInfoItem icon={Calendar} label="Age" value={v.age} fieldKey="age" visitorId={vId} onUpdated={handleFieldUpdated} />}
          {v.occupation && <EditableInfoItem icon={Briefcase} label="Work" value={v.occupation} fieldKey="occupation" visitorId={vId} onUpdated={handleFieldUpdated} />}
        </div>

        {/* Treatment Details Section */}
        {hasTreatmentInfo && (
          <div className="p-3 border-t border-border/30 space-y-0.5">
            <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
              <Heart className="h-3 w-3" />
              Treatment Details
            </p>
            {v.drug_of_choice && <EditableInfoItem icon={Pill} label="Substance" value={v.drug_of_choice} fieldKey="drug_of_choice" visitorId={vId} onUpdated={handleFieldUpdated} />}
            {v.addiction_history && <EditableInfoItem icon={Calendar} label="History" value={v.addiction_history} fieldKey="addiction_history" visitorId={vId} onUpdated={handleFieldUpdated} />}
            {v.treatment_interest && <EditableInfoItem icon={Building} label="Seeking" value={v.treatment_interest} fieldKey="treatment_interest" visitorId={vId} onUpdated={handleFieldUpdated} />}
            {v.insurance_info && <EditableInfoItem icon={Shield} label="Insurance" value={v.insurance_info} fieldKey="insurance_info" visitorId={vId} onUpdated={handleFieldUpdated} />}
            {(v as any).insurance_card_url && (
              <div className="flex items-center gap-2 py-1.5 px-1 -mx-1">
                <Shield className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                <span className="text-xs text-muted-foreground min-w-[50px]">Card:</span>
                <a href={(v as any).insurance_card_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline truncate">
                  View Photo
                </a>
              </div>
            )}
            {v.urgency_level && (
              <div className="group flex items-center gap-2 py-1.5 hover:bg-muted/30 rounded px-1 -mx-1">
                <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                <span className="text-xs text-muted-foreground min-w-[50px]">Urgency:</span>
                {getUrgencyBadge(v.urgency_level)}
                <div className="hidden group-hover:flex items-center gap-0.5 flex-shrink-0 ml-auto">
                  <button onClick={async () => {
                    await supabase.from('visitors').update({ urgency_level: null }).eq('id', vId);
                    handleFieldUpdated('urgency_level', null);
                  }} className="p-0.5 rounded hover:bg-destructive/10" title="Clear field">
                    <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Session Info Section */}
        <div className="p-3 border-t border-border/30 space-y-0.5">
          <p className="text-xs font-medium text-muted-foreground mb-2">Session Info</p>
          {v.location && <EditableInfoItem icon={MapPin} label="Location" value={v.location} fieldKey="location" visitorId={vId} onUpdated={handleFieldUpdated} />}
          {v.currentPage && <EditableInfoItem icon={Globe} label="Page" value={v.currentPage} fieldKey="current_page" visitorId={vId} onUpdated={handleFieldUpdated} />}
          {v.browserInfo && <EditableInfoItem icon={Monitor} label="Browser" value={v.browserInfo} fieldKey="browser_info" visitorId={vId} onUpdated={handleFieldUpdated} />}
          {v.gclid && <EditableInfoItem icon={MousePointerClick} label="GCLID" value={v.gclid} fieldKey="gclid" visitorId={vId} onUpdated={handleFieldUpdated} />}
        </div>

        {/* Re-extract Visitor Info */}
        {conversationId && (
          <div className="px-3 py-2 border-t border-border/30">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReExtract}
              disabled={isExtracting}
              className="w-full gap-1.5 text-xs"
            >
              {isExtracting ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              Re-extract Info
            </Button>
          </div>
        )}

        {assignedAgent && (
          <div className="p-3 border-t border-border/30">
            <p className="text-xs text-muted-foreground mb-2">Assigned Agent</p>
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  {assignedAgent.name.split(' ').map((n: string) => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-xs font-medium text-foreground">{assignedAgent.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{assignedAgent.status}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export const ChatPanel = ({
  conversation,
  onSendMessage,
  onCloseConversation,
  isAIEnabled = true,
  onToggleAI,
  propertyName,
  aiQueuedAt,
  aiQueuedWindowMs,
  aiQueuedPreview,
  onCancelAIQueue,
  onEditAIQueue,
  onPauseAIQueue,
  onSendNow,
  scrollToMessageId,
}: ChatPanelProps) => {
  const [message, setMessage] = useState('');
  const [isVideoCallOpen, setIsVideoCallOpen] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [shortcutFilter, setShortcutFilter] = useState('');
  const [selectedShortcutIndex, setSelectedShortcutIndex] = useState(0);
  // Total window in seconds — derived from the actual responseDelay stored when message was queued.
  // Falls back to 30s if not yet available (e.g. older queued messages).
  const queueWindowSeconds = aiQueuedWindowMs != null ? Math.round(aiQueuedWindowMs / 1000) : 30;
  const [queueSecondsLeft, setQueueSecondsLeft] = useState<number>(queueWindowSeconds);
  const [isPaused, setIsPaused] = useState(false);
  const frozenSecondsRef = useRef<number | null>(null);

  // When paused, freeze the current value; when unpaused, adjust aiQueuedAt offset
  const pauseOffsetRef = useRef<number>(0);
  const pausedAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (isPaused) {
      // Freeze current display value and record pause start
      frozenSecondsRef.current = queueSecondsLeft;
      pausedAtRef.current = Date.now();
    } else if (pausedAtRef.current) {
      // Accumulate pause duration so timer resumes from where it froze
      pauseOffsetRef.current += Date.now() - pausedAtRef.current;
      pausedAtRef.current = null;
      frozenSecondsRef.current = null;
    }
  }, [isPaused]);

  // Reset pause offset when queue resets
  useEffect(() => {
    if (!aiQueuedAt) {
      pauseOffsetRef.current = 0;
      pausedAtRef.current = null;
      frozenSecondsRef.current = null;
    }
  }, [aiQueuedAt]);

  useEffect(() => {
    if (!aiQueuedAt) { setQueueSecondsLeft(queueWindowSeconds); return; }
    // Don't run the interval while paused — display is frozen
    if (isPaused) return;
    const update = () => {
      const totalPauseMs = pauseOffsetRef.current;
      const elapsed = Math.floor((Date.now() - aiQueuedAt.getTime() - totalPauseMs) / 1000);
      setQueueSecondsLeft(Math.max(0, queueWindowSeconds - elapsed));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [aiQueuedAt, queueWindowSeconds, isPaused]);

  // A message is in queue as long as the DB has ai_queued_at set (regardless of countdown)
  const isQueued = !!aiQueuedAt;

  // Sync local isPaused with external pause handler
  const wrappedPauseAIQueue = (paused: boolean) => {
    setIsPaused(paused);
    onPauseAIQueue?.(paused);
  };

  // Reset pause state when queue clears
  useEffect(() => {
    if (!isQueued) setIsPaused(false);
  }, [isQueued]);

  const shortcutMenuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const {
    toast
  } = useToast();
  const videoChat = useVideoChat({
    onCallRequest: () => {
      toast({
        title: "Calling visitor",
        description: "Waiting for visitor to accept..."
      });
    },
    onCallAccepted: () => {
      toast({
        title: "Call connected",
        description: "Video call is now active"
      });
    },
    onCallEnded: () => {
      toast({
        title: "Call ended",
        description: "The video call has ended"
      });
    }
  });
  const handleStartVideoCall = async () => {
    setIsVideoCallOpen(true);
    await videoChat.initiateCall();
  };
  const handleEndVideoCall = () => {
    videoChat.endCall();
    setIsVideoCallOpen(false);
  };
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const prevMessageCountRef = useRef(0);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);

  // Clear message refs when conversation changes
  useEffect(() => {
    messageRefs.current.clear();
  }, [conversation?.id]);

  // Scroll to and highlight a specific message (from search)
  useEffect(() => {
    if (!scrollToMessageId) return;
    const el = messageRefs.current.get(scrollToMessageId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedMessageId(scrollToMessageId);
      const timer = setTimeout(() => setHighlightedMessageId(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [scrollToMessageId]);

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  // Track if user is near bottom (within 100px)
  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      isNearBottomRef.current = scrollHeight - scrollTop - clientHeight < 100;
    }
  };

  useEffect(() => {
    const messageCount = conversation?.messages?.length ?? 0;
    const isNewMessage = messageCount > prevMessageCountRef.current;
    prevMessageCountRef.current = messageCount;

    // Only auto-scroll if user is near bottom OR it's a new message they just sent
    if (isNearBottomRef.current || isNewMessage) {
      scrollToBottom();
    }
  }, [conversation?.messages, isQueued, aiQueuedPreview]);
  useEffect(() => {
    if (conversation) {
      inputRef.current?.focus();
    }
  }, [conversation?.id]);
  const filteredShortcuts = useMemo(() => {
    if (!shortcutFilter) return defaultShortcuts;
    const q = shortcutFilter.toLowerCase();
    return defaultShortcuts.filter(
      s => s.label.toLowerCase().includes(q) || s.text.toLowerCase().includes(q) || String(s.id).includes(q)
    );
  }, [shortcutFilter]);

  const handleMessageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setMessage(val);
    if (val === '/') {
      setShowShortcuts(true);
      setShortcutFilter('');
      setSelectedShortcutIndex(0);
    } else if (val.startsWith('/')) {
      setShowShortcuts(true);
      setShortcutFilter(val.slice(1));
      setSelectedShortcutIndex(0);
    } else {
      setShowShortcuts(false);
    }
  };

  const selectShortcut = (shortcut: ChatShortcut) => {
    setMessage(shortcut.text);
    setShowShortcuts(false);
    inputRef.current?.focus();
  };

  const handleSend = () => {
    if (message.trim()) {
      onSendMessage(message.trim());
      setMessage('');
      setShowShortcuts(false);
    }
  };
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showShortcuts && filteredShortcuts.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedShortcutIndex(i => Math.min(i + 1, filteredShortcuts.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedShortcutIndex(i => Math.max(i - 1, 0));
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        selectShortcut(filteredShortcuts[selectedShortcutIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowShortcuts(false);
        return;
      }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  const chatAreaRef = useRef<HTMLDivElement>(null);
  
  useLayoutEffect(() => {
    if (!chatAreaRef.current || !conversation) return;
    gsap.fromTo(
      chatAreaRef.current,
      { opacity: 0 },
      { opacity: 1, duration: 0.3, ease: 'power2.out' }
    );
  }, [conversation?.id]);

  // Deduplicate messages by id as a safety net against any race conditions
  const messages = useMemo(() => {
    const raw = conversation?.messages ?? [];
    const seen = new Set<string>();
    return raw.filter(m => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });
  }, [conversation?.messages]);

  if (!conversation) {
    return <EmptyState />;
  }
  const {
    visitor,
    status,
    assignedAgentId
  } = conversation;
  const visitorName = visitor.name || `Visitor ${visitor.sessionId.slice(-4)}`;
  const assignedAgent = assignedAgentId ? mockAgents.find(a => a.id === assignedAgentId) : null;

  return <div className="flex h-full bg-gradient-subtle">
      {/* Chat Area */}
      <div ref={chatAreaRef} className="flex-1 flex flex-col min-w-0 relative">
        
        {/* AI Toggle Header */}
        {onToggleAI && (
          <div className="px-4 py-2 border-b border-border/30 flex items-center justify-between bg-background/50">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">AI Assistant</span>
              <Badge variant={isAIEnabled ? "default" : "secondary"} className="text-xs">
                {isAIEnabled ? "Active" : "Paused"}
              </Badge>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={isAIEnabled ? "default" : "outline"}
                    size="sm"
                    onClick={onToggleAI}
                    className="gap-2"
                  >
                    {isAIEnabled ? (
                      <>
                        <Bot className="h-4 w-4" />
                        AI On
                      </>
                    ) : (
                      <>
                        <BotOff className="h-4 w-4" />
                        AI Off
                      </>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isAIEnabled ? "Click to disable AI responses" : "Click to enable AI responses"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}

        {/* Missed reply banner */}
        {(conversation as any).missedReply && (
          <div className="px-4 py-2.5 border-b border-amber-400/30 bg-amber-50 dark:bg-amber-950/20 flex items-center gap-3">
            <div className="p-1.5 rounded-full bg-amber-100 dark:bg-amber-900/30">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-700 dark:text-amber-300">The visitor left before we had a chance to reply</p>
            </div>
          </div>
        )}

        {/* Messages */}
        <div ref={messagesContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-4 space-y-4 bg-background scrollbar-thin">
          {messages.map((msg) => (
            <div
              key={msg.id}
              ref={(el) => {
                if (el) messageRefs.current.set(msg.id, el);
                else messageRefs.current.delete(msg.id);
              }}
              className={cn(
                "rounded-2xl transition-all duration-500",
                highlightedMessageId === msg.id && "ring-2 ring-primary/40 ring-offset-2 bg-primary/5"
              )}
            >
              <MessageBubble
                message={msg}
                isAgent={msg.senderType === 'agent'}
                isPendingDelivery={false}
              />
            </div>
          ))}

          {/* Synthetic pending bubble — shown immediately when AI has queued a draft */}
          {isQueued && aiQueuedPreview && (
            <MessageBubble
              key="__pending_ai__"
              message={{
                id: '__pending_ai__',
                conversationId: conversation?.id ?? '',
                senderId: 'ai-bot',
                senderType: 'agent',
                content: aiQueuedPreview,
                timestamp: aiQueuedAt ?? new Date(),
                read: false,
              }}
              isAgent={true}
              isPendingDelivery={true}
              queueSecondsLeft={queueSecondsLeft}
              isPaused={isPaused}
              onCancel={onCancelAIQueue}
              onSaveEdit={(newContent) => onEditAIQueue?.('__pending_ai__', newContent)}
              onPauseAIQueue={wrappedPauseAIQueue}
              onSendNow={onSendNow}
            />
          )}
        </div>


        {/* Shortcuts popup - positioned above input area */}
        {showShortcuts && !(isAIEnabled && status !== 'closed') && filteredShortcuts.length > 0 && (
          <div
            ref={shortcutMenuRef}
            className="absolute bottom-[72px] left-4 right-4 max-h-80 overflow-y-auto rounded-xl border border-border bg-popover shadow-lg z-50"
          >
            <div className="px-3 py-2 border-b border-border/50">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Slash className="h-3 w-3" />
                Shortcuts
              </p>
            </div>
            {filteredShortcuts.map((shortcut, idx) => (
              <button
                key={shortcut.id}
                className={cn(
                  "w-full text-left px-3 py-2.5 text-sm transition-colors flex items-start gap-2 border-b border-border/20 last:border-0",
                  idx === selectedShortcutIndex
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-muted/50 text-foreground"
                )}
                onMouseEnter={() => setSelectedShortcutIndex(idx)}
                onClick={() => selectShortcut(shortcut)}
              >
                <span className="text-xs font-mono text-muted-foreground mt-0.5 shrink-0 w-5">{shortcut.id}</span>
                <span className="whitespace-pre-wrap break-words">{shortcut.text}</span>
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t border-border/30 glass-subtle rounded-b-2xl">
          {/* AI Mode Warning Banner */}
          {isAIEnabled && status !== 'closed' && (
            <div className="mb-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3">
              <div className="p-2 rounded-full bg-amber-500/20">
                <Bot className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-700 dark:text-amber-300">AI is handling this conversation</p>
                <p className="text-xs text-amber-600/80 dark:text-amber-400/80">Turn off AI mode to respond manually</p>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Input 
              ref={inputRef} 
              value={message} 
              onChange={handleMessageChange} 
              onKeyDown={handleKeyDown} 
              placeholder={
                isAIEnabled && status !== 'closed'
                  ? 'AI mode is active — disable to reply' 
                  : 'Type / for shortcuts...'
              } 
              disabled={isAIEnabled && status !== 'closed'} 
              className={cn(
                "flex-1 transition-colors rounded-xl",
                isAIEnabled 
                  ? "bg-muted/50 cursor-not-allowed opacity-60" 
                  : "bg-background/50 focus:bg-background"
              )} 
            />
            <Button 
              onClick={handleSend} 
              disabled={!message.trim() || (isAIEnabled && status !== 'closed')} 
              className={cn(
                "transition-all rounded-xl",
                isAIEnabled && status !== 'closed'
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : !message.trim()
                    ? "bg-muted text-muted-foreground"
                    : "bg-primary hover:bg-primary/90 glow-primary hover:scale-105"
              )}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Visitor Info Sidebar - Collapsible on large screens */}
      <VisitorInfoSidebar visitor={visitor} assignedAgent={assignedAgent} propertyName={propertyName} conversationId={conversation?.id} />

      {/* Video Call Modal */}
      <VideoCallModal isOpen={isVideoCallOpen} onClose={() => setIsVideoCallOpen(false)} status={videoChat.status} isMuted={videoChat.isMuted} isVideoOff={videoChat.isVideoOff} error={videoChat.error} localVideoRef={videoChat.localVideoRef} remoteVideoRef={videoChat.remoteVideoRef} onEndCall={handleEndVideoCall} onToggleMute={videoChat.toggleMute} onToggleVideo={videoChat.toggleVideo} participantName={visitorName} isInitiator={true} />
    </div>;
};