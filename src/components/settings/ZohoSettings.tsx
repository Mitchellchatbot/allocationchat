import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Link2, Unlink, ExternalLink } from 'lucide-react';

interface ZohoSettingsProps {
  propertyId: string;
}

interface ZohoConnection {
  id: string;
  api_domain: string;
  data_center: string;
  connected_at: string;
  default_owner_id?: string | null;
}

// Zoho user ids provided by Mitch. Update this list when the team changes —
// fetching it via the Zoho Users API would need an extra OAuth scope and a
// reconnect, which isn't worth it for a list that changes rarely.
const ZOHO_LEAD_OWNERS: Array<{ name: string; id: string }> = [
  { name: 'Abraham', id: '5099121000004859001' },
  { name: 'Ammar', id: '5099121000035203164' },
  { name: 'Asser', id: '5099121000075391392' },
  { name: 'Blessing', id: '5099121000039025001' },
  { name: 'Hazem', id: '5099121000049518010' },
  { name: 'Ishak', id: '5099121000098373008' },
  { name: 'Islam', id: '5099121000039847145' },
  { name: 'Mohammad Othman', id: '5099121000033205049' },
  { name: 'Plinky Baay', id: '5099121000024401004' },
  { name: 'Rodaina Thabit', id: '5099121000050947001' },
  { name: 'Schalck Kleynhans', id: '5099121000096318008' },
  { name: 'Sohaila Mohamed', id: '5099121000090546008' },
  { name: 'Sumia Osman', id: '5099121000035754021' },
  { name: 'Tim Magna', id: '5099121000047652086' },
];
const ZOHO_OWNER_DEFAULT = '__zoho_default__';

interface ExportedLead {
  visitor_id: string;
  zoho_lead_id: string;
  exported_at: string;
  name: string | null;
  email: string | null;
  specialty: string | null;
  country_of_training: string | null;
}

export const ZohoSettings = ({ propertyId }: ZohoSettingsProps) => {
  const [connection, setConnection] = useState<ZohoConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [dataCenter, setDataCenter] = useState('com');
  const [autoExportOnPhone, setAutoExportOnPhone] = useState(true);
  const [recentLeads, setRecentLeads] = useState<ExportedLead[]>([]);
  const [savingOwner, setSavingOwner] = useState(false);

  useEffect(() => {
    fetchConnection();
    fetchRecentExports();
  }, [propertyId]);

  const handleOwnerChange = async (value: string) => {
    if (!connection) return;
    const newOwnerId = value === ZOHO_OWNER_DEFAULT ? null : value;
    setSavingOwner(true);
    const { error } = await supabase
      .from('zoho_connections' as any)
      .update({ default_owner_id: newOwnerId })
      .eq('property_id', propertyId);
    setSavingOwner(false);
    if (error) {
      toast.error('Failed to update lead owner');
      return;
    }
    setConnection({ ...connection, default_owner_id: newOwnerId });
    const label = newOwnerId
      ? ZOHO_LEAD_OWNERS.find(o => o.id === newOwnerId)?.name || 'selected user'
      : 'the Zoho-connected account';
    toast.success(`New leads will be assigned to ${label}`);
  };

  const fetchRecentExports = async () => {
    // Pull the last 20 exported leads scoped to this property. Inner-joined
    // through visitors so we get the doctor's name/email/specialty alongside
    // the Zoho lead id we use to build the deep-link.
    const { data } = await supabase
      .from('zoho_exports' as any)
      .select('visitor_id, zoho_lead_id, exported_at, visitors!inner(name, email, specialty, country_of_training, property_id)')
      .eq('visitors.property_id', propertyId)
      .order('exported_at', { ascending: false })
      .limit(20);
    const rows = (data as Array<Record<string, unknown>> | null) || [];
    setRecentLeads(rows.map(r => {
      const v = (r.visitors as Record<string, unknown>) || {};
      return {
        visitor_id: r.visitor_id as string,
        zoho_lead_id: r.zoho_lead_id as string,
        exported_at: r.exported_at as string,
        name: (v.name as string) || null,
        email: (v.email as string) || null,
        specialty: (v.specialty as string) || null,
        country_of_training: (v.country_of_training as string) || null,
      };
    }));
  };

  // Zoho's CRM UI URL by data center. Works without org_id — Zoho redirects
  // to the logged-in user's org context automatically.
  const zohoLeadUrl = (leadId: string) => {
    const dc = connection?.data_center || 'com';
    return `https://crm.zoho.${dc}/crm/tab/Leads/${leadId}`;
  };

  const fetchConnection = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('zoho_connections' as any)
      .select('id, api_domain, data_center, connected_at, default_owner_id')
      .eq('property_id', propertyId)
      .maybeSingle();
    setConnection((data as ZohoConnection) || null);
    setLoading(false);
  };

  const handleConnect = async () => {
    setConnecting(true);

    const width = 600, height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    const popup = window.open('about:blank', 'zoho-oauth', `width=${width},height=${height},left=${left},top=${top},popup=1`);

    try {
      const { data, error } = await supabase.functions.invoke('zoho-oauth-start', {
        body: { propertyId, dataCenter },
      });

      if (error || !data?.url) {
        popup?.close();
        toast.error(data?.error || 'Failed to start Zoho connection');
        setConnecting(false);
        return;
      }

      if (!popup || popup.closed) {
        toast.error('Popup was blocked. Please allow popups and try again.');
        setConnecting(false);
        return;
      }

      popup.location.href = data.url;

      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === 'zoho-oauth-success') {
          toast.success('Successfully connected to Zoho CRM!');
          setConnecting(false);
          fetchConnection();
          window.removeEventListener('message', handleMessage);
        } else if (event.data?.type === 'zoho-oauth-error') {
          toast.error(`Zoho connection failed: ${event.data.error || 'Unknown error'}`);
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
            fetchConnection();
          }, 500);
        }
      }, 500);
    } catch (err) {
      popup?.close();
      toast.error('Failed to start OAuth flow');
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!connection) return;
    const { error } = await supabase
      .from('zoho_connections' as any)
      .delete()
      .eq('property_id', propertyId);

    if (error) {
      toast.error('Failed to disconnect Zoho');
      return;
    }
    toast.success('Zoho CRM disconnected');
    setConnection(null);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Zoho CRM Connection</CardTitle>
              <CardDescription>Connect Zoho CRM to automatically export qualified doctor leads</CardDescription>
            </div>
            <Badge variant={connection ? 'default' : 'secondary'}>
              {connection ? 'Connected' : 'Not Connected'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {connection ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">Connected to Zoho CRM</p>
                  <p className="text-sm text-muted-foreground">{connection.api_domain}</p>
                  <p className="text-xs text-muted-foreground">
                    Connected {new Date(connection.connected_at).toLocaleDateString()}
                  </p>
                </div>
                <Button variant="outline" size="sm" className="text-destructive" onClick={handleDisconnect}>
                  <Unlink className="mr-2 h-4 w-4" />
                  Disconnect
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 border rounded-lg bg-muted/50 p-6">
              <div>
                <p className="font-medium text-sm">Connect your Zoho CRM account</p>
                <p className="text-xs text-muted-foreground mt-1">
                  You'll need a Zoho CRM account with a Server-based OAuth app. Set the redirect URI to your Supabase function URL.
                </p>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Data Center</label>
                <Select value={dataCenter} onValueChange={setDataCenter}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="com">US (zoho.com)</SelectItem>
                    <SelectItem value="eu">EU (zoho.eu)</SelectItem>
                    <SelectItem value="in">India (zoho.in)</SelectItem>
                    <SelectItem value="com.au">Australia (zoho.com.au)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Select the region your Zoho account is registered in.</p>
              </div>
              <Button disabled={connecting} onClick={handleConnect}>
                {connecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Link2 className="mr-2 h-4 w-4" />}
                {connecting ? 'Connecting...' : 'Connect to Zoho CRM'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Auto Export</CardTitle>
          <CardDescription>Automatically export qualified leads to Zoho when key info is captured</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Export on Phone Number Captured</Label>
              <p className="text-sm text-muted-foreground">
                Send to Zoho automatically once a phone number is collected (only qualified leads are exported)
              </p>
            </div>
            <Switch checked={autoExportOnPhone} onCheckedChange={setAutoExportOnPhone} />
          </div>

          {connection && (
            <div className="mt-6">
              <Label htmlFor="zoho-owner-select">Default lead owner</Label>
              <p className="text-xs text-muted-foreground mt-1 mb-2">
                Every new lead the chatbot pushes to Zoho will be assigned to this user.
              </p>
              <Select
                value={connection.default_owner_id || ZOHO_OWNER_DEFAULT}
                onValueChange={handleOwnerChange}
                disabled={savingOwner}
              >
                <SelectTrigger id="zoho-owner-select" className="w-full sm:w-72">
                  <SelectValue placeholder="Select a lead owner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ZOHO_OWNER_DEFAULT}>(Zoho default — connected account)</SelectItem>
                  {ZOHO_LEAD_OWNERS.map(owner => (
                    <SelectItem key={owner.id} value={owner.id}>{owner.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <p className="text-sm font-medium">Qualification criteria</p>
            <ul className="text-sm text-muted-foreground mt-2 space-y-1 list-disc list-inside">
              <li>Country of training: Europe, UK, USA, Canada, South Africa, Australia, New Zealand, or South America</li>
              <li>Age: 30–60 years</li>
            </ul>
            <p className="text-xs text-muted-foreground mt-2">Unqualified leads are stored locally but never exported to Zoho.</p>
          </div>
        </CardContent>
      </Card>

      {connection && (
        <Card>
          <CardHeader>
            <CardTitle>Recently Exported Leads</CardTitle>
            <CardDescription>The last 20 leads pushed to Zoho from this property. Click "View in Zoho" to open the lead.</CardDescription>
          </CardHeader>
          <CardContent>
            {recentLeads.length === 0 ? (
              <p className="text-sm text-muted-foreground">No leads exported yet.</p>
            ) : (
              <div className="divide-y">
                {recentLeads.map(lead => (
                  <div key={lead.visitor_id} className="flex items-center justify-between py-3 gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{lead.name || 'Unknown name'}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {[lead.specialty, lead.country_of_training, lead.email].filter(Boolean).join(' • ') || '—'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Exported {new Date(lead.exported_at).toLocaleString()}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="shrink-0"
                    >
                      <a href={zohoLeadUrl(lead.zoho_lead_id)} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View in Zoho
                      </a>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
