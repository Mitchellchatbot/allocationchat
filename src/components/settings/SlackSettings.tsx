import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useFormDraft } from '@/hooks/useFormDraft';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Save, Unlink, Info, CheckCircle2, XCircle, Link2 } from 'lucide-react';

interface SlackSettingsProps {
  propertyId?: string;
  /** When provided, settings are saved to ALL listed properties (bulk mode) */
  bulkPropertyIds?: string[];
  /** Full property objects for bulk mode display */
  bulkProperties?: { id: string; name: string; domain: string }[];
}

interface SlackConfig {
  id: string;
  enabled: boolean;
  access_token: string | null;
  team_id: string | null;
  team_name: string | null;
  incoming_webhook_channel: string | null;
  notify_on_new_conversation: boolean;
  notify_on_escalation: boolean;
  notify_on_phone_submission: boolean;
}

export const SlackSettings = ({ propertyId, bulkPropertyIds, bulkProperties }: SlackSettingsProps) => {
  const isBulk = !!bulkPropertyIds && bulkPropertyIds.length > 0;
  const effectivePropertyId = isBulk ? bulkPropertyIds[0] : propertyId;

  const [serverConfig, setServerConfig] = useState<SlackConfig | null>(null);
  const [loading, setLoading] = useState(!isBulk);
  const [saving, setSaving] = useState(false);
  const [connecting, setConnecting] = useState(false);

  // Bulk mode: per-property connection statuses
  const [bulkStatuses, setBulkStatuses] = useState<Record<string, { connected: boolean; teamName: string | null }>>({});
  const [bulkStatusesLoading, setBulkStatusesLoading] = useState(false);
  const [reconnectingId, setReconnectingId] = useState<string | null>(null);

  const draftKey = `slack-settings-${effectivePropertyId || 'bulk'}`;
  const [config, setConfig, clearDraft] = useFormDraft<SlackConfig>(draftKey, serverConfig, loading);

  // Listen for OAuth callback messages from popup
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'slack-oauth-success') {
        toast.success(`Connected to ${event.data.team || 'Slack'}!`);
        if (!isBulk) fetchSettings();
        setConnecting(false);
      } else if (event.data?.type === 'slack-oauth-error') {
        toast.error(`Slack connection failed: ${event.data.error}`);
        setConnecting(false);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    if (isBulk) {
      setServerConfig({
        id: '',
        enabled: true,
        access_token: null,
        team_id: null,
        team_name: null,
        incoming_webhook_channel: null,
        notify_on_new_conversation: true,
        notify_on_escalation: true,
        notify_on_phone_submission: true,
      });
      setLoading(false);
      fetchBulkStatuses();
    } else if (effectivePropertyId) {
      fetchSettings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId, bulkPropertyIds?.join(',')]);

  const fetchBulkStatuses = async () => {
    if (!bulkPropertyIds || bulkPropertyIds.length === 0) return;
    setBulkStatusesLoading(true);
    const { data } = await supabase
      .from('slack_notification_settings')
      .select('property_id, access_token, team_name')
      .in('property_id', bulkPropertyIds);

    const statuses: Record<string, { connected: boolean; teamName: string | null }> = {};
    bulkPropertyIds.forEach(id => { statuses[id] = { connected: false, teamName: null }; });
    (data || []).forEach((row: any) => {
      statuses[row.property_id] = { connected: !!row.access_token, teamName: row.team_name };
    });
    setBulkStatuses(statuses);
    setBulkStatusesLoading(false);
  };

  const handleReconnectSlack = async (pid: string) => {
    setReconnectingId(pid);
    try {
      const { data, error } = await supabase.functions.invoke('slack-oauth-start', {
        body: { propertyId: pid },
      });
      if (error || !data?.url) {
        toast.error('Failed to start Slack connection');
        setReconnectingId(null);
        return;
      }

      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === 'slack-oauth-success') {
          toast.success(`Connected to ${event.data.team || 'Slack'}!`);
          setReconnectingId(null);
          fetchBulkStatuses();
          window.removeEventListener('message', handleMessage);
        } else if (event.data?.type === 'slack-oauth-error') {
          toast.error(`Slack connection failed: ${event.data.error}`);
          setReconnectingId(null);
          window.removeEventListener('message', handleMessage);
        }
      };
      window.addEventListener('message', handleMessage);

      const width = 600, height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      const popup = window.open(data.url, 'slack-oauth', `width=${width},height=${height},left=${left},top=${top},popup=1`);

      const checkPopup = setInterval(() => {
        if (!popup || popup.closed) {
          clearInterval(checkPopup);
          setTimeout(() => {
            window.removeEventListener('message', handleMessage);
            setReconnectingId(null);
            fetchBulkStatuses();
          }, 500);
        }
      }, 500);
    } catch {
      toast.error('Failed to start Slack connection');
      setReconnectingId(null);
    }
  };

  const fetchSettings = async () => {
    if (!effectivePropertyId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('slack_notification_settings')
      .select('*')
      .eq('property_id', effectivePropertyId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching Slack settings:', error);
      toast.error('Failed to load Slack settings');
      setLoading(false);
      return;
    }

    if (data) {
      setServerConfig({
        id: data.id,
        enabled: data.enabled,
        access_token: data.access_token,
        team_id: data.team_id,
        team_name: data.team_name,
        incoming_webhook_channel: data.incoming_webhook_channel,
        notify_on_new_conversation: data.notify_on_new_conversation,
        notify_on_escalation: data.notify_on_escalation,
        notify_on_phone_submission: data.notify_on_phone_submission ?? true,
      });
    } else {
      setServerConfig(null);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);

    if (isBulk && bulkPropertyIds) {
      // Bulk save: upsert for each property
      let successCount = 0;
      let errorCount = 0;

      for (const pid of bulkPropertyIds) {
        const settingsData = {
          property_id: pid,
          enabled: config?.enabled ?? false,
          notify_on_new_conversation: config?.notify_on_new_conversation ?? true,
          notify_on_escalation: config?.notify_on_escalation ?? true,
          notify_on_phone_submission: config?.notify_on_phone_submission ?? true,
        };

        const { data: existing } = await supabase
          .from('slack_notification_settings')
          .select('id')
          .eq('property_id', pid)
          .maybeSingle();

        let result;
        if (existing) {
          result = await supabase
            .from('slack_notification_settings')
            .update(settingsData)
            .eq('id', existing.id);
        } else {
          result = await supabase
            .from('slack_notification_settings')
            .insert(settingsData);
        }

        if (result.error) {
          errorCount++;
          console.error(`Error saving Slack settings for property ${pid}:`, result.error);
        } else {
          successCount++;
        }
      }

      setSaving(false);
      if (errorCount > 0) {
        toast.error(`Failed for ${errorCount} propert${errorCount === 1 ? 'y' : 'ies'}`);
      }
      if (successCount > 0) {
        clearDraft();
        toast.success(`Slack settings saved for ${successCount} propert${successCount === 1 ? 'y' : 'ies'}`);
      }
      return;
    }

    // Single property save
    const settingsData = {
      property_id: effectivePropertyId!,
      enabled: config?.enabled ?? false,
      notify_on_new_conversation: config?.notify_on_new_conversation ?? true,
      notify_on_escalation: config?.notify_on_escalation ?? true,
      notify_on_phone_submission: config?.notify_on_phone_submission ?? true,
    };

    let result;
    if (config?.id) {
      result = await supabase
        .from('slack_notification_settings')
        .update(settingsData)
        .eq('id', config.id);
    } else {
      result = await supabase
        .from('slack_notification_settings')
        .insert(settingsData)
        .select()
        .single();
    }

    setSaving(false);

    if (result.error) {
      console.error('Error saving Slack settings:', result.error);
      toast.error('Failed to save Slack settings');
      return;
    }

    if (!config?.id && result.data) {
      setConfig({
        ...config!,
        id: result.data.id,
      });
    }

    clearDraft();
    toast.success('Slack settings saved');
  };

  const handleConnectSlack = async () => {
    setConnecting(true);

    try {
      const { data, error } = await supabase.functions.invoke('slack-oauth-start', {
        body: { propertyId: effectivePropertyId },
      });

      if (error || !data?.url) {
        console.error('Failed to get Slack OAuth URL:', error);
        toast.error('Failed to start Slack connection');
        setConnecting(false);
        return;
      }

      window.open(data.url, '_blank', 'width=600,height=700');
    } catch (err) {
      console.error('Error connecting to Slack:', err);
      toast.error('Failed to connect to Slack');
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!config?.id) return;

    const { error } = await supabase
      .from('slack_notification_settings')
      .update({
        access_token: null,
        team_id: null,
        team_name: null,
        incoming_webhook_channel: null,
        incoming_webhook_url: null,
        bot_user_id: null,
      })
      .eq('id', config.id);

    if (error) {
      toast.error('Failed to disconnect Slack');
      return;
    }

    setConfig({
      ...config,
      access_token: null,
      team_id: null,
      team_name: null,
      incoming_webhook_channel: null,
    });

    toast.success('Slack disconnected');
  };

  const isConnected = !!config?.access_token;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {isBulk && (
        <Card>
          <CardHeader>
            <CardTitle>Slack Connection Overview</CardTitle>
            <CardDescription>
              Slack OAuth is per-property. Connect or reconnect each property below.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {bulkStatusesLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-2">
                {(bulkProperties || []).map(prop => {
                  const status = bulkStatuses[prop.id];
                  const isConnected = status?.connected;
                  const isReconnecting = reconnectingId === prop.id;
                  return (
                    <div key={prop.id} className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/50">
                      <div>
                        <p className="text-sm font-medium">{prop.name}</p>
                        {isConnected && status?.teamName && (
                          <p className="text-xs text-muted-foreground">{status.teamName}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {isConnected ? (
                          <div className="flex items-center gap-1.5 text-primary">
                            <CheckCircle2 className="h-4 w-4" />
                            <span className="text-xs font-medium">Connected</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <XCircle className="h-4 w-4" />
                            <span className="text-xs">Not connected</span>
                          </div>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          disabled={isReconnecting}
                          onClick={() => handleReconnectSlack(prop.id)}
                        >
                          {isReconnecting ? (
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          ) : (
                            <Link2 className="mr-1 h-3 w-3" />
                          )}
                          {isConnected ? 'Reconnect' : 'Connect'}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Connection Status - only show for single property */}
      {!isBulk && (
        <Card data-tour="slack-connection">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Slack Connection</CardTitle>
                <CardDescription>
                  Connect your Slack workspace to receive notifications
                </CardDescription>
              </div>
              <Badge variant={isConnected ? 'default' : 'secondary'}>
                {isConnected ? 'Connected' : 'Not Connected'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {isConnected ? (
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">Connected to {config?.team_name || 'Slack'}</p>
                  {config?.incoming_webhook_channel && (
                    <p className="text-sm text-muted-foreground">
                      Channel: {config.incoming_webhook_channel}
                    </p>
                  )}
                </div>
                <Button variant="outline" size="sm" className="text-destructive" onClick={handleDisconnect}>
                  <Unlink className="mr-2 h-4 w-4" />
                  Disconnect
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 py-6 border rounded-lg bg-muted/50">
                <div className="text-center">
                  <p className="font-medium mb-1">Connect to Slack</p>
                  <p className="text-sm text-muted-foreground">
                    Click the button below to connect your Slack workspace
                  </p>
                </div>
                <Button onClick={handleConnectSlack} disabled={connecting}>
                  {connecting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
                    </svg>
                  )}
                  Add Slack Account
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Notification Settings */}
      <Card data-tour="slack-triggers">
        <CardHeader>
          <CardTitle>Notification Triggers</CardTitle>
          <CardDescription>
            Choose when to receive Slack notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Slack Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Turn on/off all Slack notifications
              </p>
            </div>
            <Switch
              checked={config?.enabled ?? false}
              onCheckedChange={(checked) => setConfig(prev => prev ? { ...prev, enabled: checked } : {
                id: '',
                enabled: checked,
                access_token: null,
                team_id: null,
                team_name: null,
                incoming_webhook_channel: null,
                notify_on_new_conversation: true,
                notify_on_escalation: true,
                notify_on_phone_submission: true,
              })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>New Conversation</Label>
              <p className="text-sm text-muted-foreground">
                Notify when a new chat conversation starts
              </p>
            </div>
            <Switch
              checked={config?.notify_on_new_conversation ?? true}
              onCheckedChange={(checked) => setConfig(prev => prev ? { ...prev, notify_on_new_conversation: checked } : null)}
              disabled={!config?.enabled}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Escalation</Label>
              <p className="text-sm text-muted-foreground">
                Notify when a conversation is escalated to a human agent
              </p>
            </div>
            <Switch
              checked={config?.notify_on_escalation ?? true}
              onCheckedChange={(checked) => setConfig(prev => prev ? { ...prev, notify_on_escalation: checked } : null)}
              disabled={!config?.enabled}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Phone Number Submitted</Label>
              <p className="text-sm text-muted-foreground">
                Notify when a visitor shares their phone number
              </p>
            </div>
            <Switch
              checked={config?.notify_on_phone_submission ?? true}
              onCheckedChange={(checked) => setConfig(prev => prev ? { ...prev, notify_on_phone_submission: checked } : null)}
              disabled={!config?.enabled}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {isBulk ? `Save to All ${bulkPropertyIds!.length} Properties` : 'Save Slack Settings'}
        </Button>
      </div>
    </div>
  );
};