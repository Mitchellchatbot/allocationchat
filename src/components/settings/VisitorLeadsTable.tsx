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
  age: string | null;
  specialty: string | null;
  country_of_training: string | null;
  qualification_date: string | null;
  qualified: boolean | null;
  speaks_arabic: boolean | null;
  location: string | null;
  gclid: string | null;
  created_at: string;
}

// Family Medicine / GP doctors are only placed if they speak Arabic. Mirrors
// FAMILY_GP_REGEX in extract-visitor-info / zoho-export-leads / widget-save-message.
const FAMILY_GP_REGEX = /(\bfamily\s+(?:medicine|physician|practice|practitioner|doctor)\b|\bgeneral\s+(?:practice|practitioner|physician)\b|\bgp\b|\bprimary\s+care\b)/i;
const isFamilyOrGp = (specialty: string | null) => FAMILY_GP_REGEX.test(specialty || '');

// Effective qualification shown in the dashboard. The stored `qualified` flag is
// recomputed server-side, but we also downgrade Family Medicine / GP doctors who
// haven't confirmed Arabic so the badge matches what the exporter will actually do.
const effectiveQualified = (v: Visitor): boolean | null => {
  if (isFamilyOrGp(v.specialty) && v.speaks_arabic !== true) return false;
  return v.qualified;
};

export const VisitorLeadsTable = ({ propertyId, allPropertyIds }: VisitorLeadsTableProps) => {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [exportedIds, setExportedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [phoneFilter, setPhoneFilter] = useState<'all' | 'with' | 'without'>('all');
  const [qualFilter, setQualFilter] = useState<'all' | 'qualified' | 'unqualified'>('all');

  const filteredVisitors = visitors.filter(v => {
    if (phoneFilter === 'with' && !v.phone) return false;
    if (phoneFilter === 'without' && v.phone) return false;
    const qual = effectiveQualified(v);
    if (qualFilter === 'qualified' && qual !== true) return false;
    if (qualFilter === 'unqualified' && qual !== false) return false;
    return true;
  });

  useEffect(() => {
    fetchVisitors();
    fetchExportedVisitors();
  }, [propertyId]);

  const fetchVisitors = async () => {
    setLoading(true);
    const isAll = allPropertyIds && allPropertyIds.length > 0;
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
      .select('id, name, email, phone, age, specialty, country_of_training, qualification_date, qualified, speaks_arabic, location, gclid, created_at')
      .in('id', visitorIds)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load leads');
    } else {
      setVisitors((data || []) as Visitor[]);
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
      const visitorIds = conversations.map(c => c.visitor_id);
      const { data: exports } = await supabase
        .from('zoho_exports' as any)
        .select('visitor_id')
        .in('visitor_id', visitorIds);

      if (exports) {
        setExportedIds(new Set((exports as any[]).map(e => e.visitor_id)));
      }
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedIds(next);
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
      toast.error('Please select at least one lead to export');
      return;
    }
    setExporting(true);
    const visitorIdList = Array.from(selectedIds);
    try {
      const isAll = allPropertyIds && allPropertyIds.length > 0;
      const exportPropertyId = isAll ? 'all' : propertyId;

      const { data, error } = await supabase.functions.invoke('zoho-export-leads', {
        body: { propertyId: exportPropertyId, visitorIds: visitorIdList },
      });

      if (error || data?.error) {
        const msg = data?.error || error?.message || '';
        if (msg.includes('not connected')) {
          toast.error('Zoho CRM not connected. Please connect in the Zoho tab.');
        } else {
          toast.error(msg || 'Failed to export leads to Zoho');
        }
      } else {
        const { exported = 0, alreadyExported = 0, skippedUnqualified = 0, skipped = 0, errors = [] } = data;
        // Older deploys returned only `skipped` (combined). If the new fields
        // aren't present, fall back to treating skipped as unqualified.
        const dupes = alreadyExported || 0;
        const unq = skippedUnqualified || (alreadyExported === undefined ? skipped : 0);

        if (exported === 0 && dupes > 0 && unq === 0 && errors.length === 0) {
          toast.info(`${dupes} lead(s) already in Zoho — nothing to export.`);
        } else if (exported === 0 && unq > 0 && dupes === 0) {
          toast.warning(`${unq} lead(s) were unqualified and not exported to Zoho.`);
        } else if (errors.length > 0) {
          toast.warning(`Exported ${exported}, ${unq} unqualified, ${dupes} already in Zoho, ${errors.length} failed.`);
        } else {
          const extras = [
            unq > 0 ? `${unq} unqualified` : null,
            dupes > 0 ? `${dupes} already in Zoho` : null,
          ].filter(Boolean).join(', ');
          toast.success(`Exported ${exported} qualified lead(s) to Zoho CRM${extras ? ` (${extras})` : ''}.`);
        }
        setSelectedIds(new Set());
        fetchExportedVisitors();
      }
    } catch (err) {
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
        await supabase.from('messages').delete().in('conversation_id', convIds);
        await supabase.from('conversations').delete().in('id', convIds);
      }

      const { error } = await supabase.from('visitors').delete().in('id', Array.from(selectedIds));
      if (error) {
        toast.error('Failed to delete selected leads');
      } else {
        toast.success(`Deleted ${selectedIds.size} lead(s)`);
        setSelectedIds(new Set());
        fetchVisitors();
        fetchExportedVisitors();
      }
    } catch (err) {
      toast.error('Failed to delete leads');
    }
    setDeleting(false);
  };

  const handleExportCsv = () => {
    const rows = selectedIds.size > 0
      ? filteredVisitors.filter(v => selectedIds.has(v.id))
      : filteredVisitors;

    if (rows.length === 0) { toast.error('No leads to export'); return; }

    const escape = (val: string | null | undefined) => {
      if (!val) return '';
      const s = val.replace(/"/g, '""');
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s}"` : s;
    };

    const headers = ['Name', 'Email', 'Phone', 'Age', 'Specialty', 'Country of Training', 'Speaks Arabic', 'Qualified', 'Location', 'GCLID', 'Zoho Status', 'Date'];
    const csvRows = rows.map(v => [
      escape(v.name), escape(v.email), escape(v.phone), escape(v.age),
      escape(v.specialty), escape(v.country_of_training),
      v.speaks_arabic === true ? 'Yes' : v.speaks_arabic === false ? 'No' : 'Unknown',
      effectiveQualified(v) === true ? 'Qualified' : effectiveQualified(v) === false ? 'Unqualified' : 'Pending',
      escape(v.location), escape(v.gclid),
      exportedIds.has(v.id) ? 'Exported' : 'Not Exported',
      new Date(v.created_at).toLocaleDateString(),
    ].join(','));

    const csv = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `doctor-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${rows.length} lead(s) to CSV`);
  };

  const getQualBadge = (qualified: boolean | null) => {
    if (qualified === true) return <Badge className="bg-green-600 text-white">Qualified</Badge>;
    if (qualified === false) return <Badge variant="destructive">Unqualified</Badge>;
    return <Badge variant="secondary">Pending</Badge>;
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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Doctor Leads
            </CardTitle>
            <CardDescription>View and export qualified doctor leads to Zoho CRM</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={fetchVisitors}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportCsv}>
              <Download className="mr-2 h-4 w-4" />
              CSV {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={selectedIds.size === 0 || deleting}>
                  {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                  Delete ({selectedIds.size})
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete selected leads?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete {selectedIds.size} lead(s) and all associated conversations. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteSelected}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button onClick={handleExport} disabled={selectedIds.size === 0 || exporting}>
              {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              Export to Zoho ({selectedIds.size})
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {visitors.length > 0 && (
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Phone:</span>
              {(['all', 'with', 'without'] as const).map(val => (
                <Button key={val} variant={phoneFilter === val ? 'default' : 'outline'} size="sm"
                  onClick={() => { setPhoneFilter(val); setSelectedIds(new Set()); }}>
                  {val === 'all' ? 'All' : val === 'with' ? 'Has phone' : 'No phone'}
                </Button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Status:</span>
              {(['all', 'qualified', 'unqualified'] as const).map(val => (
                <Button key={val} variant={qualFilter === val ? 'default' : 'outline'} size="sm"
                  onClick={() => { setQualFilter(val); setSelectedIds(new Set()); }}>
                  {val === 'all' ? 'All' : val === 'qualified' ? 'Qualified' : 'Unqualified'}
                </Button>
              ))}
            </div>
          </div>
        )}
        {filteredVisitors.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>{visitors.length === 0 ? 'No leads yet' : 'No leads match the filter'}</p>
            {visitors.length === 0 && <p className="text-sm">Leads will appear here when doctors chat on your site</p>}
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
                  <TableHead>Specialty</TableHead>
                  <TableHead>Country of Training</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead>Qualification</TableHead>
                  <TableHead>Zoho</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVisitors.map((visitor) => (
                  <TableRow key={visitor.id}>
                    <TableCell>
                      <Checkbox checked={selectedIds.has(visitor.id)} onCheckedChange={() => toggleSelect(visitor.id)} />
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
                      <div className="space-y-1">
                        <div>{visitor.specialty || <span className="text-muted-foreground">—</span>}</div>
                        {isFamilyOrGp(visitor.specialty) && (
                          <div className="text-xs text-muted-foreground">
                            Arabic: {visitor.speaks_arabic === true ? 'Yes' : visitor.speaks_arabic === false ? 'No' : 'Unknown'}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{visitor.country_of_training || <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell>{visitor.age || <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell>{getQualBadge(effectiveQualified(visitor))}</TableCell>
                    <TableCell>
                      {exportedIds.has(visitor.id) ? (
                        <Badge variant="outline" className="text-green-600 border-green-600">Exported</Badge>
                      ) : (
                        <Badge variant="secondary">Not Exported</Badge>
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
