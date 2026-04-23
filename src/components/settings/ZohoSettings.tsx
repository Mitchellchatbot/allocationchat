import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Link2, Unlink } from 'lucide-react';

interface ZohoSettingsProps {
  propertyId: string;
}

interface ZohoConnection {
  id: string;
  api_domain: string;
  data_center: string;
  connected_at: string;
}

export const ZohoSettings = ({ propertyId }: ZohoSettingsProps) => {
  const [connection, setConnection] = useState<ZohoConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [dataCenter, setDataCenter] = useState('com');
  const [autoExportOnPhone, setAutoExportOnPhone] = useState(true);

  useEffect(() => {
    fetchConnection();
  }, [propertyId]);

  const fetchConnection = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('zoho_connections' as any)
      .select('id, api_domain, data_center, connected_at')
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
    </div>
  );
};
