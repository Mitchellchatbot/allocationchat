import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Search, MessageSquare, ChevronLeft, ChevronRight, Bot, User } from 'lucide-react';
import { AdminConversationDetail } from './AdminConversationDetail';

interface ConversationRow {
  conversation_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  property_name: string;
  property_domain: string;
  client_email: string;
  client_name: string | null;
  visitor_name: string | null;
  visitor_email: string | null;
  visitor_phone: string | null;
  message_count: number;
  ai_enabled: boolean;
}

const PAGE_SIZE = 25;

export function AdminConversationsTab() {
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [selected, setSelected] = useState<ConversationRow | null>(null);

  const fetchConversations = useCallback(async () => {
    setLoading(true);
    try {
      const rpcParams: Record<string, unknown> = {
        p_limit: PAGE_SIZE,
        p_offset: page * PAGE_SIZE,
      };
      if (statusFilter !== 'all') rpcParams.p_status = statusFilter;
      if (search.trim()) rpcParams.p_search = search.trim();

      const { data, error } = await supabase.rpc('admin_conversations_browse', rpcParams);

      if (error) {
        console.error('AdminConversationsTab fetch error:', error);
        setLoading(false);
        return;
      }

      const rows: ConversationRow[] = (data || []).map((r: any) => ({
        conversation_id: r.conversation_id,
        status: r.status,
        created_at: r.created_at,
        updated_at: r.updated_at,
        property_name: r.property_name || '',
        property_domain: r.property_domain || '',
        client_email: r.client_email || '',
        client_name: r.client_name || null,
        visitor_name: r.visitor_name || null,
        visitor_email: r.visitor_email || null,
        visitor_phone: r.visitor_phone || null,
        message_count: Number(r.message_count) || 0,
        ai_enabled: r.ai_enabled,
      }));

      setHasMore(rows.length === PAGE_SIZE);
      setConversations(rows);
    } catch (e) {
      console.error('AdminConversationsTab error:', e);
    }
    setLoading(false);
  }, [page, statusFilter, search]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const handleSearch = () => {
    setPage(0);
    fetchConversations();
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge className="bg-green-100 text-green-700 border-green-200">Active</Badge>;
      case 'pending': return <Badge className="bg-amber-100 text-amber-700 border-amber-200">Pending</Badge>;
      case 'closed': return <Badge variant="outline" className="text-muted-foreground">Closed</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString();
  };

  // Show detail view
  if (selected) {
    return (
      <Card>
        <CardContent className="pt-6">
          <AdminConversationDetail
            conversation={selected}
            onBack={() => setSelected(null)}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          All Conversations
        </CardTitle>
        <CardDescription>Click any conversation to view the full message thread</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search visitor, property, or client..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleSearch}>Search</Button>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Loading conversations...
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">No conversations found</div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Visitor</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead className="text-center">Messages</TableHead>
                  <TableHead className="text-center">AI</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Last Activity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {conversations.map((c) => (
                  <TableRow
                    key={c.conversation_id}
                    className="cursor-pointer hover:bg-muted/60 transition-colors"
                    onClick={() => setSelected(c)}
                  >
                    <TableCell>{statusBadge(c.status)}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{c.visitor_name || 'Anonymous'}</p>
                        {c.visitor_email && <p className="text-xs text-muted-foreground">{c.visitor_email}</p>}
                        {c.visitor_phone && <p className="text-xs text-primary font-medium">{c.visitor_phone}</p>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium">{c.property_name}</p>
                        <p className="text-xs text-muted-foreground">{c.property_domain}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm">{c.client_name || 'N/A'}</p>
                        <p className="text-xs text-muted-foreground">{c.client_email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{c.message_count}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {c.ai_enabled ? (
                        <Bot className="h-4 w-4 text-primary mx-auto" />
                      ) : (
                        <User className="h-4 w-4 text-muted-foreground mx-auto" />
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{timeAgo(c.created_at)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{timeAgo(c.updated_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-muted-foreground">
                Showing {page * PAGE_SIZE + 1}–{page * PAGE_SIZE + conversations.length}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                </Button>
                <Button variant="outline" size="sm" disabled={!hasMore} onClick={() => setPage(p => p + 1)}>
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
