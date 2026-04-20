import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Shield, ArrowLeft, Building2, Users, AlertTriangle, MessageSquare, Mail } from 'lucide-react';
import { AdminStatsCards } from '@/components/admin/AdminStatsCards';
import { AdminClientTable, ClientOverview } from '@/components/admin/AdminClientTable';
import { AdminComplaintsTab } from '@/components/admin/AdminComplaintsTab';
import { AdminActivityChart } from '@/components/admin/AdminActivityChart';
import { AdminConversationsTab } from '@/components/admin/AdminConversationsTab';
import { AdminClientSettings } from '@/components/admin/AdminClientSettings';

interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  company_name: string | null;
  created_at: string;
  role: 'admin' | 'client' | 'agent';
}

interface Complaint {
  id: string;
  agent_id: string;
  agent_name: string;
  agent_email: string;
  property_name: string | null;
  category: string;
  subject: string;
  message: string;
  status: string;
  created_at: string;
}

interface ClientOption {
  user_id: string;
  email: string;
  full_name: string | null;
  company_name: string | null;
}

export default function AdminDashboard() {
  const { user, isAdmin, loading, signOut } = useAuth();
  const { startImpersonation } = useImpersonation();
  const [clientOptions, setClientOptions] = useState<ClientOption[]>([]);
  const [impersonating, setImpersonating] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [clients, setClients] = useState<ClientOverview[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [platformStats, setPlatformStats] = useState({
    totalClients: 0, totalAgents: 0, totalConversations: 0, totalProperties: 0,
    activeConversations: 0, totalPhones: 0, totalLeads: 0, openComplaints: 0,
  });
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingClients, setLoadingClients] = useState(true);
  const [loadingComplaints, setLoadingComplaints] = useState(true);
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [sendingBulkEmail, setSendingBulkEmail] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
    else if (!loading && !isAdmin) navigate('/dashboard');
  }, [user, isAdmin, loading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
      fetchClientOverview();
      fetchPlatformStats();
      fetchComplaints();
      fetchClientOptions();
    }
  }, [isAdmin]);

  const fetchClientOptions = async () => {
    const { data: clientRoles } = await supabase
      .from('user_roles').select('user_id').eq('role', 'client');
    const userIds = (clientRoles || []).map((r: any) => r.user_id);
    if (!userIds.length) return;
    const { data } = await supabase
      .from('profiles')
      .select('user_id, email, full_name, company_name')
      .in('user_id', userIds)
      .order('email');
    setClientOptions(data || []);
  };

  const handleViewAs = async (userId: string) => {
    setImpersonating(true);
    await startImpersonation(userId, navigate);
    setImpersonating(false);
  };

  const fetchUsers = async () => {
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabase.from('profiles').select('*'),
      supabase.from('user_roles').select('*'),
    ]);

    if (!profiles || !roles) {
      toast({ title: 'Error', description: 'Failed to load users', variant: 'destructive' });
      return;
    }

    setUsers(profiles.map((p) => {
      const r = roles.find((r) => r.user_id === p.user_id);
      return { ...p, role: (r?.role || 'client') as 'admin' | 'client' | 'agent' };
    }));
    setLoadingUsers(false);
  };

  const fetchComplaints = async () => {
    const { data: rawComplaints } = await supabase.from('agent_complaints').select('*');
    if (!rawComplaints) { setLoadingComplaints(false); return; }

    const agentIds = [...new Set(rawComplaints.map(c => c.agent_id))];
    const propertyIds = [...new Set(rawComplaints.filter(c => c.property_id).map(c => c.property_id!))];

    const [{ data: agents }, { data: props }, { data: profiles }] = await Promise.all([
      supabase.from('agents').select('id, name, email').in('id', agentIds.length ? agentIds : ['_']),
      supabase.from('properties').select('id, name').in('id', propertyIds.length ? propertyIds : ['_']),
      // Fallback: look up by user_id in profiles in case agent_id is a user_id
      supabase.from('profiles').select('user_id, full_name, email').in('user_id', agentIds.length ? agentIds : ['_']),
    ]);

    const agentMap = Object.fromEntries((agents || []).map(a => [a.id, a]));
    const profileMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p]));
    const propMap = Object.fromEntries((props || []).map(p => [p.id, p]));

    setComplaints(rawComplaints.map(c => ({
      ...c,
      agent_name: agentMap[c.agent_id]?.name || profileMap[c.agent_id]?.full_name || 'Unknown',
      agent_email: agentMap[c.agent_id]?.email || profileMap[c.agent_id]?.email || '',
      property_name: c.property_id ? propMap[c.property_id]?.name || null : null,
    })));
    setLoadingComplaints(false);
  };

  const fetchClientOverview = async () => {
    // Use server-side aggregation to bypass 1000-row limits
    const { data, error } = await supabase.rpc('admin_client_overview');
    if (error || !data) {
      console.error('Error fetching client overview:', error);
      setClients([]);
      setLoadingClients(false);
      return;
    }

    setClients((data as any[]).map(row => ({
      user_id: row.user_id,
      email: row.email,
      full_name: row.full_name,
      company_name: row.company_name,
      created_at: row.created_at,
      properties_count: Number(row.properties_count),
      conversations_count: Number(row.conversations_count),
      agents_count: Number(row.agents_count),
      phones_count: Number(row.phones_count),
      leads_count: Number(row.leads_count),
      complaints_count: Number(row.complaints_count),
      properties: [],
      agents: [],
    })));
    setLoadingClients(false);
  };

  const fetchPlatformStats = async () => {
    const [
      { count: clientCount }, { count: agentCount }, { count: conversationCount },
      { count: activeCount }, { count: propertyCount },
      { count: phoneCount }, { count: leadCount }, { count: openComplaintsCount },
    ] = await Promise.all([
      supabase.from('user_roles').select('*', { count: 'exact', head: true }).eq('role', 'client'),
      supabase.from('user_roles').select('*', { count: 'exact', head: true }).eq('role', 'agent'),
      supabase.from('conversations').select('*', { count: 'exact', head: true }),
      supabase.from('conversations').select('*', { count: 'exact', head: true }).in('status', ['active', 'pending']),
      supabase.from('properties').select('*', { count: 'exact', head: true }),
      supabase.from('visitors').select('*', { count: 'exact', head: true }).not('phone', 'is', null),
      supabase.from('visitors').select('*', { count: 'exact', head: true }).or('name.not.is.null,email.not.is.null,phone.not.is.null'),
      supabase.from('agent_complaints').select('*', { count: 'exact', head: true }).eq('status', 'open'),
    ]);

    setPlatformStats({
      totalClients: clientCount || 0,
      totalAgents: agentCount || 0,
      totalConversations: conversationCount || 0,
      totalProperties: propertyCount || 0,
      activeConversations: activeCount || 0,
      totalPhones: phoneCount || 0,
      totalLeads: leadCount || 0,
      openComplaints: openComplaintsCount || 0,
    });
  };

  const updateUserRole = async (userId: string, newRole: 'admin' | 'client' | 'agent') => {
    const { error } = await supabase.from('user_roles').update({ role: newRole }).eq('user_id', userId);
    if (error) {
      toast({ title: 'Error', description: 'Failed to update user role', variant: 'destructive' });
      return;
    }
    toast({ title: 'Success', description: 'User role updated successfully' });
    fetchUsers(); fetchClientOverview(); fetchPlatformStats();
  };

  const sendTestUpgradeEmail = async () => {
    const target = testEmailAddress.trim();
    if (!target) {
      toast({ title: 'Enter a test email address first', variant: 'destructive' });
      return;
    }
    setSendingTestEmail(true);
    try {
      const { error } = await supabase.functions.invoke('send-bulk-upgrade-email', {
        body: { testEmail: target },
      });
      if (error) throw error;
      toast({ title: 'Test email sent', description: `Delivered to ${target}` });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSendingTestEmail(false);
    }
  };

  const sendBulkUpgradeEmail = async () => {
    if (!window.confirm('This will send the upgrade announcement email to ALL users. Are you sure?')) return;
    setSendingBulkEmail(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-bulk-upgrade-email', {
        body: {},
      });
      if (error) throw error;
      toast({ title: 'Upgrade emails sent', description: `Sent: ${data.sent} · Errors: ${data.errors}` });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSendingBulkEmail(false);
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'default';
      case 'client': return 'secondary';
      case 'agent': return 'outline';
      default: return 'secondary';
    }
  };

  if (loading || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/dashboard')} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </Button>
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">Admin Dashboard</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {clientOptions.length > 0 && (
              <Select onValueChange={handleViewAs} disabled={impersonating}>
                <SelectTrigger className="w-52 h-9 text-sm">
                  <SelectValue placeholder={impersonating ? 'Loading...' : 'View portal as...'} />
                </SelectTrigger>
                <SelectContent>
                  {clientOptions.map(c => (
                    <SelectItem key={c.user_id} value={c.user_id}>
                      {c.company_name || c.full_name || c.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button variant="outline" onClick={signOut}>Sign Out</Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <AdminStatsCards stats={platformStats} />
        <AdminActivityChart />

        <Tabs defaultValue="clients" className="space-y-6 mt-8">
          <TabsList>
            <TabsTrigger value="clients"><Building2 className="mr-2 h-4 w-4" />Client Overview</TabsTrigger>
            <TabsTrigger value="conversations"><MessageSquare className="mr-2 h-4 w-4" />All Conversations</TabsTrigger>
            <TabsTrigger value="complaints">
              <AlertTriangle className="mr-2 h-4 w-4" />
              Complaints
              {platformStats.openComplaints > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 px-1.5 text-xs">{platformStats.openComplaints}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="users"><Users className="mr-2 h-4 w-4" />User Management</TabsTrigger>
            <TabsTrigger value="client-settings"><Shield className="mr-2 h-4 w-4" />Client Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="clients">
            <AdminClientTable clients={clients} loading={loadingClients} />
          </TabsContent>

          <TabsContent value="conversations">
            <AdminConversationsTab />
          </TabsContent>

          <TabsContent value="complaints">
            <AdminComplaintsTab complaints={complaints} loading={loadingComplaints} onRefresh={() => { fetchComplaints(); fetchPlatformStats(); }} />
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle>User Management</CardTitle>
                    <CardDescription>Manage user accounts and roles</CardDescription>
                  </div>
                  <div className="flex gap-2 shrink-0 items-center">
                    <Input
                      type="email"
                      placeholder="Test email address"
                      value={testEmailAddress}
                      onChange={e => setTestEmailAddress(e.target.value)}
                      className="w-52 h-9 text-sm"
                      disabled={sendingTestEmail || sendingBulkEmail}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      disabled={sendingTestEmail || sendingBulkEmail}
                      onClick={sendTestUpgradeEmail}
                    >
                      <Mail className="h-4 w-4" />
                      {sendingTestEmail ? 'Sending…' : 'Send Test Email'}
                    </Button>
                    <Button
                      size="sm"
                      className="gap-2"
                      disabled={sendingBulkEmail || sendingTestEmail}
                      onClick={sendBulkUpgradeEmail}
                    >
                      <Mail className="h-4 w-4" />
                      {sendingBulkEmail ? 'Sending…' : 'Send to All Users'}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loadingUsers ? (
                  <div className="text-center py-8 text-muted-foreground">Loading users...</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell className="font-medium">{u.full_name || 'N/A'}</TableCell>
                          <TableCell>{u.email}</TableCell>
                          <TableCell>{u.company_name || 'N/A'}</TableCell>
                          <TableCell><Badge variant={getRoleBadgeVariant(u.role)}>{u.role}</Badge></TableCell>
                          <TableCell>{new Date(u.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Select value={u.role} onValueChange={(v: 'admin' | 'client' | 'agent') => updateUserRole(u.user_id, v)} disabled={u.user_id === user?.id}>
                              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="client">Client</SelectItem>
                                <SelectItem value="agent">Agent</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="client-settings">
            <AdminClientSettings />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
