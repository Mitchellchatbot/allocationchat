import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNotificationSound } from '@/hooks/useNotificationSound';
import { toast } from 'sonner';

const ALERT_TYPES = new Set(['new_chat', 'escalation']);
const DEFAULT_TITLE = 'Care Assist';

export function requestNotificationPermission() {
  if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

export type NotificationType =
  | 'new_chat'
  | 'escalation'
  | 'phone_captured'
  | 'property_added'
  | 'new_message'
  | 'email_sent'
  | 'email_failed'
  | 'slack_sent'
  | 'slack_failed'
  | 'export_success'
  | 'export_failed'
  | 'invitation_sent'
  | 'invitation_accepted'
  | 'agent_online'
  | 'agent_offline'
  | 'salesforce_session_expired';

export interface InAppNotification {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  timestamp: Date;
  propertyName?: string;
  conversationId?: string;
}

const SEEN_KEY = 'care-assist-notif-seen-at';

export function useInAppNotifications() {
  const { user } = useAuth();
  const { playSound } = useNotificationSound();
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastSeenAt, setLastSeenAt] = useState<Date>(() => {
    const stored = localStorage.getItem(SEEN_KEY);
    return stored ? new Date(stored) : new Date(0);
  });

  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    const since = new Date();
    since.setDate(since.getDate() - 7);

    // Fetch properties for name lookup
    const [propsResult, logsResult] = await Promise.all([
      supabase.from('properties').select('id, name'),
      supabase
        .from('notification_logs')
        .select('id, notification_type, channel, status, visitor_name, created_at, property_id, conversation_id')
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: false })
        .limit(50),
    ]);

    const propMap = new Map((propsResult.data || []).map(p => [p.id, p.name]));
    const items: InAppNotification[] = [];

    if (logsResult.data) {
      for (const log of logsResult.data) {
        const propName = propMap.get(log.property_id) || 'Unknown';
        const visitor = log.visitor_name || 'A visitor';
        const nt = log.notification_type;
        const ch = log.channel;
        const failed = log.status === 'failed';

        let mapped: { type: NotificationType; title: string; description: string };

        if (nt === 'new_conversation') {
          mapped = { type: 'new_chat', title: 'New Conversation', description: `${visitor} started a chat on ${propName}` };
        } else if (nt === 'escalation') {
          mapped = { type: 'escalation', title: 'Escalation Alert', description: `${visitor} needs human help on ${propName}` };
        } else if (nt === 'phone_submission') {
          mapped = { type: 'phone_captured', title: 'Phone Number Captured', description: `${visitor} shared their phone on ${propName}` };
        } else if (nt === 'property_added') {
          mapped = { type: 'property_added', title: 'Property Added', description: `${propName} was added to your account` };
        } else if (nt === 'export_success' || nt === 'salesforce_export') {
          mapped = { type: 'export_success', title: 'Lead Exported', description: `${visitor} was exported to Salesforce from ${propName}` };
        } else if (nt === 'export_failed') {
          mapped = { type: 'export_failed', title: 'Export Failed', description: `Salesforce export failed for ${propName}` };
        } else if (nt === 'invitation_sent') {
          mapped = { type: 'invitation_sent', title: 'Invitation Sent', description: `Invitation to ${visitor} was sent` };
        } else if (nt === 'invitation_accepted') {
          mapped = { type: 'invitation_accepted', title: 'Invitation Accepted', description: `${visitor} accepted your invitation` };
        } else if (nt === 'agent_online') {
          mapped = { type: 'agent_online', title: 'Agent Online', description: `${visitor} is now online` };
        } else if (nt === 'agent_offline') {
          mapped = { type: 'agent_offline', title: 'Agent Offline', description: `${visitor} is now offline` };
        } else if (nt === 'salesforce_session_expired') {
          mapped = { type: 'salesforce_session_expired', title: 'Salesforce Session Expired', description: `Salesforce connection expired for ${propName}. Please reconnect.` };
        } else if (ch === 'email' || nt === 'email') {
          mapped = failed
            ? { type: 'email_failed', title: 'Email Failed', description: `Email notification failed for ${propName}` }
            : { type: 'email_sent', title: 'Email Sent', description: `Email notification sent for ${visitor} on ${propName}` };
        } else if (ch === 'slack' || nt === 'slack') {
          mapped = failed
            ? { type: 'slack_failed', title: 'Slack Failed', description: `Slack notification failed for ${propName}` }
            : { type: 'slack_sent', title: 'Slack Sent', description: `Slack alert delivered for ${visitor} on ${propName}` };
        } else {
          mapped = {
            type: failed ? 'email_failed' : 'new_message',
            title: nt?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Notification',
            description: `${nt} on ${propName}`,
          };
        }

        items.push({
          id: `log-${log.id}`,
          ...mapped,
          timestamp: new Date(log.created_at),
          propertyName: propName,
          conversationId: log.conversation_id ?? undefined,
        });
      }
    }

    setNotifications(items);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Realtime: re-fetch and alert on new notification_logs entry
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('in-app-notifs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notification_logs' }, async (payload) => {
        playSound();
        await fetchNotifications();

        const log = payload.new as any;
        const nt = log?.notification_type;
        const convId = log?.conversation_id;

        // Only alert for new chats and escalations
        const [propsResult] = await Promise.all([
          supabase.from('properties').select('id, name').eq('id', log?.property_id).maybeSingle(),
        ]);
        const propName = propsResult.data?.name || 'a property';
        const visitor = log?.visitor_name || 'A visitor';

        // Map notification_type to our internal type
        const isChatAlert = nt === 'new_conversation' || nt === 'escalation';
        if (!isChatAlert) return;

        const title = nt === 'escalation' ? 'Escalation — rep needed' : 'New chat waiting';
        const body = `${visitor} on ${propName}`;
        const url = convId ? `/conversations/${convId}` : '/conversations';

        // 1. OS-level browser notification
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          const n = new Notification(title, {
            body,
            icon: `${window.location.origin}/favicon.ico`,
            tag: convId || nt,
          });
          n.onclick = () => {
            window.focus();
            window.location.href = url;
          };
        }

        // 2. Prominent in-app toast
        toast(title, {
          description: body,
          duration: 10000,
          action: convId ? {
            label: 'View',
            onClick: () => { window.location.href = url; },
          } : undefined,
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, fetchNotifications, playSound]);

  const markAllSeen = useCallback(() => {
    const now = new Date();
    setLastSeenAt(now);
    localStorage.setItem(SEEN_KEY, now.toISOString());
  }, []);

  const unseenCount = useMemo(
    () => notifications.filter(n => n.timestamp > lastSeenAt).length,
    [notifications, lastSeenAt]
  );

  const unseenAlertCount = useMemo(
    () => notifications.filter(n => n.timestamp > lastSeenAt && ALERT_TYPES.has(n.type)).length,
    [notifications, lastSeenAt]
  );

  // 3. Tab flash — alternates title to draw attention in the tab strip
  const flashIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (flashIntervalRef.current) {
      clearInterval(flashIntervalRef.current);
      flashIntervalRef.current = null;
    }
    if (unseenAlertCount > 0) {
      let show = true;
      document.title = `(${unseenAlertCount}) New Chat | ${DEFAULT_TITLE}`;
      flashIntervalRef.current = setInterval(() => {
        document.title = show ? DEFAULT_TITLE : `(${unseenAlertCount}) New Chat | ${DEFAULT_TITLE}`;
        show = !show;
      }, 1000);
    } else {
      document.title = DEFAULT_TITLE;
    }
    return () => {
      if (flashIntervalRef.current) clearInterval(flashIntervalRef.current);
    };
  }, [unseenAlertCount]);

  return { notifications, unseenCount, loading, markAllSeen, refetch: fetchNotifications };
}
