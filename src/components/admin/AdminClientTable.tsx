import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { AdminSubscriptionColumn } from './AdminSubscriptionColumn';

export interface ClientOverview {
  user_id: string;
  email: string;
  full_name: string | null;
  company_name: string | null;
  created_at: string;
  properties_count: number;
  conversations_count: number;
  agents_count: number;
  phones_count: number;
  leads_count: number;
  complaints_count: number;
  properties: { id: string; name: string; domain: string; conversations_count: number }[];
  agents: { name: string; email: string; status: string }[];
}

interface Props {
  clients: ClientOverview[];
  loading: boolean;
}

export function AdminClientTable({ clients, loading }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailsCache, setDetailsCache] = useState<Record<string, { properties: any[]; agents: any[] }>>({});
  const [loadingDetails, setLoadingDetails] = useState<string | null>(null);

  const handleToggle = async (userId: string) => {
    if (expandedId === userId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(userId);

    if (detailsCache[userId]) return;

    setLoadingDetails(userId);
    const { data, error } = await supabase.rpc('admin_client_details', { client_user_id: userId });
    if (!error && data) {
      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      setDetailsCache(prev => ({ ...prev, [userId]: parsed }));
    }
    setLoadingDetails(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Client Overview</CardTitle>
        <CardDescription>View performance metrics for all clients — click a row to expand details</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading clients...</div>
        ) : clients.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No clients yet</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead />
                <TableHead>Client</TableHead>
                <TableHead>Company</TableHead>
                <TableHead className="text-center">Properties</TableHead>
                <TableHead className="text-center">Agents</TableHead>
                <TableHead className="text-center">Chats</TableHead>
                <TableHead className="text-center">Phones</TableHead>
                <TableHead className="text-center">Leads</TableHead>
                <TableHead className="text-center">Complaints</TableHead>
                <TableHead>Subscription</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => {
                const isOpen = expandedId === client.user_id;
                const details = detailsCache[client.user_id];
                const isLoadingDetail = loadingDetails === client.user_id;
                return (
                  <Collapsible key={client.user_id} open={isOpen} onOpenChange={() => handleToggle(client.user_id)} asChild>
                    <>
                      <CollapsibleTrigger asChild>
                        <TableRow className="cursor-pointer hover:bg-muted/50">
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </Button>
                          </TableCell>
                          <TableCell>
                            <p className="font-medium">{client.full_name || 'N/A'}</p>
                            <p className="text-xs text-muted-foreground">{client.email}</p>
                          </TableCell>
                          <TableCell>{client.company_name || 'N/A'}</TableCell>
                          <TableCell className="text-center"><Badge variant="secondary">{client.properties_count}</Badge></TableCell>
                          <TableCell className="text-center"><Badge variant="outline">{client.agents_count}</Badge></TableCell>
                          <TableCell className="text-center"><Badge variant="default">{client.conversations_count}</Badge></TableCell>
                          <TableCell className="text-center"><Badge variant="secondary">{client.phones_count}</Badge></TableCell>
                          <TableCell className="text-center"><Badge variant="secondary">{client.leads_count}</Badge></TableCell>
                          <TableCell className="text-center">
                            <Badge variant={client.complaints_count > 0 ? 'destructive' : 'outline'}>{client.complaints_count}</Badge>
                          </TableCell>
                          <TableCell>
                            <AdminSubscriptionColumn userId={client.user_id} />
                          </TableCell>
                          <TableCell>{new Date(client.created_at).toLocaleDateString()}</TableCell>
                        </TableRow>
                      </CollapsibleTrigger>
                      <CollapsibleContent asChild>
                        <TableRow>
                          <TableCell colSpan={11} className="bg-muted/30 p-4">
                            {isLoadingDetail ? (
                              <div className="flex items-center justify-center py-4 gap-2 text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Loading details...
                              </div>
                            ) : (
                              <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                  <h4 className="font-semibold mb-2 text-sm">Properties</h4>
                                  {(!details?.properties || details.properties.length === 0) ? (
                                    <p className="text-xs text-muted-foreground">No properties</p>
                                  ) : (
                                    <ul className="space-y-1">
                                      {details.properties.map((p: any) => (
                                        <li key={p.id} className="text-sm flex justify-between">
                                          <span>{p.name} <span className="text-muted-foreground">({p.domain})</span></span>
                                          <Badge variant="outline" className="text-xs">{p.conversations_count} chats</Badge>
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                                <div>
                                  <h4 className="font-semibold mb-2 text-sm">Agents</h4>
                                  {(!details?.agents || details.agents.length === 0) ? (
                                    <p className="text-xs text-muted-foreground">No agents</p>
                                  ) : (
                                    <ul className="space-y-1">
                                      {details.agents.map((a: any, i: number) => (
                                        <li key={i} className="text-sm flex justify-between">
                                          <span>{a.name} <span className="text-muted-foreground">({a.email})</span></span>
                                          <Badge variant={a.status === 'online' ? 'default' : 'outline'} className="text-xs">{a.status}</Badge>
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      </CollapsibleContent>
                    </>
                  </Collapsible>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
