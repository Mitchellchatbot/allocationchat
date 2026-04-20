import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
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
import { Loader2, Save, Plus, Trash2, AlertTriangle, CheckCircle2, XCircle, RefreshCw, LinkIcon, Unplug } from 'lucide-react';

interface Property {
  id: string;
  name: string;
  domain: string;
}

interface SalesforceBulkSettingsProps {
  properties: Property[];
}

interface FieldMapping {
  salesforceField: string;
  visitorField: string;
}

interface SalesforceField {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
}

type SessionHealth = 'healthy' | 'expired' | 'checking' | 'not_connected';

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

export const SalesforceBulkSettings = ({ properties }: SalesforceBulkSettingsProps) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [connectionStatuses, setConnectionStatuses] = useState<Record<string, boolean>>({});
  const [sessionHealthMap, setSessionHealthMap] = useState<Record<string, SessionHealth>>({});
  const [salesforceFields, setSalesforceFields] = useState<SalesforceField[]>([]);
  const [loadingFields, setLoadingFields] = useState(false);
  const [firstHealthyPropertyId, setFirstHealthyPropertyId] = useState<string | null>(null);
  const [reconnectingId, setReconnectingId] = useState<string | null>(null);
  
  // Bulk settings state
  const [autoExportOnEscalation, setAutoExportOnEscalation] = useState(false);
  const [autoExportOnConversationEnd, setAutoExportOnConversationEnd] = useState(false);
  const [autoExportOnInsuranceDetected, setAutoExportOnInsuranceDetected] = useState(false);
  const [autoExportOnPhoneDetected, setAutoExportOnPhoneDetected] = useState(false);
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);

  useEffect(() => {
    fetchAllSettings();
  }, [properties]);

  // Fetch live Salesforce fields from first healthy property
  useEffect(() => {
    if (firstHealthyPropertyId) {
      fetchSalesforceFields(firstHealthyPropertyId);
    }
  }, [firstHealthyPropertyId]);

  const fetchSalesforceFields = async (propertyId: string) => {
    setLoadingFields(true);
    try {
      const { data, error } = await supabase.functions.invoke('salesforce-describe-lead', {
        body: { propertyId },
      });
      if (!error && data?.fields) {
        setSalesforceFields(data.fields);
      } else {
        console.error('Error fetching Salesforce fields for bulk:', error || data?.error);
      }
    } catch (err) {
      console.error('Error:', err);
    }
    setLoadingFields(false);
  };

  const checkSessionHealth = async (
    connectedPropertyIds: string[],
    orgMapping: Record<string, string | null> = {}
  ) => {
    const initialHealth: Record<string, SessionHealth> = {};
    properties.forEach(p => {
      initialHealth[p.id] = connectedPropertyIds.includes(p.id) ? 'checking' : 'not_connected';
    });
    setSessionHealthMap(initialHealth);

    // Deduplicate by org: properties sharing the same salesforce_org_id only need one API call.
    // Key is orgId (or propertyId if no org). Value is the list of propertyIds sharing that org.
    const orgGroups = new Map<string, string[]>();
    for (const propertyId of connectedPropertyIds) {
      const key = orgMapping[propertyId] || propertyId;
      if (!orgGroups.has(key)) orgGroups.set(key, []);
      orgGroups.get(key)!.push(propertyId);
    }

    const expiredPropertyIds: string[] = [];
    let firstHealthy: string | null = null;
    const updatedHealth: Record<string, SessionHealth> = { ...initialHealth };

    // One describe-lead call per unique org
    await Promise.allSettled(
      Array.from(orgGroups.entries()).map(async ([, propIds]) => {
        const representativeId = propIds[0];
        let status: SessionHealth = 'healthy';
        let fields: any[] | undefined;

        try {
          const { data, error } = await supabase.functions.invoke('salesforce-describe-lead', {
            body: { propertyId: representativeId },
          });
          const errorMsg = `${error?.message || ''} ${data?.error || ''}`;
          if (
            errorMsg.includes('Session expired') ||
            errorMsg.includes('INVALID_SESSION_ID') ||
            (error && String(error).includes('non-2xx'))
          ) {
            status = 'expired';
          } else if (error) {
            status = 'expired';
          } else if (data?.fields) {
            fields = data.fields;
          }
        } catch {
          status = 'expired';
        }

        // Apply result to all properties sharing this org
        for (const pid of propIds) {
          updatedHealth[pid] = status;
          if (status === 'expired') {
            expiredPropertyIds.push(pid);
          } else if (status === 'healthy' && !firstHealthy) {
            firstHealthy = pid;
            if (fields) setSalesforceFields(fields);
          }
        }
      })
    );

    setSessionHealthMap(updatedHealth);
    setFirstHealthyPropertyId(firstHealthy);
    if (expiredPropertyIds.length > 0) {
      logExpiredSessionNotifications(expiredPropertyIds);
    }
  };

  const logExpiredSessionNotifications = async (expiredIds: string[]) => {
    // Insert a notification for each expired property
    const notifications = expiredIds.map(propertyId => ({
      property_id: propertyId,
      notification_type: 'salesforce_session_expired',
      channel: 'in_app' as const,
      recipient: 'system',
      recipient_type: 'system' as const,
      status: 'sent' as const,
      visitor_name: properties.find(p => p.id === propertyId)?.name || 'Unknown',
    }));

    // Only log once per session — check if we already logged recently
    for (const notif of notifications) {
      const { data: existing } = await supabase
        .from('notification_logs')
        .select('id')
        .eq('property_id', notif.property_id)
        .eq('notification_type', 'salesforce_session_expired')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .limit(1);

      if (!existing || existing.length === 0) {
        await supabase.from('notification_logs').insert(notif);
      }
    }
  };

  const fetchAllSettings = async () => {
    setLoading(true);
    const propertyIds = properties.map(p => p.id);
    if (propertyIds.length === 0) {
      setLoading(false);
      return;
    }
    
    const { data: rawData, error } = await supabase
      .from('salesforce_settings')
      .select('property_id, salesforce_org_id, instance_url, auto_export_on_escalation, auto_export_on_conversation_end, auto_export_on_insurance_detected, auto_export_on_phone_detected, field_mappings')
      .in('property_id', propertyIds);
    const data = rawData as any[];

    if (error) {
      console.error('Error fetching bulk settings:', error);
      setLoading(false);
      return;
    }

    try {

    // Build connection status map — connected means linked to an org OR has legacy instance_url
    const statuses: Record<string, boolean> = {};
    properties.forEach(p => { statuses[p.id] = false; });
    data?.forEach(s => { statuses[s.property_id] = !!(s.salesforce_org_id || s.instance_url); });
    setConnectionStatuses(statuses);

    const connectedIds = data?.filter(s => s.salesforce_org_id || s.instance_url).map(s => s.property_id) || [];

    // Build orgMapping so checkSessionHealth can deduplicate by org
    const orgMapping: Record<string, string | null> = {};
    data?.forEach(s => { orgMapping[s.property_id] = (s as any).salesforce_org_id || null; });

    // Use first connected property's settings as defaults
    const firstConnected = data?.find(s => s.salesforce_org_id || s.instance_url);
    if (firstConnected) {
      setAutoExportOnEscalation(firstConnected.auto_export_on_escalation);
      setAutoExportOnConversationEnd(firstConnected.auto_export_on_conversation_end);
      setAutoExportOnInsuranceDetected((firstConnected as any).auto_export_on_insurance_detected ?? false);
      setAutoExportOnPhoneDetected((firstConnected as any).auto_export_on_phone_detected ?? false);

      const mappings = Object.entries((firstConnected.field_mappings as Record<string, string>) || {}).map(
        ([salesforceField, visitorField]) => ({ salesforceField, visitorField })
      );
      setFieldMappings(mappings);
    }

      setLoading(false);

      if (connectedIds.length > 0) {
        checkSessionHealth(connectedIds, orgMapping);
      }
    } catch (err) {
      console.error('Error in fetchAllSettings:', err);
      setLoading(false);
    }
  };

  const handleReconnect = async (propertyId: string) => {
    setReconnectingId(propertyId);

    // Open popup synchronously BEFORE any await — browsers block window.open after async gaps
    const width = 600, height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    const popup = window.open('about:blank', 'salesforce-oauth', `width=${width},height=${height},left=${left},top=${top},popup=1`);

    try {
      const { data, error } = await supabase.functions.invoke('salesforce-oauth-start', {
        body: { propertyId },
      });

      if (error || !data?.url) {
        popup?.close();
        toast.error(data?.error || 'Failed to start Salesforce connection');
        setReconnectingId(null);
        return;
      }

      if (!popup || popup.closed) {
        toast.error('Popup was blocked. Please allow popups for this site and try again.');
        setReconnectingId(null);
        return;
      }

      popup.location.href = data.url;

      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === 'salesforce-oauth-success') {
          toast.success('Successfully reconnected to Salesforce!');
          setReconnectingId(null);
          fetchAllSettings();
          window.removeEventListener('message', handleMessage);
        } else if (event.data?.type === 'salesforce-oauth-error') {
          toast.error(`Salesforce connection failed: ${event.data.error || 'Unknown error'}`);
          setReconnectingId(null);
          window.removeEventListener('message', handleMessage);
        }
      };
      window.addEventListener('message', handleMessage);

      const checkPopup = setInterval(() => {
        if (!popup || popup.closed) {
          clearInterval(checkPopup);
          setTimeout(() => {
            window.removeEventListener('message', handleMessage);
            setReconnectingId(null);
            fetchAllSettings();
          }, 500);
        }
      }, 500);
    } catch (err) {
      popup?.close();
      console.error('Error initiating OAuth:', err);
      toast.error('Failed to start OAuth flow');
      setReconnectingId(null);
    }
  };

  const handleBulkSave = async () => {
    setSaving(true);

    const mappingsObject = fieldMappings.reduce((acc, mapping) => {
      if (mapping.salesforceField && mapping.visitorField) {
        acc[mapping.salesforceField] = mapping.visitorField;
      }
      return acc;
    }, {} as Record<string, string>);

    const connectedPropertyIds = Object.entries(connectionStatuses)
      .filter(([_, connected]) => connected)
      .map(([id]) => id);

    if (connectedPropertyIds.length === 0) {
      toast.error('No connected properties to update');
      setSaving(false);
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const propertyId of connectedPropertyIds) {
      const { error } = await supabase
        .from('salesforce_settings')
        .update({
          auto_export_on_escalation: autoExportOnEscalation,
          auto_export_on_conversation_end: autoExportOnConversationEnd,
          auto_export_on_insurance_detected: autoExportOnInsuranceDetected,
          auto_export_on_phone_detected: autoExportOnPhoneDetected,
          field_mappings: mappingsObject,
        })
        .eq('property_id', propertyId);

      if (error) {
        console.error(`Error updating settings for ${propertyId}:`, error);
        errorCount++;
      } else {
        successCount++;
      }
    }

    setSaving(false);

    if (errorCount === 0) {
      toast.success(`Settings updated for ${successCount} propert${successCount === 1 ? 'y' : 'ies'}`);
    } else {
      toast.error(`Updated ${successCount}, failed ${errorCount}`);
    }
  };

  const addMapping = () => {
    setFieldMappings([...fieldMappings, { salesforceField: '', visitorField: '' }]);
  };

  const removeMapping = (index: number) => {
    setFieldMappings(fieldMappings.filter((_, i) => i !== index));
  };

  const updateMapping = (index: number, field: 'salesforceField' | 'visitorField', value: string) => {
    const updated = [...fieldMappings];
    updated[index] = { ...updated[index], [field]: value };
    setFieldMappings(updated);
  };

  const [bulkConnecting, setBulkConnecting] = useState(false);
  const [disconnectingAll, setDisconnectingAll] = useState(false);
  const [reconnectingAll, setReconnectingAll] = useState(false);

  const connectedCount = Object.values(connectionStatuses).filter(Boolean).length;
  const notConnectedCount = Object.values(connectionStatuses).filter(v => !v).length;
  const expiredCount = Object.values(sessionHealthMap).filter(s => s === 'expired').length;
  const totalCount = properties.length;

  const handleBulkConnect = async () => {
    const sourceId = firstHealthyPropertyId;
    if (!sourceId) {
      toast.error('No healthy Salesforce connection found to copy from');
      return;
    }
    setBulkConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke('salesforce-bulk-connect', {
        body: { sourcePropertyId: sourceId },
      });
      if (error) {
        toast.error('Failed to connect all properties');
      } else {
        toast.success(`Connected ${data.updated} additional propert${data.updated === 1 ? 'y' : 'ies'} to Salesforce`);
        fetchAllSettings();
      }
    } catch (err) {
      console.error('Bulk connect error:', err);
      toast.error('Failed to connect all properties');
    }
    setBulkConnecting(false);
  };

  const handleDisconnectAll = async () => {
    if (!window.confirm(`Disconnect all ${connectedCount} properties from Salesforce? Lead exports will stop until you reconnect.`)) return;
    setDisconnectingAll(true);
    const propertyIds = properties.map(p => p.id);
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
      .in('property_id', propertyIds);
    setDisconnectingAll(false);
    if (error) {
      toast.error('Failed to disconnect all properties');
    } else {
      toast.success('All properties disconnected from Salesforce');
      fetchAllSettings();
    }
  };

  const handleReconnectAll = () => {
    // Pick any property to initiate OAuth — after success, bulk-connect propagates to all others
    const sourceId = properties[0]?.id;
    if (!sourceId) return;
    setReconnectingAll(true);

    const width = 600, height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    const popup = window.open('about:blank', 'salesforce-oauth', `width=${width},height=${height},left=${left},top=${top},popup=1`);

    supabase.functions.invoke('salesforce-oauth-start', { body: { propertyId: sourceId } }).then(async ({ data, error }) => {
      if (error || !data?.url) {
        popup?.close();
        toast.error(data?.error || 'Failed to start Salesforce OAuth');
        setReconnectingAll(false);
        return;
      }
      if (!popup || popup.closed) {
        toast.error('Popup was blocked. Please allow popups and try again.');
        setReconnectingAll(false);
        return;
      }
      popup.location.href = data.url;

      const handleMessage = async (event: MessageEvent) => {
        if (event.data?.type === 'salesforce-oauth-success') {
          window.removeEventListener('message', handleMessage);
          // After fresh OAuth, bulk-connect propagates the new token to all other properties
          const { data: bulkData, error: bulkError } = await supabase.functions.invoke('salesforce-bulk-connect', {
            body: { sourcePropertyId: sourceId },
          });
          setReconnectingAll(false);
          if (bulkError) {
            toast.error('Reconnected but failed to propagate to all properties');
          } else {
            toast.success(`Reconnected all ${(bulkData?.updated ?? 0) + 1} properties to Salesforce`);
          }
          fetchAllSettings();
        } else if (event.data?.type === 'salesforce-oauth-error') {
          window.removeEventListener('message', handleMessage);
          toast.error(`Reconnect failed: ${event.data.error || 'Unknown error'}`);
          setReconnectingAll(false);
        }
      };
      window.addEventListener('message', handleMessage);

      const checkPopup = setInterval(() => {
        if (!popup || popup.closed) {
          clearInterval(checkPopup);
          setTimeout(() => {
            window.removeEventListener('message', handleMessage);
            setReconnectingAll(false);
            fetchAllSettings();
          }, 500);
        }
      }, 500);
    });
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
      {/* Connection Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Connection Overview</CardTitle>
          <CardDescription>
            Salesforce connections are managed per property. Below shows which properties are connected.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <Badge variant={connectedCount > 0 ? 'default' : 'secondary'}>
              {connectedCount}/{totalCount} Connected
            </Badge>
            {expiredCount > 0 && (
              <Badge variant="outline" className="border-amber-500/50 text-amber-600 dark:text-amber-400 bg-amber-500/10">
                {expiredCount} Expired
              </Badge>
            )}
          </div>
          <div className="space-y-2">
            {properties.map(property => {
              const health = sessionHealthMap[property.id];
              const isConnected = connectionStatuses[property.id];
              const isExpired = health === 'expired';
              const isChecking = health === 'checking';

              return (
                <div 
                  key={property.id} 
                  className={`flex items-center justify-between py-2 px-3 rounded-md ${
                    isExpired 
                      ? 'bg-amber-500/10 border border-amber-500/30' 
                      : 'bg-muted/50'
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium">{property.name}</p>
                    <p className="text-xs text-muted-foreground">{property.domain}</p>
                  </div>
                  {isChecking ? (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-xs">Checking...</span>
                    </div>
                  ) : isExpired ? (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="text-xs font-medium">Expired</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        disabled={reconnectingId === property.id}
                        onClick={() => handleReconnect(property.id)}
                      >
                        {reconnectingId === property.id ? (
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        ) : (
                          <LinkIcon className="mr-1 h-3 w-3" />
                        )}
                        Reconnect
                      </Button>
                    </div>
                  ) : isConnected ? (
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
                </div>
              );
            })}
          </div>

          {expiredCount > 0 && (
            <div className="flex items-start gap-2 mt-4 p-3 rounded-md bg-amber-500/10 border border-amber-500/30">
              <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-muted-foreground">
                <strong>{expiredCount}</strong> propert{expiredCount === 1 ? 'y has' : 'ies have'} expired Salesforce sessions. 
                Select each property individually and click <strong>Reconnect</strong> to re-authorize.
              </p>
            </div>
          )}

          {/* Bulk Connect Button — show when at least 1 healthy + some not connected */}
          {firstHealthyPropertyId && notConnectedCount > 0 && (
            <div className="mt-4">
              <Button
                onClick={handleBulkConnect}
                disabled={bulkConnecting}
                className="w-full"
              >
                {bulkConnecting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <LinkIcon className="mr-2 h-4 w-4" />
                )}
                Connect All {notConnectedCount} Remaining Propert{notConnectedCount === 1 ? 'y' : 'ies'}
              </Button>
              <p className="text-xs text-muted-foreground mt-1.5 text-center">
                Copies Salesforce credentials from your connected property to all others
              </p>
            </div>
          )}

          {/* Reconnect All — show when multiple expired */}
          {expiredCount > 1 && firstHealthyPropertyId && (
            <div className="mt-3">
              <Button
                variant="outline"
                onClick={handleBulkConnect}
                disabled={bulkConnecting}
                className="w-full"
              >
                {bulkConnecting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Reconnect All from Healthy Connection
              </Button>
            </div>
          )}

          {connectedCount === 0 && (
            <div className="flex items-start gap-2 mt-4 p-3 rounded-md bg-destructive/10 border border-destructive/20">
              <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
              <p className="text-xs text-muted-foreground">
                No properties are connected to Salesforce. Select a specific property to set up a connection first.
              </p>
            </div>
          )}

          {/* Reconnect All + Disconnect All — always visible when there are properties */}
          {properties.length > 0 && (
            <div className="flex gap-2 mt-4">
              <Button
                className="flex-1"
                onClick={handleReconnectAll}
                disabled={reconnectingAll || disconnectingAll}
              >
                {reconnectingAll ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Reconnect All
              </Button>
              {connectedCount > 0 && (
                <Button
                  variant="outline"
                  className="flex-1 border-destructive/50 text-destructive hover:bg-destructive/10"
                  onClick={handleDisconnectAll}
                  disabled={disconnectingAll || reconnectingAll}
                >
                  {disconnectingAll ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Unplug className="mr-2 h-4 w-4" />
                  )}
                  Disconnect All
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {connectedCount > 0 && (
        <>
          {/* Bulk info banner */}
          <div className="flex items-start gap-2 p-3 rounded-md bg-primary/5 border border-primary/20">
            <AlertTriangle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              Changes below will be applied to all <strong>{connectedCount} connected</strong> propert{connectedCount === 1 ? 'y' : 'ies'}. 
              Unconnected properties will not be affected.
            </p>
          </div>

          {/* Auto Export Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Auto Export</CardTitle>
              <CardDescription>
                Bulk update auto-export triggers across all connected properties
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
                <Switch checked={autoExportOnEscalation} onCheckedChange={setAutoExportOnEscalation} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Export on Conversation End</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically create a lead when a conversation is closed
                  </p>
                </div>
                <Switch checked={autoExportOnConversationEnd} onCheckedChange={setAutoExportOnConversationEnd} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Export on Insurance Detected</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically create a lead when insurance details are extracted
                  </p>
                </div>
                <Switch checked={autoExportOnInsuranceDetected} onCheckedChange={setAutoExportOnInsuranceDetected} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Export on Phone Number Detected</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically create a lead when a phone number is captured
                  </p>
                </div>
                <Switch checked={autoExportOnPhoneDetected} onCheckedChange={setAutoExportOnPhoneDetected} />
              </div>
            </CardContent>
          </Card>

          {/* Field Mappings */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Field Mappings</CardTitle>
                  <CardDescription>
                    Bulk update field mappings across all connected properties
                  </CardDescription>
                </div>
              <div className="flex items-center gap-2">
                {firstHealthyPropertyId && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => fetchSalesforceFields(firstHealthyPropertyId)}
                    disabled={loadingFields}
                  >
                    <RefreshCw className={`h-4 w-4 ${loadingFields ? 'animate-spin' : ''}`} />
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={addMapping}>
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
                          <SelectItem value={mapping.salesforceField || '_loading'} disabled>
                            {loadingFields ? 'Loading fields...' : 'No fields available'}
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
            <Button onClick={handleBulkSave} disabled={saving}>
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save to All Connected Properties
            </Button>
          </div>
        </>
      )}
    </div>
  );
};
