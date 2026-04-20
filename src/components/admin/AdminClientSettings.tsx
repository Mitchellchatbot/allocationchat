import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mail, MessageCircle, Building2, ClipboardList, Settings } from 'lucide-react';
import { EmailSettings } from '@/components/settings/EmailSettings';
import { SlackSettings } from '@/components/settings/SlackSettings';
import { SalesforceSettings } from '@/components/settings/SalesforceSettings';
import { BusinessInfoSettings } from '@/components/settings/BusinessInfoSettings';
import { NotificationLog } from '@/components/settings/NotificationLog';

interface Client {
  user_id: string;
  email: string;
  full_name: string | null;
  company_name: string | null;
}

interface Property {
  id: string;
  name: string | null;
  domain: string | null;
}

export function AdminClientSettings() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [loadingClients, setLoadingClients] = useState(true);
  const [loadingProperties, setLoadingProperties] = useState(false);

  useEffect(() => {
    const fetchClients = async () => {
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'client');

      const userIds = (roles || []).map((r: any) => r.user_id);
      if (userIds.length === 0) { setClients([]); setLoadingClients(false); return; }

      const { data } = await supabase
        .from('profiles')
        .select('user_id, email, full_name, company_name')
        .in('user_id', userIds)
        .order('email');
      setClients(data || []);
      setLoadingClients(false);
    };
    fetchClients();
  }, []);

  useEffect(() => {
    if (!selectedUserId) { setProperties([]); setSelectedPropertyId(''); return; }
    setLoadingProperties(true);
    const fetchProperties = async () => {
      const { data } = await supabase
        .from('properties')
        .select('id, name, domain')
        .eq('user_id', selectedUserId)
        .order('created_at');
      setProperties(data || []);
      setSelectedPropertyId(data?.[0]?.id || '');
      setLoadingProperties(false);
    };
    fetchProperties();
  }, [selectedUserId]);

  const selectedClient = clients.find(c => c.user_id === selectedUserId);
  const selectedProperty = properties.find(p => p.id === selectedPropertyId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Client Settings</CardTitle>
        <CardDescription>Select a client and property to view and edit their settings</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Client + Property selectors */}
        <div className="flex gap-4 flex-wrap">
          <div className="flex flex-col gap-1.5 min-w-64">
            <label className="text-sm font-medium">Client</label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId} disabled={loadingClients}>
              <SelectTrigger>
                <SelectValue placeholder={loadingClients ? 'Loading...' : 'Select a client'} />
              </SelectTrigger>
              <SelectContent>
                {clients.map(c => (
                  <SelectItem key={c.user_id} value={c.user_id}>
                    {c.company_name || c.full_name || c.email}
                    <span className="text-muted-foreground text-xs ml-2">{c.email}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedUserId && (
            <div className="flex flex-col gap-1.5 min-w-64">
              <label className="text-sm font-medium">Property</label>
              <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId} disabled={loadingProperties}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingProperties ? 'Loading...' : 'Select a property'} />
                </SelectTrigger>
                <SelectContent>
                  {properties.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name || p.domain || p.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Settings tabs */}
        {selectedPropertyId && (
          <div className="border rounded-lg p-4 bg-muted/20">
            <p className="text-sm text-muted-foreground mb-4">
              Editing: <span className="font-medium text-foreground">{selectedClient?.company_name || selectedClient?.email}</span>
              {' · '}
              <span className="font-medium text-foreground">{selectedProperty?.name || selectedProperty?.domain}</span>
            </p>
            <Tabs defaultValue="email">
              <TabsList className="mb-4 flex-wrap h-auto gap-1">
                <TabsTrigger value="email"><Mail className="mr-1.5 h-3.5 w-3.5" />Email</TabsTrigger>
                <TabsTrigger value="slack"><MessageCircle className="mr-1.5 h-3.5 w-3.5" />Slack</TabsTrigger>
                <TabsTrigger value="salesforce"><Settings className="mr-1.5 h-3.5 w-3.5" />Salesforce</TabsTrigger>
                <TabsTrigger value="business"><Building2 className="mr-1.5 h-3.5 w-3.5" />Business Info</TabsTrigger>
                <TabsTrigger value="logs"><ClipboardList className="mr-1.5 h-3.5 w-3.5" />Notification Log</TabsTrigger>
              </TabsList>

              <TabsContent value="email">
                <EmailSettings propertyId={selectedPropertyId} />
              </TabsContent>
              <TabsContent value="slack">
                <SlackSettings propertyId={selectedPropertyId} />
              </TabsContent>
              <TabsContent value="salesforce">
                <SalesforceSettings propertyId={selectedPropertyId} />
              </TabsContent>
              <TabsContent value="business">
                <BusinessInfoSettings propertyId={selectedPropertyId} />
              </TabsContent>
              <TabsContent value="logs">
                <NotificationLog propertyId={selectedPropertyId} />
              </TabsContent>
            </Tabs>
          </div>
        )}

        {selectedUserId && !loadingProperties && properties.length === 0 && (
          <p className="text-sm text-muted-foreground">This client has no properties.</p>
        )}
      </CardContent>
    </Card>
  );
}
