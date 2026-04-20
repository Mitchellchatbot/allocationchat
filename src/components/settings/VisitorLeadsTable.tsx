import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, Upload, Users, RefreshCw, Trash2, Download, Phone } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { formatDistanceToNow } from 'date-fns';

interface VisitorLeadsTableProps {
  propertyId: string;
  allPropertyIds?: string[];
}

interface Visitor {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  gclid: string | null;
  drug_of_choice: string | null;
  treatment_interest: string | null;
  insurance_info: string | null;
  urgency_level: string | null;
  created_at: string;
  exported?: boolean;
}

export const VisitorLeadsTable = ({ propertyId, allPropertyIds }: VisitorLeadsTableProps) => {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [exportedIds, setExportedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [phoneFilter, setPhoneFilter] = useState<'all' | 'with' | 'without'>('all');

  const filteredVisitors = visitors.filter(v => {
    if (phoneFilter === 'with') return !!v.phone;
    if (phoneFilter === 'without') return !v.phone;
    return true;
  });

  useEffect(() => {
    fetchVisitors();
    fetchExportedVisitors();
  }, [propertyId]);

  const fetchVisitors = async () => {
    setLoading(true);
    const isAll = allPropertyIds && allPropertyIds.length > 0;
    // Only fetch visitors who actually chatted (have a conversation)
    let query = supabase.from('conversations').select('visitor_id');
    if (isAll) {
      query = query.in('property_id', allPropertyIds);
    } else {
      query = query.eq('property_id', propertyId);
    }
    const { data: conversations } = await query;

    const visitorIds = [...new Set((conversations || []).map(c => c.visitor_id))];

    if (visitorIds.length === 0) {
      setVisitors([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('visitors')
      .select('*')
      .in('id', visitorIds)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching visitors:', error);
      toast.error('Failed to load visitors');
    } else {
      setVisitors(data || []);
    }
    setLoading(false);
  };

  const fetchExportedVisitors = async () => {
    const isAll = allPropertyIds && allPropertyIds.length > 0;
    let query = supabase.from('conversations').select('id, visitor_id');
    if (isAll) {
      query = query.in('property_id', allPropertyIds);
    } else {
      query = query.eq('property_id', propertyId);
    }
    const { data: conversations } = await query;

    if (conversations && conversations.length > 0) {
      const conversationIds = conversations.map(c => c.id);
      const { data: exports } = await supabase
        .from('salesforce_exports')
        .select('conversation_id')
        .in('conversation_id', conversationIds);

      if (exports) {
        const exportedConvIds = new Set(exports.map(e => e.conversation_id));
        const exportedVisitorIds = new Set(
          conversations
            .filter(c => exportedConvIds.has(c.id))
            .map(c => c.visitor_id)
        );
        setExportedIds(exportedVisitorIds);
      }
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredVisitors.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredVisitors.map(v => v.id)));
    }
  };

  const handleExport = async () => {
    if (selectedIds.size === 0) {
      toast.error('Please select at least one visitor to export');
      return;
    }

    setExporting(true);
    const visitorIdList = Array.from(selectedIds);
    try {
      const isAll = allPropertyIds && allPropertyIds.length > 0;
      const exportPropertyId = isAll ? 'all' : propertyId;

      // Write queue rows for audit trail before calling the function
      // (23505 duplicate key = already in queue, which is fine to ignore)
      const queueRows = visitorIdList.map(vid => ({
        property_id: exportPropertyId === 'all' ? (allPropertyIds?.[0] ?? propertyId) : exportPropertyId,
        visitor_id: vid,
        trigger_type: 'manual',
        status: 'pending',
        next_attempt_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
      supabase.from('salesforce_export_queue').insert(queueRows).then(({ error: qErr }) => {
        if (qErr && (qErr as any).code !== '23505') console.error('Manual export queue insert error:', qErr);
      });

      const { data, error } = await supabase.functions.invoke('salesforce-export-leads', {
        body: { propertyId: exportPropertyId, visitorIds: visitorIdList },
      });

      // Update queue rows to reflect actual result
      const finalStatus = (!error && !data?.error && (data?.exported ?? 0) > 0) ? 'success' : 'failed';
      supabase.from('salesforce_export_queue')
        .update({ status: finalStatus, updated_at: new Date().toISOString(), ...(finalStatus === 'success' ? { exported_at: new Date().toISOString() } : {}) })
        .in('visitor_id', visitorIdList)
        .eq('trigger_type', 'manual')
        .then(() => {});

      if (error) {
        console.error('Export error:', error);
        const errMsg = data?.error || error?.message || '';
        if (errMsg.includes('Failed to fetch') || errMsg.includes('Session expired') || errMsg.includes('INVALID_SESSION_ID')) {
          toast.error('Salesforce session expired. Please reconnect in the Settings tab.');
        } else {
          toast.error('Failed to export leads to Salesforce');
        }
      } else if (data?.error) {
        if (data.error.includes('Session expired') || data.error.includes('not connected')) {
          toast.error('Salesforce session expired. Please reconnect in the Settings tab.');
        } else {
          toast.error(data.error);
        }
      } else if (data?.exported === 0 && data?.errors?.length > 0) {
        toast.error(data.errors[0]);
        fetchVisitors();
      } else {
        const exportedCount = data?.exported || selectedIds.size;
        if (data?.errors?.length > 0) {
          toast.warning(`Exported ${exportedCount} leads, but ${data.errors.length} failed`);
        } else {
          toast.success(`Successfully exported ${exportedCount} leads to Salesforce`);
        }
        setSelectedIds(new Set());
        fetchExportedVisitors();
      }
    } catch (err) {
      console.error('Export error:', err);
      toast.error('Failed to export leads');
    }
    setExporting(false);
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    setDeleting(true);
    try {
      const { data: convs } = await supabase
        .from('conversations')
        .select('id')
        .in('visitor_id', Array.from(selectedIds));

      if (convs && convs.length > 0) {
        const convIds = convs.map(c => c.id);
        await supabase.from('salesforce_exports').delete().in('conversation_id', convIds);
        await supabase.from('messages').delete().in('conversation_id', convIds);
        await supabase.from('conversations').delete().in('id', convIds);
      }

      const { error } = await supabase
        .from('visitors')
        .delete()
        .in('id', Array.from(selectedIds));

      if (error) {
        console.error('Delete error:', error);
        toast.error('Failed to delete selected leads');
      } else {
        toast.success(`Deleted ${selectedIds.size} lead(s)`);
        setSelectedIds(new Set());
        fetchVisitors();
        fetchExportedVisitors();
      }
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('Failed to delete leads');
    }
    setDeleting(false);
  };

  const handleExportCsv = () => {
    const rows = selectedIds.size > 0
      ? filteredVisitors.filter(v => selectedIds.has(v.id))
      : filteredVisitors;

    if (rows.length === 0) {
      toast.error('No leads to export');
      return;
    }

    const escape = (val: string | null | undefined) => {
      if (!val) return '';
      const s = val.replace(/"/g, '""');
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s}"` : s;
    };

    const headers = ['Name','Email','Phone','Location','Treatment Interest','Drug of Choice','Insurance Info','Urgency Level','GCLID','Status','Date'];
    const csvRows = rows.map(v => [
      escape(v.name), escape(v.email), escape(v.phone), escape(v.location),
      escape(v.treatment_interest), escape(v.drug_of_choice), escape(v.insurance_info),
      escape(v.urgency_level), escape(v.gclid),
      exportedIds.has(v.id) ? 'Exported' : 'New',
      new Date(v.created_at).toLocaleDateString(),
    ].join(','));

    const csv = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `visitor-leads-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${rows.length} lead(s) to CSV`);
  };

  const getUrgencyBadge = (level: string | null) => {
    if (!level) return null;
    const variant = level.toLowerCase().includes('high') || level.toLowerCase().includes('urgent')
      ? 'destructive'
      : level.toLowerCase().includes('medium')
      ? 'default'
      : 'secondary';
    return <Badge variant={variant}>{level}</Badge>;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-tour="salesforce-visitor-leads">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Visitor Leads
            </CardTitle>
            <CardDescription>
              View and export visitor data to Salesforce
            </CardDescription>
          </div>
           <div className="flex items-center gap-2" data-tour="salesforce-export-actions">
            <Button variant="ghost" size="sm" onClick={fetchVisitors}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportCsv}>
              <Download className="mr-2 h-4 w-4" />
              CSV {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive" 
                  size="sm"
                  disabled={selectedIds.size === 0 || deleting}
                >
                  {deleting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="mr-2 h-4 w-4" />
                  )}
                  Delete ({selectedIds.size})
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete selected leads?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete {selectedIds.size} lead(s) and all their associated conversations and messages. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteSelected}>
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button 
              onClick={handleExport} 
              disabled={selectedIds.size === 0 || exporting}
            >
              {exporting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              Export Selected ({selectedIds.size})
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {visitors.length > 0 && (
          <div className="flex items-center gap-2 mb-4">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Phone:</span>
            {(['all', 'with', 'without'] as const).map(val => (
              <Button
                key={val}
                variant={phoneFilter === val ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setPhoneFilter(val); setSelectedIds(new Set()); }}
              >
                {val === 'all' ? 'All' : val === 'with' ? 'Has phone' : 'No phone'}
              </Button>
            ))}
          </div>
        )}
        {filteredVisitors.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>{visitors.length === 0 ? 'No visitors yet' : 'No visitors match the filter'}</p>
            {visitors.length === 0 && <p className="text-sm">Visitors will appear here when they chat on your site</p>}
          </div>
        ) : (
          <div className="border rounded-lg w-full" style={{ maxHeight: '65vh', overflowX: 'auto', overflowY: 'auto' }}>
            <table className="min-w-[1100px] w-full caption-bottom text-sm">
              <TableHeader className="sticky top-0 z-10 bg-background">
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedIds.size === filteredVisitors.length && filteredVisitors.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Treatment Interest</TableHead>
                  <TableHead>Urgency</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVisitors.map((visitor) => (
                  <TableRow key={visitor.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(visitor.id)}
                        onCheckedChange={() => toggleSelect(visitor.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {visitor.name || <span className="text-muted-foreground">Unknown</span>}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {visitor.email && <div className="text-sm">{visitor.email}</div>}
                        {visitor.phone && <div className="text-sm text-muted-foreground">{visitor.phone}</div>}
                        {!visitor.email && !visitor.phone && <span className="text-muted-foreground">—</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      {visitor.location || <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {visitor.treatment_interest && (
                          <div className="text-sm">{visitor.treatment_interest}</div>
                        )}
                        {visitor.drug_of_choice && (
                          <div className="text-xs text-muted-foreground">{visitor.drug_of_choice}</div>
                        )}
                        {!visitor.treatment_interest && !visitor.drug_of_choice && (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getUrgencyBadge(visitor.urgency_level) || <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      {exportedIds.has(visitor.id) ? (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          Exported
                        </Badge>
                      ) : (
                        <Badge variant="secondary">New</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDistanceToNow(new Date(visitor.created_at), { addSuffix: true })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
