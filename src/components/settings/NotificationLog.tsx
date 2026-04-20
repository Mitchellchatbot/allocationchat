import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, Inbox, MessageSquare, AlertTriangle, Phone, Building2, Mail, MailX, Send, XCircle, UploadCloud, ChevronRight, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format, formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface NotificationLogProps {
  propertyId?: string;
}

interface LogEntry {
  id: string;
  notification_type: string;
  channel: string;
  recipient: string;
  recipient_type: string;
  status: string;
  visitor_name: string | null;
  error_message: string | null;
  created_at: string;
  property_id: string;
  conversation_id: string | null;
}

const iconMap: Record<string, { icon: typeof MessageSquare; color: string; bg: string }> = {
  new_conversation: { icon: MessageSquare, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  escalation: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  phone_submission: { icon: Phone, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  property_added: { icon: Building2, color: 'text-violet-500', bg: 'bg-violet-500/10' },
  email: { icon: Mail, color: 'text-sky-500', bg: 'bg-sky-500/10' },
  slack: { icon: Send, color: 'text-teal-500', bg: 'bg-teal-500/10' },
  export_success: { icon: UploadCloud, color: 'text-green-500', bg: 'bg-green-500/10' },
  salesforce_export: { icon: UploadCloud, color: 'text-green-500', bg: 'bg-green-500/10' },
  export_failed: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10' },
  agent_invitation: { icon: UserPlus, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
  salesforce_session_expired: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-500/10' },
};

const defaultIcon = { icon: MessageSquare, color: 'text-primary', bg: 'bg-primary/10' };

function getReadableDescription(log: LogEntry, propName: string): { title: string; description: string } {
  const visitor = log.visitor_name || 'A visitor';
  const nt = log.notification_type;
  const failed = log.status === 'failed';

  if (nt === 'new_conversation') {
    return {
      title: 'New Conversation',
      description: `${visitor} started a new chat on ${propName}`,
    };
  }
  if (nt === 'escalation') {
    return {
      title: 'Escalation Alert',
      description: `${visitor} requested human assistance on ${propName}`,
    };
  }
  if (nt === 'phone_submission') {
    return {
      title: 'Phone Number Captured',
      description: `${visitor} shared their phone number on ${propName}`,
    };
  }
  if (nt === 'property_added') {
    return {
      title: 'Property Added',
      description: `${propName} was added to your workspace`,
    };
  }
  if (nt === 'export_success' || nt === 'salesforce_export') {
    return {
      title: 'Lead Exported to Salesforce',
      description: `${visitor}'s lead from ${propName} was exported to Salesforce`,
    };
  }
  if (nt === 'export_failed') {
    return {
      title: 'Salesforce Export Failed',
      description: `Failed to export ${visitor}'s lead from ${propName}`,
    };
  }
  if (nt === 'agent_invitation') {
    return {
      title: 'Agent Invited',
      description: `${log.recipient} was invited to join your workspace`,
    };
  }
  if (nt === 'salesforce_session_expired') {
    return {
      title: 'Salesforce Session Expired',
      description: `Salesforce connection expired for ${propName}. Please reconnect.`,
    };
  }

  // Channel-based fallback
  const ch = log.channel;
  if (ch === 'email' || nt === 'email') {
    return failed
      ? { title: 'Email Notification Failed', description: `Email to ${log.recipient} failed for ${propName}` }
      : { title: 'Email Sent', description: `Email notification sent to ${log.recipient} about ${visitor} on ${propName}` };
  }
  if (ch === 'slack' || nt === 'slack') {
    return failed
      ? { title: 'Slack Alert Failed', description: `Slack notification failed for ${propName}` }
      : { title: 'Slack Alert Delivered', description: `Slack alert sent for ${visitor} on ${propName}` };
  }

  return {
    title: nt?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Notification',
    description: `${visitor} — ${propName}`,
  };
}

export const NotificationLog = ({ propertyId }: NotificationLogProps) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [propMap, setPropMap] = useState<Map<string, string>>(new Map());
  const navigate = useNavigate();

  const fetchLogs = async () => {
    setLoading(true);

    const [logsResult, propsResult] = await Promise.all([
      (() => {
        let query = supabase
          .from('notification_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);
        if (propertyId) {
          query = query.eq('property_id', propertyId);
        }
        return query;
      })(),
      supabase.from('properties').select('id, name'),
    ]);

    if (propsResult.data) {
      setPropMap(new Map(propsResult.data.map(p => [p.id, p.name])));
    }

    if (!logsResult.error && logsResult.data) {
      setLogs(logsResult.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, [propertyId]);

  // Realtime subscription
  useEffect(() => {
    const channelConfig: any = {
      event: 'INSERT',
      schema: 'public',
      table: 'notification_logs',
    };
    if (propertyId) {
      channelConfig.filter = `property_id=eq.${propertyId}`;
    }

    const channel = supabase
      .channel(`notification-logs-${propertyId || 'all'}`)
      .on('postgres_changes', channelConfig, (payload) => {
        setLogs((prev) => [payload.new as LogEntry, ...prev].slice(0, 50));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [propertyId]);

  const handleClick = (log: LogEntry) => {
    if (log.conversation_id) {
      navigate(`/dashboard?c=${log.conversation_id}`);
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'default';
      case 'exported': return 'default';
      case 'failed': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusLabel = (log: LogEntry) => {
    const nt = log.notification_type;
    if ((nt === 'salesforce_export' || nt === 'export_success') && log.status === 'sent') {
      return 'Exported';
    }
    if (nt === 'export_failed') {
      return 'Failed';
    }
    return log.status;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Notification Activity</CardTitle>
            <CardDescription>Recent notification delivery log</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchLogs}>
            <RefreshCw className="mr-2 h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <Inbox className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No notifications sent yet</p>
          </div>
        ) : (
          <div className="space-y-1.5 max-h-[500px] overflow-auto scrollbar-hide">
            {logs.map((log) => {
              const propName = propMap.get(log.property_id) || 'Unknown Property';
              const { title, description } = getReadableDescription(log, propName);
              const iconEntry = iconMap[log.notification_type] || (log.channel === 'email' ? iconMap.email : log.channel === 'slack' ? iconMap.slack : defaultIcon);
              const { icon: Icon, color, bg } = iconEntry;
              const isClickable = !!log.conversation_id;

              return (
                <button
                  key={log.id}
                  onClick={() => handleClick(log)}
                  disabled={!isClickable}
                  className={cn(
                    "w-full flex items-start gap-3 px-3.5 py-3 text-left rounded-lg transition-colors duration-150 border border-border/40",
                    isClickable
                      ? "hover:bg-accent/50 cursor-pointer"
                      : "cursor-default",
                    log.status === 'failed' && "border-destructive/20 bg-destructive/5"
                  )}
                >
                  <div className={cn("mt-0.5 h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0", bg)}>
                    <Icon className={cn("h-4 w-4", color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{title}</p>
                        <Badge variant={statusColor(log.status)} className="text-[10px] capitalize shrink-0 h-4 px-1.5">
                          {getStatusLabel(log)}
                        </Badge>
                      </div>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap flex-shrink-0">
                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{description}</p>
                    {log.error_message && (
                      <p className="text-xs text-destructive mt-1 truncate">{log.error_message}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground/60">
                      <span>{propName}</span>
                      {log.channel !== 'in_app' && (
                        <>
                          <span>•</span>
                          <span>via {log.channel === 'slack' ? 'Slack' : log.channel === 'email' ? 'Email' : log.channel}</span>
                        </>
                      )}
                    </div>
                  </div>
                  {isClickable && (
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 mt-1 flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
