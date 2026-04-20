import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Mail, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Props {
  userId: string;
}

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  active:        'default',
  comped:        'default',
  trialing:      'secondary',
  past_due:      'destructive',
  incomplete:    'destructive',
  canceled:      'outline',
  trial_expired: 'outline',
  no_subscription: 'outline',
};

const OVERDUE_STATUSES = new Set(['past_due', 'incomplete', 'canceled', 'trial_expired', 'no_subscription']);

export function AdminSubscriptionColumn({ userId }: Props) {
  const [sub, setSub] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data }) => { setSub(data); setLoading(false); });
  }, [userId]);

  const handleCompToggle = async (checked: boolean) => {
    setToggling(true);
    const updates = checked
      ? { is_comped: true, status: 'comped' }
      : { is_comped: false, status: 'trialing' };

    const { error } = await supabase
      .from('subscriptions')
      .update(updates)
      .eq('user_id', userId);

    if (error) {
      toast({ title: 'Error', description: 'Failed to update comp status', variant: 'destructive' });
    } else {
      setSub((prev: any) => prev ? { ...prev, ...updates } : prev);
      toast({ title: 'Success', description: checked ? 'Account comped' : 'Comp removed' });
    }
    setToggling(false);
  };

  const handleSendReminder = async () => {
    setSending(true);
    const { error } = await supabase.functions.invoke('send-payment-reminders', {
      body: { userId },
    });
    if (error) {
      toast({ title: 'Failed to send reminder', description: error.message, variant: 'destructive' });
    } else {
      setSub((prev: any) => prev ? { ...prev, last_payment_reminder_at: new Date().toISOString() } : prev);
      toast({ title: 'Reminder sent', description: 'Payment reminder email sent.' });
    }
    setSending(false);
  };

  if (loading) return <span className="text-xs text-muted-foreground">...</span>;
  if (!sub) return <span className="text-xs text-muted-foreground">No sub</span>;

  const status = sub.is_comped ? 'comped' : sub.status;
  const variant = STATUS_VARIANT[status] ?? 'outline';
  const isOverdue = !sub.is_comped && OVERDUE_STATUSES.has(sub.status);

  // Determine trial end vs billing period
  const trialExpired = sub.trial_ends_at && new Date(sub.trial_ends_at) < new Date();
  const dateLabel = sub.current_period_end
    ? `Renews ${new Date(sub.current_period_end).toLocaleDateString()}`
    : sub.trial_ends_at
    ? trialExpired
      ? `Trial ended ${new Date(sub.trial_ends_at).toLocaleDateString()}`
      : `Trial ends ${new Date(sub.trial_ends_at).toLocaleDateString()}`
    : null;

  return (
    <div className="flex flex-col gap-1.5 min-w-[160px]">
      <div className="flex items-center gap-2">
        <Badge variant={variant} className="text-xs capitalize">{status.replace('_', ' ')}</Badge>
        {sub.plan_id && !sub.is_comped && (
          <span className="text-xs text-muted-foreground capitalize">{sub.plan_id}</span>
        )}
      </div>

      {dateLabel && (
        <span className="text-[11px] text-muted-foreground">{dateLabel}</span>
      )}

      {sub.last_payment_reminder_at && (
        <span className="text-[11px] text-muted-foreground">
          Reminded {formatDistanceToNow(new Date(sub.last_payment_reminder_at), { addSuffix: true })}
        </span>
      )}

      <div className="flex items-center gap-2 mt-0.5">
        <div className="flex items-center gap-1" title="Comp account (free access)">
          <Switch
            checked={sub.is_comped}
            onCheckedChange={handleCompToggle}
            disabled={toggling}
            className="scale-75"
          />
          <span className="text-[10px] text-muted-foreground">Comp</span>
        </div>

        {isOverdue && (
          <Button
            variant="outline"
            size="sm"
            className="h-6 px-2 text-[11px]"
            onClick={handleSendReminder}
            disabled={sending}
            title="Send payment reminder email"
          >
            {sending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Mail className="h-3 w-3" />}
          </Button>
        )}
      </div>
    </div>
  );
}
