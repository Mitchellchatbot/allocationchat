import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useFormDraft } from '@/hooks/useFormDraft';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Save, Plus, Trash2, Mail, Users, UserPlus, Info } from 'lucide-react';

interface EmailSettingsProps {
  propertyId?: string;
  /** When provided, settings are saved to ALL listed properties (bulk mode) */
  bulkPropertyIds?: string[];
}

interface EmailConfig {
  id: string;
  enabled: boolean;
  notification_emails: string[];
  notify_on_new_conversation: boolean;
  notify_on_escalation: boolean;
  notify_on_phone_submission: boolean;
}

export const EmailSettings = ({ propertyId, bulkPropertyIds }: EmailSettingsProps) => {
  const isBulk = !!bulkPropertyIds && bulkPropertyIds.length > 0;
  const effectivePropertyId = isBulk ? bulkPropertyIds[0] : propertyId;

  const { user } = useAuth();
  const [serverConfig, setServerConfig] = useState<EmailConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [teamEmails, setTeamEmails] = useState<{ email: string; name: string }[]>([]);
  const [selectedTeamEmails, setSelectedTeamEmails] = useState<Set<string>>(new Set());

  const draftKey = isBulk ? 'email-settings-bulk' : `email-settings-${effectivePropertyId || ''}`;
  const [config, setConfig, clearDraft] = useFormDraft<EmailConfig>(draftKey, serverConfig, loading);

  useEffect(() => {
    const initialize = async () => {
      setLoading(true);

      if (isBulk) {
        await Promise.all([fetchBulkSettings(), fetchTeamEmails()]);
        return;
      }

      if (effectivePropertyId) {
        await Promise.all([fetchSettings(), fetchTeamEmails()]);
        return;
      }

      setServerConfig(null);
      await fetchTeamEmails();
      setLoading(false);
    };

    initialize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId, bulkPropertyIds?.join(','), user?.id]);

  const fetchSettings = async () => {
    if (!effectivePropertyId) return;
    const { data, error } = await supabase
      .from('email_notification_settings')
      .select('*')
      .eq('property_id', effectivePropertyId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching Email settings:', error);
      toast.error('Failed to load Email settings');
      setLoading(false);
      return;
    }

    if (data) {
      setServerConfig({
        id: data.id,
        enabled: data.enabled,
        notification_emails: data.notification_emails || [],
        notify_on_new_conversation: data.notify_on_new_conversation,
        notify_on_escalation: data.notify_on_escalation,
        notify_on_phone_submission: data.notify_on_phone_submission ?? true,
      });
    } else {
      setServerConfig(null);
    }
    setLoading(false);
  };

  const fetchBulkSettings = async () => {
    if (!bulkPropertyIds?.length) {
      setServerConfig({
        id: '',
        enabled: true,
        notification_emails: [],
        notify_on_new_conversation: true,
        notify_on_escalation: true,
        notify_on_phone_submission: true,
      });
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('email_notification_settings')
      .select('enabled, notification_emails, notify_on_new_conversation, notify_on_escalation, notify_on_phone_submission')
      .in('property_id', bulkPropertyIds);

    if (error) {
      console.error('Error fetching bulk Email settings:', error);
      toast.error('Failed to load bulk Email settings');
      setServerConfig({
        id: '',
        enabled: true,
        notification_emails: [],
        notify_on_new_conversation: true,
        notify_on_escalation: true,
        notify_on_phone_submission: true,
      });
      setLoading(false);
      return;
    }

    const rows = data || [];
    const mergedRecipients = Array.from(
      new Set(
        rows
          .flatMap((row) => row.notification_emails || [])
          .map((email) => email.toLowerCase()),
      ),
    );

    setServerConfig({
      id: '',
      enabled: rows.length ? rows.some((row) => row.enabled) : true,
      notification_emails: mergedRecipients,
      notify_on_new_conversation: rows.length ? rows.some((row) => row.notify_on_new_conversation) : true,
      notify_on_escalation: rows.length ? rows.some((row) => row.notify_on_escalation) : true,
      notify_on_phone_submission: rows.length ? rows.some((row) => row.notify_on_phone_submission ?? true) : true,
    });
    setLoading(false);
  };

  const fetchTeamEmails = async () => {
    if (!user) return;
    const [agentsResult, profileResult] = await Promise.all([
      supabase.from('agents').select('email, name').eq('invited_by', user.id),
      supabase.from('profiles').select('email, full_name').eq('user_id', user.id).maybeSingle(),
    ]);

    const emails: { email: string; name: string }[] = [];
    
    if (profileResult.data) {
      emails.push({ email: profileResult.data.email, name: profileResult.data.full_name || 'You' });
    }
    
    if (agentsResult.data) {
      for (const agent of agentsResult.data) {
        if (!emails.some(e => e.email === agent.email)) {
          emails.push({ email: agent.email, name: agent.name });
        }
      }
    }
    
    setTeamEmails(emails);
  };

  const handleSave = async () => {
    setSaving(true);

    if (isBulk && bulkPropertyIds) {
      let successCount = 0;
      let errorCount = 0;

      for (const pid of bulkPropertyIds) {
        const settingsData = {
          property_id: pid,
          enabled: config?.enabled ?? false,
          notification_emails: config?.notification_emails || [],
          notify_on_new_conversation: config?.notify_on_new_conversation ?? true,
          notify_on_escalation: config?.notify_on_escalation ?? true,
          notify_on_phone_submission: config?.notify_on_phone_submission ?? true,
        };

        const { data: existing } = await supabase
          .from('email_notification_settings')
          .select('id')
          .eq('property_id', pid)
          .maybeSingle();

        let result;
        if (existing) {
          result = await supabase
            .from('email_notification_settings')
            .update(settingsData)
            .eq('id', existing.id);
        } else {
          result = await supabase
            .from('email_notification_settings')
            .insert(settingsData);
        }

        if (result.error) {
          errorCount++;
          console.error(`Error saving Email settings for property ${pid}:`, result.error);
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
        toast.success(`Email settings saved for ${successCount} propert${successCount === 1 ? 'y' : 'ies'}`);
      }
      return;
    }

    // Single property save
    const settingsData = {
      property_id: effectivePropertyId!,
      enabled: config?.enabled ?? false,
      notification_emails: config?.notification_emails || [],
      notify_on_new_conversation: config?.notify_on_new_conversation ?? true,
      notify_on_escalation: config?.notify_on_escalation ?? true,
      notify_on_phone_submission: config?.notify_on_phone_submission ?? true,
    };

    let result;
    if (config?.id) {
      result = await supabase
        .from('email_notification_settings')
        .update(settingsData)
        .eq('id', config.id);
    } else {
      result = await supabase
        .from('email_notification_settings')
        .insert(settingsData)
        .select()
        .single();
    }

    setSaving(false);

    if (result.error) {
      console.error('Error saving Email settings:', result.error);
      toast.error('Failed to save Email settings');
      return;
    }

    if (!config?.id && result.data) {
      setConfig({
        ...settingsData,
        id: result.data.id,
      });
    }

    clearDraft();
    toast.success('Email settings saved');
  };

  const addEmail = () => {
    if (!newEmail.trim()) return;
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail.trim())) {
      toast.error('Please enter a valid email address');
      return;
    }

    const emails = config?.notification_emails || [];
    if (emails.includes(newEmail.trim().toLowerCase())) {
      toast.error('Email already added');
      return;
    }

    setConfig(prev => prev ? {
      ...prev,
      notification_emails: [...prev.notification_emails, newEmail.trim().toLowerCase()],
    } : {
      id: '',
      enabled: false,
      notification_emails: [newEmail.trim().toLowerCase()],
      notify_on_new_conversation: true,
      notify_on_escalation: true,
      notify_on_phone_submission: true,
    });
    setNewEmail('');
  };

  const removeEmail = (email: string) => {
    setConfig(prev => prev ? {
      ...prev,
      notification_emails: prev.notification_emails.filter(e => e !== email),
    } : null);
  };

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
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Bulk mode:</strong> Email recipients and triggers will be applied to all {bulkPropertyIds!.length} properties at once.
          </AlertDescription>
        </Alert>
      )}

      {/* Email Recipients */}
      <Card data-tour="email-recipients">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Email Notifications</CardTitle>
              <CardDescription>
                Receive email notifications for new conversations
              </CardDescription>
            </div>
            <Badge variant={(config?.notification_emails?.length ?? 0) > 0 ? 'default' : 'secondary'}>
              {(config?.notification_emails?.length ?? 0) > 0 
                ? `${config?.notification_emails.length} recipient${config?.notification_emails.length === 1 ? '' : 's'}` 
                : 'No Recipients'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Add Email */}
          <div className="space-y-2">
            <Label>Notification Recipients</Label>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="team@example.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addEmail()}
              />
              <Button onClick={addEmail} variant="secondary">
                <Plus className="mr-2 h-4 w-4" />
                Add
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Add email addresses to receive notifications
            </p>
          </div>

          {/* Quick Add from Team Members */}
          {teamEmails.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <Label>Quick Add from Team</Label>
                </div>
                {selectedTeamEmails.size > 0 && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      const currentEmails = config?.notification_emails || [];
                      const newEmails = Array.from(selectedTeamEmails).filter(
                        e => !currentEmails.includes(e)
                      );
                      if (newEmails.length === 0) {
                        toast.info('Selected emails are already added');
                        setSelectedTeamEmails(new Set());
                        return;
                      }
                      setConfig(prev => prev ? {
                        ...prev,
                        notification_emails: [...prev.notification_emails, ...newEmails],
                      } : {
                        id: '',
                        enabled: false,
                        notification_emails: newEmails,
                        notify_on_new_conversation: true,
                        notify_on_escalation: true,
                        notify_on_phone_submission: true,
                      });
                      setSelectedTeamEmails(new Set());
                      toast.success(`Added ${newEmails.length} recipient${newEmails.length === 1 ? '' : 's'}`);
                    }}
                  >
                    <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                    Add {selectedTeamEmails.size} selected
                  </Button>
                )}
              </div>
              <div className="border rounded-lg divide-y divide-border/50">
                {teamEmails.map(({ email, name }) => {
                  const alreadyAdded = config?.notification_emails?.includes(email);
                  const isSelected = selectedTeamEmails.has(email);
                  return (
                    <label
                      key={email}
                      className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors hover:bg-accent/50 ${alreadyAdded ? 'opacity-50' : ''}`}
                    >
                      <Checkbox
                        checked={isSelected || alreadyAdded}
                        disabled={alreadyAdded}
                        onCheckedChange={(checked) => {
                          const next = new Set(selectedTeamEmails);
                          if (checked) next.add(email);
                          else next.delete(email);
                          setSelectedTeamEmails(next);
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{name}</p>
                        <p className="text-xs text-muted-foreground truncate">{email}</p>
                      </div>
                      {alreadyAdded && (
                        <Badge variant="secondary" className="text-[10px] shrink-0">Added</Badge>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Email List */}
          {(config?.notification_emails?.length ?? 0) > 0 && (
            <div className="space-y-2">
              {config?.notification_emails.map((email) => (
                <div 
                  key={email} 
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{email}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeEmail(email)}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {(config?.notification_emails?.length ?? 0) === 0 && (
            <div className="flex flex-col items-center gap-2 py-6 border rounded-lg bg-muted/50">
              <Mail className="h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground text-center">
                No email recipients added yet
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card data-tour="email-triggers">
        <CardHeader>
          <CardTitle>Notification Triggers</CardTitle>
          <CardDescription>
            Choose when to receive email notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Email Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Turn on/off all email notifications
              </p>
            </div>
            <Switch
              checked={config?.enabled ?? false}
              onCheckedChange={(checked) => setConfig(prev => prev ? { ...prev, enabled: checked } : {
                id: '',
                enabled: checked,
                notification_emails: [],
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
          {isBulk ? `Save to All ${bulkPropertyIds!.length} Properties` : 'Save Email Settings'}
        </Button>
      </div>
    </div>
  );
};