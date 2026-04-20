import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { UserPlus, Mail, Loader2, Trash2, Users } from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  email: string;
  status: string;
  invitation_status: string;
  user_id: string;
  assigned_properties: string[];
}

interface Property {
  id: string;
  name: string;
  domain: string;
}

interface TeamManagementProps {
  properties: Property[];
}

export function TeamManagement({ properties }: TeamManagementProps) {
  const { user } = useAuth();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<string[]>([]);
  const [isInviting, setIsInviting] = useState(false);

  useEffect(() => {
    fetchAgents();
  }, [user]);

  const fetchAgents = async () => {
    if (!user) return;

    setLoading(true);
    
    // Fetch agents invited by this user
    const { data: agentsData, error: agentsError } = await supabase
      .from('agents')
      .select('*')
      .eq('invited_by', user.id);

    if (agentsError) {
      console.error('Error fetching agents:', agentsError);
      setLoading(false);
      return;
    }

    // Fetch property assignments for each agent
    const agentIds = agentsData?.map(a => a.id) || [];
    const { data: assignmentsData } = await supabase
      .from('property_agents')
      .select('agent_id, property_id')
      .in('agent_id', agentIds.length > 0 ? agentIds : ['none']);

    const agentsWithAssignments: Agent[] = (agentsData || []).map(agent => {
      const assignments = assignmentsData?.filter(a => a.agent_id === agent.id) || [];
      return {
        id: agent.id,
        name: agent.name,
        email: agent.email,
        status: agent.status,
        invitation_status: agent.invitation_status || 'accepted',
        user_id: agent.user_id,
        assigned_properties: assignments.map(a => a.property_id),
      };
    });

    setAgents(agentsWithAssignments);
    setLoading(false);
  };

  const handleInviteAgent = async () => {
    if (!inviteEmail.trim() || !inviteName.trim() || !user) return;

    setIsInviting(true);

    try {
      // Check if user already exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('email', inviteEmail.trim())
        .maybeSingle();

      let agentUserId = existingProfile?.user_id;

      // Create agent record
      const { data: newAgent, error: agentError } = await supabase
        .from('agents')
        .insert({
          name: inviteName.trim(),
          email: inviteEmail.trim(),
          user_id: agentUserId || user.id, // Temporary if user doesn't exist
          invited_by: user.id,
          invitation_status: existingProfile ? 'accepted' : 'pending',
          status: 'offline',
        })
        .select()
        .single();

      if (agentError) {
        toast.error('Failed to invite agent: ' + agentError.message);
        setIsInviting(false);
        return;
      }

      // Assign to selected properties
      if (selectedPropertyIds.length > 0 && newAgent) {
        const assignments = selectedPropertyIds.map(propertyId => ({
          agent_id: newAgent.id,
          property_id: propertyId,
        }));

        await supabase.from('property_agents').insert(assignments);
      }

      // If user exists, update their role to agent
      if (existingProfile) {
        await supabase
          .from('user_roles')
          .update({ role: 'agent' })
          .eq('user_id', existingProfile.user_id);
      }

      toast.success(existingProfile 
        ? 'Agent added successfully' 
        : 'Agent invited! They will receive an email to join.'
      );

      setIsInviteDialogOpen(false);
      setInviteEmail('');
      setInviteName('');
      setSelectedPropertyIds([]);
      fetchAgents();
    } catch (error) {
      console.error('Error inviting agent:', error);
      toast.error('Failed to invite agent');
    }

    setIsInviting(false);
  };

  const handleRemoveAgent = async (agentId: string) => {
    const { error } = await supabase
      .from('agents')
      .delete()
      .eq('id', agentId);

    if (error) {
      toast.error('Failed to remove agent');
      return;
    }

    toast.success('Agent removed');
    fetchAgents();
  };

  const handleUpdateAssignments = async (agentId: string, propertyIds: string[]) => {
    // Remove all existing assignments
    await supabase
      .from('property_agents')
      .delete()
      .eq('agent_id', agentId);

    // Add new assignments
    if (propertyIds.length > 0) {
      const assignments = propertyIds.map(propertyId => ({
        agent_id: agentId,
        property_id: propertyId,
      }));
      await supabase.from('property_agents').insert(assignments);
    }

    toast.success('Property assignments updated');
    fetchAgents();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      default: return 'bg-gray-400';
    }
  };

  const getInvitationBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="outline" className="text-yellow-600">Pending</Badge>;
      case 'accepted': return <Badge variant="outline" className="text-green-600">Active</Badge>;
      case 'revoked': return <Badge variant="outline" className="text-red-600">Revoked</Badge>;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Team Members
              </CardTitle>
              <CardDescription>
                Manage agents who can respond to conversations on your properties
              </CardDescription>
            </div>
            <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Invite Agent
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite Agent</DialogTitle>
                  <DialogDescription>
                    Add a team member who can respond to chat conversations
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="agent-name">Name</Label>
                    <Input
                      id="agent-name"
                      placeholder="John Smith"
                      value={inviteName}
                      onChange={(e) => setInviteName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="agent-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="agent-email"
                        type="email"
                        placeholder="agent@company.com"
                        className="pl-10"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Assign to Properties</Label>
                    <div className="space-y-2 max-h-40 overflow-auto">
                      {properties.map((prop) => (
                        <label key={prop.id} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedPropertyIds.includes(prop.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedPropertyIds([...selectedPropertyIds, prop.id]);
                              } else {
                                setSelectedPropertyIds(selectedPropertyIds.filter(id => id !== prop.id));
                              }
                            }}
                            className="rounded border-input"
                          />
                          <span className="text-sm">{prop.name}</span>
                          <span className="text-xs text-muted-foreground">({prop.domain})</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleInviteAgent} disabled={isInviting || !inviteEmail.trim() || !inviteName.trim()}>
                    {isInviting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Send Invitation
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              Loading team members...
            </div>
          ) : agents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No team members yet</p>
              <p className="text-sm">Invite agents to help you respond to conversations</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned Properties</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agents.map((agent) => (
                  <TableRow key={agent.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-xs font-medium text-primary">
                              {agent.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background ${getStatusColor(agent.status)}`} />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{agent.name}</p>
                          <p className="text-xs text-muted-foreground">{agent.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getInvitationBadge(agent.invitation_status)}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={agent.assigned_properties.join(',')}
                        onValueChange={(value) => {
                          const propertyIds = value ? value.split(',').filter(Boolean) : [];
                          handleUpdateAssignments(agent.id, propertyIds);
                        }}
                      >
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="Select properties">
                            {agent.assigned_properties.length === 0 
                              ? 'No properties' 
                              : `${agent.assigned_properties.length} propert${agent.assigned_properties.length === 1 ? 'y' : 'ies'}`
                            }
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {properties.map((prop) => (
                            <SelectItem key={prop.id} value={prop.id}>
                              {prop.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveAgent(agent.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}