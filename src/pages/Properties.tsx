import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardTour } from '@/components/dashboard/DashboardTour';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { useConversations } from '@/hooks/useConversations';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Building2, Globe, Plus, Trash2, ExternalLink, Phone, MapPin, Mail, Clock, FileText, Image, ChevronDown, RefreshCw, Loader2, Save } from 'lucide-react';
import { useEffect } from 'react';

interface BusinessFields {
  business_phone: string;
  business_email: string;
  business_address: string;
  business_hours: string;
  business_description: string;
  business_logo_url: string;
}

const emptyFields: BusinessFields = {
  business_phone: '',
  business_email: '',
  business_address: '',
  business_hours: '',
  business_description: '',
  business_logo_url: '',
};

const PropertyBusinessCard = ({ property, onDelete }: { property: any; onDelete: (id: string) => void }) => {
  const [open, setOpen] = useState(false);
  const [fields, setFields] = useState<BusinessFields>(emptyFields);
  const [saving, setSaving] = useState(false);
  const [rescanning, setRescanning] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (open && !loaded) {
      setFields({
        business_phone: property.business_phone || '',
        business_email: property.business_email || '',
        business_address: property.business_address || '',
        business_hours: property.business_hours || '',
        business_description: property.business_description || '',
        business_logo_url: property.business_logo_url || '',
      });
      setLoaded(true);
    }
  }, [open, loaded, property]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('properties')
        .update({
          business_phone: fields.business_phone || null,
          business_email: fields.business_email || null,
          business_address: fields.business_address || null,
          business_hours: fields.business_hours || null,
          business_description: fields.business_description || null,
          business_logo_url: fields.business_logo_url || null,
        } as any)
        .eq('id', property.id);
      if (error) throw error;
      toast.success('Business info saved');
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleRescan = async () => {
    setRescanning(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('extract-website-info', {
        body: { url: property.domain },
      });
      if (error) throw error;
      if (result?.success === false) {
        const errMsg = result.error || 'Scan failed';
        if (errMsg.toLowerCase().includes('insufficient credits')) {
          toast.error('Website scanner credits exhausted. Please try again later or enter info manually.');
        } else {
          toast.error(`Scan failed: ${errMsg}`);
        }
        return;
      }
      if (result?.data) {
        const d = result.data;
        setFields(prev => ({
          ...prev,
          business_phone: d.businessPhone || prev.business_phone,
          business_email: d.businessEmail || prev.business_email,
          business_address: d.businessAddress || prev.business_address,
          business_hours: d.businessHours || prev.business_hours,
          business_description: d.description || prev.business_description,
          business_logo_url: d.logo || prev.business_logo_url,
        }));
        const hasNew = d.businessPhone || d.businessEmail || d.businessAddress || d.businessHours || d.description || d.logo;
        if (hasNew) {
          toast.success('Re-scanned! Review fields and save.');
        } else {
          toast.info('Scan complete — no new info found.');
        }
      } else {
        toast.info('Scan complete — no new info found.');
      }
    } catch {
      toast.error('Failed to re-scan website');
    } finally {
      setRescanning(false);
    }
  };

  const hasInfo = property.business_phone || property.business_address || property.business_email;

  return (
    <Card className="group transition-shadow hover:shadow-md">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div
                className="h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${property.widget_color || '#F97316'}18` }}
              >
                <Building2 className="h-5 w-5" style={{ color: property.widget_color || '#F97316' }} />
              </div>
              <div className="min-w-0 flex-1">
                <CardTitle className="text-base truncate max-w-full">{property.name}</CardTitle>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                  <Globe className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{property.domain}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <Badge variant="outline" className="text-xs">Active</Badge>
            </div>
          </div>

          {/* Quick info preview when collapsed */}
          {!open && hasInfo && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 ml-[52px] text-xs text-muted-foreground">
              {property.business_phone && (
                <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{property.business_phone}</span>
              )}
              {property.business_email && (
                <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{property.business_email}</span>
              )}
              {property.business_address && (
                <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{property.business_address}</span>
              )}
            </div>
          )}

          {/* Action row */}
          <div className="flex items-center justify-between mt-2 ml-[52px]">
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs gap-1.5 text-muted-foreground hover:text-foreground h-8 px-2"
                onClick={() => window.open(`https://${property.domain}`, '_blank')}
              >
                <ExternalLink className="h-3 w-3" />
                Visit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-8 px-2 text-muted-foreground hover:text-destructive"
                onClick={() => onDelete(property.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1.5 text-xs h-8 px-2.5 text-muted-foreground hover:text-foreground">
                <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
                {open ? 'Close' : 'Edit Info'}
              </Button>
            </CollapsibleTrigger>
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-0 border-t border-border/50 mt-1">
            <div className="pt-4 space-y-4">
              {/* Re-scan button */}
              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={handleRescan} disabled={rescanning} className="gap-1.5 text-xs">
                  {rescanning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  Re-scan Website
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <Phone className="h-3 w-3" /> Phone
                  </Label>
                  <Input
                    placeholder="(555) 123-4567"
                    value={fields.business_phone}
                    onChange={e => setFields(p => ({ ...p, business_phone: e.target.value }))}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <Mail className="h-3 w-3" /> Email
                  </Label>
                  <Input
                    type="email"
                    placeholder="info@company.com"
                    value={fields.business_email}
                    onChange={e => setFields(p => ({ ...p, business_email: e.target.value }))}
                    className="h-9 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <MapPin className="h-3 w-3" /> Address
                </Label>
                <Input
                  placeholder="123 Main St, City, ST 12345"
                  value={fields.business_address}
                  onChange={e => setFields(p => ({ ...p, business_address: e.target.value }))}
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Clock className="h-3 w-3" /> Hours
                </Label>
                <Input
                  placeholder="Mon-Fri 9am-5pm"
                  value={fields.business_hours}
                  onChange={e => setFields(p => ({ ...p, business_hours: e.target.value }))}
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <FileText className="h-3 w-3" /> Description
                </Label>
                <Textarea
                  placeholder="A short description of your business..."
                  value={fields.business_description}
                  onChange={e => setFields(p => ({ ...p, business_description: e.target.value }))}
                  rows={2}
                  className="text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Image className="h-3 w-3" /> Logo URL
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="https://example.com/logo.png"
                    value={fields.business_logo_url}
                    onChange={e => setFields(p => ({ ...p, business_logo_url: e.target.value }))}
                    className="h-9 text-sm flex-1"
                  />
                  {fields.business_logo_url && (
                    <img
                      src={fields.business_logo_url}
                      alt="Logo"
                      className="h-9 w-9 rounded-md object-contain border border-border"
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  )}
                </div>
              </div>

              <Button onClick={handleSave} disabled={saving} size="sm" className="gap-1.5">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Save Changes
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

const Properties = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { properties, deleteProperty } = useConversations();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const isTourMode = searchParams.get('tour') === '1';

  const mockProperties = useMemo(() => [
    { id: 'mock-1', name: 'alcoholawareness.org', domain: 'alcoholawareness.org', widget_color: 'hsl(255, 100%, 17%)' },
    { id: 'mock-2', name: 'recoveryhelp.com', domain: 'recoveryhelp.com', widget_color: '#22C55E' },
  ], []);

  const displayProperties = isTourMode && properties.length === 0 ? mockProperties : properties;

  const handleAdd = () => {
    navigate('/onboarding?dev=1');
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    await deleteProperty(deleteId);
    setDeleting(false);
    setDeleteId(null);
  };

  return (
    <DashboardLayout className="bg-background">
      <DashboardTour />
      <div className="flex-1 flex flex-col overflow-hidden">
        <PageHeader title="Business Information" tourSection="properties">
          <Button data-tour="properties-add-btn" onClick={handleAdd} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Add Property
          </Button>
        </PageHeader>

        <main className="flex-1 overflow-y-auto p-6" data-tour="properties-grid">
          {displayProperties.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-1">No properties yet</h3>
                <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                  Add your first website to start receiving and managing live chat conversations.
                </p>
                <Button onClick={() => navigate('/onboarding')} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Your First Property
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {displayProperties.map((property) => (
                <PropertyBusinessCard
                  key={property.id}
                  property={property}
                  onDelete={(id) => setDeleteId(id)}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Property</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this property and all associated conversations, visitors, and settings. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default Properties;
