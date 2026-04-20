import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ChevronDown, ChevronRight } from 'lucide-react';

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

interface Props {
  complaints: Complaint[];
  loading: boolean;
  onRefresh: () => void;
}

export function AdminComplaintsTab({ complaints, loading, onRefresh }: Props) {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = statusFilter === 'all' ? complaints : complaints.filter(c => c.status === statusFilter);

  const updateStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase
      .from('agent_complaints')
      .update({ status: newStatus })
      .eq('id', id);

    if (error) {
      toast({ title: 'Error', description: 'Failed to update complaint status', variant: 'destructive' });
      return;
    }
    toast({ title: 'Updated', description: `Complaint marked as ${newStatus}` });
    onRefresh();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Agent Complaints</CardTitle>
            <CardDescription>Review and manage complaints from agents</CardDescription>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading complaints...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No complaints found</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agent</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <>
                  <TableRow
                    key={c.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {expandedId === c.id
                          ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                        <div>
                          <p className="font-medium">{c.agent_name}</p>
                          <p className="text-xs text-muted-foreground">{c.agent_email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{c.property_name || 'N/A'}</TableCell>
                    <TableCell><Badge variant="outline">{c.category}</Badge></TableCell>
                    <TableCell className="max-w-[200px] truncate">{c.subject}</TableCell>
                    <TableCell>
                      <Badge variant={c.status === 'open' ? 'destructive' : 'secondary'}>{c.status}</Badge>
                    </TableCell>
                    <TableCell>{new Date(c.created_at).toLocaleDateString()}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Select value={c.status} onValueChange={(v) => updateStatus(c.id, v)}>
                        <SelectTrigger className="w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="resolved">Resolved</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                  {expandedId === c.id && (
                    <TableRow key={`${c.id}-detail`} className="bg-muted/30">
                      <TableCell colSpan={7} className="py-4 px-6">
                        <p className="text-sm font-medium text-muted-foreground mb-1">Message</p>
                        <p className="text-sm whitespace-pre-wrap">{c.message}</p>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
