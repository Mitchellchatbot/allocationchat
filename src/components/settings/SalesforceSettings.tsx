import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Link2, Unlink, Save, Plus, Trash2, RefreshCw, AlertTriangle } from 'lucide-react';
import salesforceLogo from '@/assets/logos/salesforce.svg';

interface SalesforceSettingsProps {
  propertyId: string;
}

interface FieldMapping {
  salesforceField: string;
  visitorField: string;
}

interface SalesforceConfig {
  id: string;
  enabled: boolean;
  salesforce_org_id: string | null;
  instance_url: string | null;
  auto_export_on_escalation: boolean;
  auto_export_on_conversation_end: boolean;
  auto_export_on_insurance_detected: boolean;
  auto_export_on_phone_detected: boolean;
  include_insurance_card_attachment: boolean;
  insurance_card_lead_status: string;
  no_insurance_card_lead_status: string;
  field_mappings: Record<string, string>;
  client_id: string;
  client_secret: string;
  login_url: string;
}

interface SalesforceField {
  name: string;
  label: string;
  type: string;
  required: boolean;
}

// Visitor fields collected by the chatbot
const VISITOR_FIELDS = [
  { value: 'first_name', label: 'First Name' },
  { value: 'last_name', label: 'Last Name' },
  { value: 'name', label: 'Full Name' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'age', label: 'Age' },
  { value: 'occupation', label: 'Occupation' },
  { value: 'location', label: 'Location' },
  { value: 'current_page', label: 'Current Page' },
  { value: 'browser_info', label: 'Browser Info' },
  { value: 'gclid', label: 'Google Click ID (GCLID)' },
  { value: 'drug_of_choice', label: 'Drug of Choice' },
  { value: 'addiction_history', label: 'Addiction History' },
  { value: 'treatment_interest', label: 'Treatment Interest' },
  { value: 'insurance_company', label: 'Insurance Company' },
  { value: 'member_id', label: 'Member ID' },
  { value: 'insurance_info', label: 'Insurance Info (Legacy)' },
  { value: 'insurance_card_url', label: 'Insurance Card Photo URL' },
  { value: 'urgency_level', label: 'Urgency Level' },
  { value: 'date_of_birth', label: 'Date of Birth' },
  { value: 'conversation_transcript', label: 'Conversation Transcript (Full)' },
  { value: 'conversation_summary', label: 'Conversation Summary (AI)' },
];

export const SalesforceSettings = ({ propertyId }: SalesforceSettingsProps) => {
  const [config, setConfig] = useState<SalesforceConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);
  const [connecting, setConnecting] = useState(false);
  const [pendingLoginUrl, setPendingLoginUrl] = useState('');
  const [pendingClientId, setPendingClientId] = useState('');
  const [pendingClientSecret, setPendingClientSecret] = useState('');
  const [salesforceFields, setSalesforceFields] = useState<SalesforceField[]>([]);
  const [leadStatusValues, setLeadStatusValues] = useState<{ value: string; label: string; isDefault: boolean }[]>([]);
  const [loadingFields, setLoadingFields] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, [propertyId]);

  // Fetch Salesforce Lead fields when connected
  useEffect(() => {
    if (config?.salesforce_org_id || config?.instance_url) {
      fetchSalesforceFields();
    }
  }, [config?.salesforce_org_id, config?.instance_url]);

  const fetchSalesforceFields = async () => {
    setLoadingFields(true);
    setSessionExpired(false);
    try {
      const { data, error } = await supabase.functions.invoke('salesforce-describe-lead', {
        body: { propertyId },
      });

      if (error) {
        console.error('Error fetching Salesforce fields:', error);
        // Try to read the response body for session expiry details
        let bodyError = '';
        try {
          if (error.context?.body) {
            bodyError = typeof error.context.body === 'string' ? error.context.body : JSON.stringify(error.context.body);
          } else if (typeof (error as any).json === 'function') {
            const parsed = await (error as any).json();
            bodyError = parsed?.error || '';
          }
        } catch { /* ignore parse errors */ }
        
        const errorMsg = typeof error === 'object' && error.message ? error.message : String(error);
        const combinedError = `${errorMsg} ${bodyError} ${data?.error || ''}`;
        
        if (combinedError.includes('Session expired') || combinedError.includes('INVALID_SESSION_ID') || combinedError.includes('non-2xx')) {
          setSessionExpired(true);
        } else {
          toast.error('Failed to fetch Salesforce Lead fields');
        }
      } else if (data?.error) {
        if (data.error.includes('Session expired') || data.error.includes('INVALID_SESSION_ID')) {
          setSessionExpired(true);
        } else {
          toast.error(data.error);
        }
      } else if (data?.fields) {
        setSalesforceFields(data.fields);
        if (data.statusValues) setLeadStatusValues(data.statusValues);
        setSessionExpired(false);
      }
    } catch (err) {
      console.error('Error:', err);
    }
    setLoadingFields(false);
  };

  const fetchSettings = async () => {
    setLoading(true);
    const { data: rawData, error } = await supabase
      .from('salesforce_settings')
      .select('*')
      .eq('property_id', propertyId)
      .maybeSingle();
    const data = rawData as any;

    if (error) {
      console.error('Error fetching Salesforce settings:', error);
      toast.error('Failed to load Salesforce settings');
      setLoading(false);
      return;
    }

    if (data) {
      // Fetch linked org separately to avoid PostgREST FK join issues
      let org: any = null;
      if (data.salesforce_org_id) {
        const { data: orgData } = await supabase
          .from('salesforce_orgs' as any)
          .select('id, instance_url')
          .eq('id', data.salesforce_org_id)
          .maybeSingle();
        org = orgData;
      }

      setConfig({
        id: data.id,
        enabled: data.enabled,
        salesforce_org_id: data.salesforce_org_id || null,
        instance_url: org?.instance_url || data.instance_url,
        auto_export_on_escalation: data.auto_export_on_escalation,
        auto_export_on_conversation_end: data.auto_export_on_conversation_end,
        auto_export_on_insurance_detected: (data as any).auto_export_on_insurance_detected ?? false,
        auto_export_on_phone_detected: (data as any).auto_export_on_phone_detected ?? false,
        include_insurance_card_attachment: (data as any).include_insurance_card_attachment ?? false,
        insurance_card_lead_status: (data as any).insurance_card_lead_status || '',
        no_insurance_card_lead_status: (data as any).no_insurance_card_lead_status || '',
        field_mappings: data.field_mappings as Record<string, string>,
        client_id: data.client_id || '',
        client_secret: data.client_secret || '',
        login_url: (data as any).login_url || '',
      });
      setPendingLoginUrl((data as any).login_url || '');
      setPendingClientId(data.client_id || '');
      setPendingClientSecret(data.client_secret || '');

      // Convert field_mappings object to array
      const mappings = Object.entries(data.field_mappings as Record<string, string>).map(
        ([salesforceField, visitorField]) => ({
          salesforceField,
          visitorField,
        })
      );
      setFieldMappings(mappings);
    } else {
      setConfig(null);
      setFieldMappings([]);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);

    // Convert field mappings array to object
    const mappingsObject = fieldMappings.reduce((acc, mapping) => {
      if (mapping.salesforceField && mapping.visitorField) {
        acc[mapping.salesforceField] = mapping.visitorField;
      }
      return acc;
    }, {} as Record<string, string>);

    const settingsData = {
      property_id: propertyId,
      enabled: config?.enabled ?? false,
      auto_export_on_escalation: config?.auto_export_on_escalation ?? false,
      auto_export_on_conversation_end: config?.auto_export_on_conversation_end ?? false,
      auto_export_on_insurance_detected: config?.auto_export_on_insurance_detected ?? false,
      auto_export_on_phone_detected: config?.auto_export_on_phone_detected ?? false,
      include_insurance_card_attachment: config?.include_insurance_card_attachment ?? false,
      insurance_card_lead_status: config?.insurance_card_lead_status || null,
      no_insurance_card_lead_status: config?.no_insurance_card_lead_status || null,
      field_mappings: mappingsObject,
      client_id: config?.client_id || null,
      client_secret: config?.client_secret || null,
      login_url: config?.login_url || null,
    };

    let result;
    if (config?.id) {
      result = await supabase
        .from('salesforce_settings')
        .update(settingsData)
        .eq('id', config.id);
    } else {
      result = await supabase
        .from('salesforce_settings')
        .insert(settingsData)
        .select()
        .single();
    }

    setSaving(false);

    if (result.error) {
      console.error('Error saving Salesforce settings:', result.error);
      toast.error('Failed to save Salesforce settings');
      return;
    }

    if (!config?.id && result.data) {
      setConfig({
        ...settingsData,
        id: result.data.id,
        instance_url: null,
      });
    }

    toast.success('Salesforce settings saved');
  };

  const handleConnect = async () => {
    setConnecting(true);

    // Open popup synchronously BEFORE any await — browsers block window.open after async gaps
    const width = 600, height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    const popup = window.open('about:blank', 'salesforce-oauth', `width=${width},height=${height},left=${left},top=${top},popup=1`);

    try {
      const { data, error } = await supabase.functions.invoke('salesforce-oauth-start', {
        body: {
          propertyId,
          clientId: pendingClientId.trim() || undefined,
          clientSecret: pendingClientSecret.trim() || undefined,
          loginUrl: pendingLoginUrl.trim() || undefined,
        },
      });

      if (error || !data?.url) {
        popup?.close();
        console.error('Error initiating OAuth:', error, data);
        let errMsg = data?.error;
        if (!errMsg && error) {
          try { errMsg = (error as any).context?.body?.error || (error as any).message; } catch {}
        }
        toast.error(errMsg || 'Failed to start Salesforce connection');
        setConnecting(false);
        return;
      }

      if (!popup || popup.closed) {
        toast.error('Popup was blocked. Please allow popups for this site and try again.');
        setConnecting(false);
        return;
      }

      popup.location.href = data.url;

      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === 'salesforce-oauth-success') {
          toast.success('Successfully connected to Salesforce!');
          setConnecting(false);
          // Optimistically show connected state so UI updates even if admin JWT can't re-read via RLS
          setConfig(prev => ({
            ...(prev ?? {
              id: '',
              enabled: true,
              auto_export_on_escalation: false,
              auto_export_on_conversation_end: false,
              auto_export_on_insurance_detected: false,
              auto_export_on_phone_detected: false,
              include_insurance_card_attachment: false,
              insurance_card_lead_status: '',
              no_insurance_card_lead_status: '',
              field_mappings: {},
              client_id: pendingClientId,
              client_secret: pendingClientSecret,
              login_url: pendingLoginUrl,
            }),
            salesforce_org_id: 'connected',
            instance_url: pendingLoginUrl || 'connected',
          }));
          fetchSettings();
          window.removeEventListener('message', handleMessage);
        } else if (event.data?.type === 'salesforce-oauth-error') {
          toast.error(`Salesforce connection failed: ${event.data.error || 'Unknown error'}`);
          setConnecting(false);
          window.removeEventListener('message', handleMessage);
        }
      };
      window.addEventListener('message', handleMessage);

      const checkPopup = setInterval(() => {
        if (!popup || popup.closed) {
          clearInterval(checkPopup);
          setTimeout(() => {
            window.removeEventListener('message', handleMessage);
            setConnecting(false);
            fetchSettings();
          }, 500);
        }
      }, 500);
    } catch (error) {
      popup?.close();
      console.error('Error initiating OAuth:', error);
      toast.error('Failed to start OAuth flow');
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!config?.id) return;

    // Unlink from the shared org and disable — does not delete the org itself
    // (other properties using the same Salesforce org are unaffected)
    const { error } = await supabase
      .from('salesforce_settings')
      .update({
        salesforce_org_id: null,
        access_token: null,
        refresh_token: null,
        instance_url: null,
        token_expires_at: null,
        enabled: false,
      })
      .eq('id', config.id);

    if (error) {
      toast.error('Failed to disconnect Salesforce');
      return;
    }

    toast.success('Salesforce disconnected');
    fetchSettings();
  };

  const addMapping = () => {
    const usedFields = new Set(fieldMappings.map(m => m.salesforceField));
    const availableField = salesforceFields.find(f => !usedFields.has(f.name));
    if (availableField) {
      setFieldMappings([...fieldMappings, { salesforceField: availableField.name, visitorField: '' }]);
    } else {
      setFieldMappings([...fieldMappings, { salesforceField: '', visitorField: '' }]);
    }
  };

  const removeMapping = (index: number) => {
    setFieldMappings(fieldMappings.filter((_, i) => i !== index));
  };

  const updateMapping = (index: number, field: 'salesforceField' | 'visitorField', value: string) => {
    const updated = [...fieldMappings];
    updated[index] = { ...updated[index], [field]: value };
    setFieldMappings(updated);
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
      {/* Connection Status */}
      <Card data-tour="salesforce-connection">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Salesforce Connection</CardTitle>
              <CardDescription>
                Connect your Salesforce account to export leads
              </CardDescription>
            </div>
            <Badge variant={config?.salesforce_org_id || config?.instance_url ? (sessionExpired ? 'destructive' : 'default') : 'secondary'}>
              {config?.salesforce_org_id || config?.instance_url ? (sessionExpired ? 'Token Expired' : 'Connected') : 'Not Connected'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {config?.salesforce_org_id || config?.instance_url ? (
            <div className="space-y-3">
              {sessionExpired && (
                <div className="flex flex-col gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">Salesforce session expired</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Your Salesforce OAuth session has expired or been revoked. Please reconnect to continue exporting leads.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="url"
                      className="flex-1 h-8 rounded-md border border-input bg-background px-3 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="https://login.salesforce.com"
                      value={pendingLoginUrl}
                      onChange={(e) => setPendingLoginUrl(e.target.value)}
                    />
                    <Button size="sm" onClick={handleConnect} disabled={connecting}>
                      {connecting ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Link2 className="mr-2 h-3 w-3" />}
                      Reconnect
                    </Button>
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">Connected to Salesforce</p>
                  <p className="text-sm text-muted-foreground">{config.instance_url}</p>
                </div>
                <Button variant="outline" size="sm" className="text-destructive" onClick={handleDisconnect}>
                  <Unlink className="mr-2 h-4 w-4" />
                  Disconnect
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 border rounded-lg bg-muted/50 p-6">
              <div className="flex items-center gap-3">
                <img src={salesforceLogo} alt="Salesforce" className="h-8 w-8" />
                <div>
                  <p className="font-medium text-sm">Connect your Salesforce org</p>
                  <p className="text-xs text-muted-foreground">Enter your Connected App credentials from Salesforce Setup</p>
                </div>
              </div>
              <div className="grid gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium">Consumer Key (Client ID) <span className="text-destructive">*</span></label>
                  <input
                    type="text"
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="3MVG9..."
                    value={pendingClientId}
                    onChange={(e) => setPendingClientId(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Consumer Secret <span className="text-destructive">*</span></label>
                  <input
                    type="password"
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="••••••••••••••••"
                    value={pendingClientSecret}
                    onChange={(e) => setPendingClientSecret(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Login URL</label>
                  <input
                    type="url"
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="https://login.salesforce.com"
                    value={pendingLoginUrl}
                    onChange={(e) => setPendingLoginUrl(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Leave blank for production. Use <code>https://test.salesforce.com</code> for sandboxes, or your MyDomain URL.</p>
                </div>
              </div>
              <Button disabled={connecting || !pendingClientId.trim() || !pendingClientSecret.trim()} onClick={handleConnect}>
                {connecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Link2 className="mr-2 h-4 w-4" />}
                {connecting ? 'Connecting...' : 'Connect to Salesforce'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Auto Export Settings */}
      <Card data-tour="salesforce-auto-export">
        <CardHeader>
          <CardTitle>Auto Export</CardTitle>
          <CardDescription>
            Automatically export leads to Salesforce when certain events occur
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Export on Escalation</Label>
              <p className="text-sm text-muted-foreground">
                Automatically create a lead when a conversation is escalated to a human
              </p>
            </div>
            <Switch
              checked={config?.auto_export_on_escalation ?? false}
              onCheckedChange={(checked) => setConfig(prev => prev ? { ...prev, auto_export_on_escalation: checked } : null)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Export on Conversation End</Label>
              <p className="text-sm text-muted-foreground">
                Automatically create a lead when a conversation is closed
              </p>
            </div>
            <Switch
              checked={config?.auto_export_on_conversation_end ?? false}
              onCheckedChange={(checked) => setConfig(prev => prev ? { ...prev, auto_export_on_conversation_end: checked } : null)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Export on Insurance Detected</Label>
              <p className="text-sm text-muted-foreground">
                Automatically create a lead when insurance details are extracted from the conversation
              </p>
            </div>
            <Switch
              checked={config?.auto_export_on_insurance_detected ?? false}
              onCheckedChange={(checked) => setConfig(prev => prev ? { ...prev, auto_export_on_insurance_detected: checked } : null)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Export on Phone Number Detected</Label>
              <p className="text-sm text-muted-foreground">
                Automatically create a lead when a phone number is captured from the conversation
              </p>
            </div>
            <Switch
              checked={config?.auto_export_on_phone_detected ?? false}
              onCheckedChange={(checked) => setConfig(prev => prev ? { ...prev, auto_export_on_phone_detected: checked } : null)}
            />
          </div>

          <div className="border-t pt-6 space-y-6">
            <div>
              <Label className="text-base font-medium">Insurance Card Options</Label>
              <p className="text-sm text-muted-foreground mt-0.5">
                Configure how insurance card uploads are handled when exporting leads
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Include Insurance Card URL with Lead</Label>
                <p className="text-sm text-muted-foreground">
                  Attach the insurance card photo URL to the lead when the visitor has uploaded one
                </p>
              </div>
              <Switch
                checked={config?.include_insurance_card_attachment ?? false}
                onCheckedChange={(checked) => setConfig(prev => prev ? { ...prev, include_insurance_card_attachment: checked } : null)}
              />
            </div>

            <div className="space-y-2">
              <Label>Lead Status When Insurance Card Present</Label>
              <p className="text-sm text-muted-foreground">
                Set a specific lead status when the visitor has submitted an insurance card
              </p>
              <Select
                value={config?.insurance_card_lead_status || '_none'}
                onValueChange={(value) => setConfig(prev => prev ? { ...prev, insurance_card_lead_status: value === '_none' ? '' : value } : null)}
              >
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="No status override" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">No status override</SelectItem>
                  {leadStatusValues.length > 0 ? (
                    leadStatusValues.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}{status.isDefault ? ' (default)' : ''}
                      </SelectItem>
                    ))
                  ) : (
                    <>
                      <SelectItem value="New">New</SelectItem>
                      <SelectItem value="Open - Not Contacted">Open - Not Contacted</SelectItem>
                      <SelectItem value="Working - Contacted">Working - Contacted</SelectItem>
                      <SelectItem value="Closed - Converted">Closed - Converted</SelectItem>
                      <SelectItem value="Closed - Not Converted">Closed - Not Converted</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Lead Status When Insurance Card Not Submitted</Label>
              <p className="text-sm text-muted-foreground">
                Set a specific lead status when the visitor has not submitted an insurance card
              </p>
              <Select
                value={config?.no_insurance_card_lead_status || '_none'}
                onValueChange={(value) => setConfig(prev => prev ? { ...prev, no_insurance_card_lead_status: value === '_none' ? '' : value } : null)}
              >
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="No status override" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">No status override</SelectItem>
                  {leadStatusValues.length > 0 ? (
                    leadStatusValues.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}{status.isDefault ? ' (default)' : ''}
                      </SelectItem>
                    ))
                  ) : (
                    <>
                      <SelectItem value="New">New</SelectItem>
                      <SelectItem value="Open - Not Contacted">Open - Not Contacted</SelectItem>
                      <SelectItem value="Working - Contacted">Working - Contacted</SelectItem>
                      <SelectItem value="Closed - Converted">Closed - Converted</SelectItem>
                      <SelectItem value="Closed - Not Converted">Closed - Not Converted</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Field Mappings */}
      <Card data-tour="salesforce-field-mappings">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Field Mappings</CardTitle>
              <CardDescription>
                Map visitor data to Salesforce Lead fields
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {(config?.salesforce_org_id || config?.instance_url) && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={fetchSalesforceFields}
                  disabled={loadingFields}
                >
                  <RefreshCw className={`h-4 w-4 ${loadingFields ? 'animate-spin' : ''}`} />
                </Button>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={addMapping}
                disabled={!(config?.salesforce_org_id || config?.instance_url) && salesforceFields.length === 0}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Field
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-[1fr,auto,1fr,auto] gap-4 items-center font-medium text-sm text-muted-foreground">
              <span>Salesforce Field</span>
              <span></span>
              <span>Visitor Data</span>
              <span></span>
            </div>
            
            {!config?.salesforce_org_id || config?.instance_url && fieldMappings.length === 0 && (
              <div className="col-span-4 text-center py-8 text-muted-foreground">
                Connect to Salesforce to load Lead fields and configure mappings
              </div>
            )}

            {fieldMappings.map((mapping, index) => (
              <div key={index} className="grid grid-cols-[1fr,auto,1fr,auto] gap-4 items-center">
                <Select
                  value={mapping.salesforceField}
                  onValueChange={(value) => updateMapping(index, 'salesforceField', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Salesforce field" />
                  </SelectTrigger>
                  <SelectContent>
                    {salesforceFields.length > 0 ? (
                      salesforceFields.map((field) => (
                        <SelectItem key={field.name} value={field.name}>
                          {field.label} {field.required && <span className="text-destructive">*</span>}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value={mapping.salesforceField || 'loading'} disabled>
                        {loadingFields ? 'Loading fields...' : 'Connect to load fields'}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>

                <span className="text-muted-foreground">→</span>

                <Select
                  value={mapping.visitorField}
                  onValueChange={(value) => updateMapping(index, 'visitorField', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select data" />
                  </SelectTrigger>
                  <SelectContent>
                    {VISITOR_FIELDS.map((field) => (
                      <SelectItem key={field.value} value={field.value}>
                        {field.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeMapping(index)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}

            {fieldMappings.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No field mappings configured. Click "Add Field" to create one.
              </p>
            )}
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
          Save Salesforce Settings
        </Button>
      </div>
    </div>
  );
};
