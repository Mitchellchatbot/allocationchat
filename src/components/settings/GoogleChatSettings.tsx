import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, Unlink, MessageSquare, CheckCircle2, Link2 } from 'lucide-react';

interface GoogleChatConfig {
  id: string;
  enabled: boolean;
  webhook_url: string | null;
  notify_on_new_conversation: boolean;
  notify_on_phone_submission: boolean;
  notify_on_insurance_submission: boolean;
}

interface Props {
  propertyId?: string;
  bulkPropertyIds?: string[];
  bulkProperties?: { id: string; name: string; domain: string }[];
}

export const GoogleChatSettings = ({ propertyId, bulkPropertyIds, bulkProperties }: Props) => {
  const isBulk = !!bulkPropertyIds && bulkPropertyIds.length > 0;
  const effectivePropertyId = isBulk ? undefined : propertyId;

  const [serverConfig, setServerConfig] = useState<GoogleChatConfig | null>(null);
  const [loading, setLoading] = useState(!isBulk);
  const [saving, setSaving] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);

  // Bulk: per-property connection status
  const [bulkStatuses, setBulkStatuses] = useState<Record<string, { connected: boolean; webhookUrl: string | null }>>({});
  const [bulkStatusesLoading, setBulkStatusesLoading] = useState(false);

  // Shared notification toggles
  const [notifyNewConversation, setNotifyNewConversation] = useState(true);
  const [notifyPhone, setNotifyPhone] = useState(true);
  const [notifyInsurance, setNotifyInsurance] = useState(true);

  // Webhook URL inputs
  const [webhookUrl, setWebhookUrl] = useState('');
  const [bulkWebhookUrl, setBulkWebhookUrl] = useState('');

  const fetchSettings = async () => {
    if (!effectivePropertyId) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from('google_chat_notification_settings')
        .select('*')
        .eq('property_id', effectivePropertyId)
        .maybeSingle();

      setServerConfig(data as GoogleChatConfig | null);
      if (data) {
        setNotifyNewConversation(data.notify_on_new_conversation ?? true);
        setNotifyInsurance(data.notify_on_insurance_submission ?? true);
        setNotifyPhone(data.notify_on_phone_submission ?? true);
        setWebhookUrl(data.webhook_url || '');
      }
    } catch (e) {
      console.error('GoogleChatSettings fetchSettings error:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchBulkStatuses = async () => {
    if (!bulkPropertyIds || bulkPropertyIds.length === 0) return;
    setBulkStatusesLoading(true);
    try {
      const { data } = await supabase
        .from('google_chat_notification_settings')
        .select('property_id, webhook_url, notify_on_new_conversation, notify_on_phone_submission, notify_on_insurance_submission')
        .in('property_id', bulkPropertyIds);

      const statuses: Record<string, { connected: boolean; webhookUrl: string | null }> = {};
      bulkPropertyIds.forEach(id => { statuses[id] = { connected: false, webhookUrl: null }; });
      (data || []).forEach((row: any) => {
        statuses[row.property_id] = { connected: !!(row.webhook_url && row.webhook_url.length > 0), webhookUrl: row.webhook_url };
      });
      setBulkStatuses(statuses);

      const firstConnected = (data || []).find((r: any) => r.webhook_url);
      if (firstConnected) {
        setNotifyNewConversation(firstConnected.notify_on_new_conversation ?? true);
        setNotifyInsurance(firstConnected.notify_on_insurance_submission ?? true);
        setNotifyPhone(firstConnected.notify_on_phone_submission ?? true);
      }
    } catch (e) {
      console.error('GoogleChatSettings fetchBulkStatuses error:', e);
    } finally {
      setBulkStatusesLoading(false);
    }
  };

  useEffect(() => {
    if (isBulk) {
      fetchBulkStatuses();
    } else if (effectivePropertyId) {
      fetchSettings();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId, bulkPropertyIds?.join(',')]);

  const handleSave = async () => {
    if (!effectivePropertyId) return;
    const url = webhookUrl.trim();
    if (!url) { toast.error('Please enter a webhook URL'); return; }
    if (!url.startsWith('https://chat.googleapis.com/')) {
      toast.error('Invalid webhook URL — must start with https://chat.googleapis.com/');
      return;
    }
    setSaving(true);
    const payload = {
      enabled: true,
      webhook_url: url,
      notify_on_new_conversation: notifyNewConversation,
      notify_on_phone_submission: notifyPhone,
      notify_on_insurance_submission: notifyInsurance,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase
      .from('google_chat_notification_settings')
      .upsert({ property_id: effectivePropertyId, ...payload }, { onConflict: 'property_id' });
    setSaving(false);
    if (error) { toast.error('Failed to save settings'); return; }
    toast.success('Google Chat connected');
    fetchSettings();
  };

  const handleSaveToggles = async () => {
    if (!effectivePropertyId) return;
    setSaving(true);
    const { error } = await supabase
      .from('google_chat_notification_settings')
      .update({
        notify_on_new_conversation: notifyNewConversation,
        notify_on_phone_submission: notifyPhone,
        notify_on_insurance_submission: notifyInsurance,
        updated_at: new Date().toISOString(),
      })
      .eq('property_id', effectivePropertyId);
    setSaving(false);
    if (error) { toast.error('Failed to save settings'); return; }
    toast.success('Settings saved');
  };

  const handleDisconnect = async (pid: string) => {
    const { error } = await supabase
      .from('google_chat_notification_settings')
      .update({ enabled: false, webhook_url: null })
      .eq('property_id', pid);
    if (error) { toast.error('Failed to disconnect'); return; }
    toast.success('Google Chat disconnected');
    if (!isBulk) {
      setWebhookUrl('');
      fetchSettings();
    } else {
      fetchBulkStatuses();
    }
  };

  const handleBulkConnect = async () => {
    const url = bulkWebhookUrl.trim();
    if (!url) { toast.error('Please enter a webhook URL'); return; }
    if (!url.startsWith('https://chat.googleapis.com/')) {
      toast.error('Invalid webhook URL — must start with https://chat.googleapis.com/');
      return;
    }
    if (!bulkPropertyIds || bulkPropertyIds.length === 0) return;

    setBulkSaving(true);
    try {
      // Save to first property (source), then bulk-copy to rest
      const sourceId = bulkPropertyIds[0];
      const payload = {
        enabled: true,
        webhook_url: url,
        notify_on_new_conversation: notifyNewConversation,
        notify_on_phone_submission: notifyPhone,
        notify_on_insurance_submission: notifyInsurance,
        updated_at: new Date().toISOString(),
      };
      const { error: srcErr } = await supabase
        .from('google_chat_notification_settings')
        .upsert({ property_id: sourceId, ...payload }, { onConflict: 'property_id' });
      if (srcErr) throw srcErr;

      const { error: bulkErr } = await supabase.functions.invoke('google-chat-bulk-connect', {
        body: { sourcePropertyId: sourceId, targetPropertyIds: bulkPropertyIds },
      });
      if (bulkErr) throw bulkErr;

      toast.success(`Connected all ${bulkPropertyIds.length} properties`);
      setBulkWebhookUrl('');
      fetchBulkStatuses();
    } catch {
      toast.error('Failed to connect all properties');
    } finally {
      setBulkSaving(false);
    }
  };

  const handleBulkSaveToggles = async () => {
    if (!bulkPropertyIds) return;
    const connectedIds = bulkPropertyIds.filter(id => bulkStatuses[id]?.connected);
    if (connectedIds.length === 0) { toast.error('No connected properties to save to'); return; }
    setBulkSaving(true);
    let errors = 0;
    for (const pid of connectedIds) {
      const { error } = await supabase
        .from('google_chat_notification_settings')
        .update({
          notify_on_new_conversation: notifyNewConversation,
          notify_on_phone_submission: notifyPhone,
          notify_on_insurance_submission: notifyInsurance,
          updated_at: new Date().toISOString(),
        })
        .eq('property_id', pid);
      if (error) errors++;
    }
    setBulkSaving(false);
    if (errors) toast.error(`Failed to save ${errors} propert${errors === 1 ? 'y' : 'ies'}`);
    else toast.success(`Saved to ${connectedIds.length} propert${connectedIds.length === 1 ? 'y' : 'ies'}`);
  };

  const isConnected = !!(serverConfig?.webhook_url);
  const anyConnected = isBulk && Object.values(bulkStatuses).some(s => s.connected);
  const allConnected = isBulk && bulkPropertyIds
    ? bulkPropertyIds.every(id => bulkStatuses[id]?.connected)
    : false;

  // ── No property selected ─────────────────────────────────────────────────
  if (!propertyId && !isBulk) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <MessageSquare className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">Select a property to configure Google Chat</p>
        </CardContent>
      </Card>
    );
  }

  if (loading || bulkStatusesLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* How-to banner */}
      <div className="rounded-xl border border-orange-200 bg-orange-50 p-5 text-sm text-orange-900 space-y-2 text-center">
        <p className="font-semibold text-orange-900">How to get your webhook URL</p>
        <ol className="space-y-1 text-orange-800">
          <li>1. Open Google Chat and go to the space you want notifications in</li>
          <li>2. Click the space name → <span className="font-medium">Apps &amp; Integrations</span> → <span className="font-medium">Add webhooks</span></li>
          <li>3. Name it "Care Assist", click Save, then copy the URL</li>
          <li>4. Paste it below</li>
        </ol>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">Google Chat</CardTitle>
          </div>
          <CardDescription>
            Receive notifications in Google Chat when visitors start conversations, submit phone numbers, or provide insurance info.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">

          {/* ── Single property mode ──────────────────────────────────── */}
          {!isBulk && (
            <>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Connection</p>
                    {isConnected ? (
                      <Badge variant="default" className="gap-1 bg-green-600 hover:bg-green-600">
                        <CheckCircle2 className="h-3 w-3" /> Connected
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">Not connected</Badge>
                    )}
                  </div>
                  {isConnected && (
                    <Button variant="outline" size="sm" onClick={() => handleDisconnect(effectivePropertyId!)} className="gap-1.5">
                      <Unlink className="h-3.5 w-3.5" /> Disconnect
                    </Button>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="gc-webhook">Webhook URL</Label>
                  <Input
                    id="gc-webhook"
                    placeholder="https://chat.googleapis.com/v1/spaces/…"
                    value={webhookUrl}
                    onChange={e => setWebhookUrl(e.target.value)}
                  />
                </div>

                <Button onClick={handleSave} disabled={saving || !webhookUrl.trim()} className="w-full gap-1.5">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
                  {isConnected ? 'Update Webhook' : 'Connect Google Chat'}
                </Button>
              </div>
            </>
          )}

          {/* ── Bulk property list ────────────────────────────────────── */}
          {isBulk && bulkProperties && (
            <div className="space-y-3">
              <p className="text-sm font-medium">Connect all properties to one space</p>
              <div className="flex gap-2">
                <Input
                  placeholder="https://chat.googleapis.com/v1/spaces/…"
                  value={bulkWebhookUrl}
                  onChange={e => setBulkWebhookUrl(e.target.value)}
                  className="flex-1"
                />
                <Button
                  size="sm"
                  disabled={bulkSaving || !bulkWebhookUrl.trim()}
                  onClick={handleBulkConnect}
                  className="gap-1.5 shrink-0"
                >
                  {bulkSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
                  {allConnected ? 'Update all' : 'Connect all'}
                </Button>
              </div>

              <div className="divide-y rounded-lg border overflow-hidden">
                {bulkProperties.map((prop) => {
                  const status = bulkStatuses[prop.id];
                  return (
                    <div key={prop.id} className="flex items-center justify-between px-4 py-3 bg-white">
                      <p className="text-sm font-medium truncate">{prop.name || prop.domain}</p>
                      <div className="flex items-center gap-2 ml-3 shrink-0">
                        {status?.connected ? (
                          <>
                            <Badge variant="default" className="gap-1 bg-green-600 hover:bg-green-600 text-xs">
                              <CheckCircle2 className="h-3 w-3" /> Connected
                            </Badge>
                            <Button variant="ghost" size="sm" onClick={() => handleDisconnect(prop.id)} className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive">
                              <Unlink className="h-3 w-3" />
                            </Button>
                          </>
                        ) : (
                          <Badge variant="outline" className="text-xs text-muted-foreground">Not connected</Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Notification toggles ── */}
          {(isConnected || isBulk) && (
            <div className="border-t pt-4 space-y-4">
              {isBulk && (
                <p className="text-xs text-muted-foreground">
                  These settings will be applied to all connected properties when you save.
                </p>
              )}
              <p className="text-sm font-medium">Notify me when…</p>

              <div className="flex items-center justify-between">
                <Label htmlFor="gc-new-conversation" className="font-normal cursor-pointer">New conversation starts</Label>
                <Switch id="gc-new-conversation" checked={notifyNewConversation} onCheckedChange={setNotifyNewConversation} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="gc-phone" className="font-normal cursor-pointer">Phone number submitted</Label>
                <Switch id="gc-phone" checked={notifyPhone} onCheckedChange={setNotifyPhone} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="gc-insurance" className="font-normal cursor-pointer">Insurance info submitted</Label>
                <Switch id="gc-insurance" checked={notifyInsurance} onCheckedChange={setNotifyInsurance} />
              </div>

              <Button
                onClick={isBulk ? handleBulkSaveToggles : handleSaveToggles}
                disabled={saving || bulkSaving || (isBulk && !anyConnected)}
                className="w-full gap-1.5"
              >
                {(saving || bulkSaving) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {isBulk ? 'Save to all connected properties' : 'Save Settings'}
              </Button>
            </div>
          )}

        </CardContent>
      </Card>
    </div>
  );
};
