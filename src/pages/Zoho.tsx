import { useState, useEffect } from 'react';
import { usePersistedProperty } from '@/hooks/usePersistedProperty';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { useAuth } from '@/hooks/useAuth';
import { useConversations } from '@/hooks/useConversations';
import { PropertySelector } from '@/components/PropertySelector';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Globe, Plus, Loader2, Settings, Users } from 'lucide-react';
import { ZohoSettings } from '@/components/settings/ZohoSettings';
import { VisitorLeadsTable } from '@/components/settings/VisitorLeadsTable';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader,
  DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';

const Zoho = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { properties, loading: dataLoading, createProperty, deleteProperty } = useConversations();
  const [selectedPropertyId, setSelectedPropertyId] = usePersistedProperty();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newPropertyName, setNewPropertyName] = useState('');
  const [newPropertyDomain, setNewPropertyDomain] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [activeTab, setActiveTab] = useState('leads');

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  const handleCreateProperty = async () => {
    if (!newPropertyName.trim() || !newPropertyDomain.trim()) return;
    setIsCreating(true);
    const property = await createProperty(newPropertyName.trim(), newPropertyDomain.trim());
    setIsCreating(false);
    if (property) {
      setIsDialogOpen(false);
      setNewPropertyName('');
      setNewPropertyDomain('');
      setSelectedPropertyId(property.id);
      toast.success('Property created successfully');
    }
  };

  if (authLoading || dataLoading || !user) {
    return (
      <DashboardLayout>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  const allPropertyIds = properties.map(p => p.id);
  const effectivePropertyId = selectedPropertyId || (properties[0]?.id ?? '');

  return (
    <DashboardLayout>
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <PageHeader title="Zoho CRM" />

        <div className="flex-1 p-2 overflow-hidden">
          <div className="h-full overflow-auto scrollbar-hide rounded-lg border border-border/30 bg-background dark:bg-background/50 dark:backdrop-blur-sm p-6">
            <div className="max-w-4xl mx-auto space-y-6">

              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Globe className="h-5 w-5 text-muted-foreground" />
                      <CardTitle className="text-base">Select Property</CardTitle>
                    </div>
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Plus className="mr-2 h-4 w-4" />
                          Add Property
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add New Property</DialogTitle>
                          <DialogDescription>Add another website to the platform</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="name">Property Name</Label>
                            <Input id="name" placeholder="My Website" value={newPropertyName} onChange={e => setNewPropertyName(e.target.value)} />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="domain">Domain</Label>
                            <Input id="domain" placeholder="example.com" value={newPropertyDomain} onChange={e => setNewPropertyDomain(e.target.value)} />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                          <Button onClick={handleCreateProperty} disabled={isCreating}>
                            {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Create Property
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  <PropertySelector
                    properties={properties}
                    selectedPropertyId={selectedPropertyId}
                    onPropertyChange={id => setSelectedPropertyId(id === 'all' ? '' : id)}
                    onDeleteProperty={deleteProperty}
                    showDomain
                    showIcon={false}
                    showAllOption
                    className="w-full"
                  />
                </CardContent>
              </Card>

              {properties.length > 0 && (
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                  <TabsList>
                    <TabsTrigger value="leads" className="gap-2">
                      <Users className="h-4 w-4" />
                      Doctor Leads
                    </TabsTrigger>
                    <TabsTrigger value="settings" className="gap-2">
                      <Settings className="h-4 w-4" />
                      Zoho Settings
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="leads">
                    <VisitorLeadsTable
                      propertyId={effectivePropertyId}
                      allPropertyIds={!selectedPropertyId ? allPropertyIds : undefined}
                    />
                  </TabsContent>

                  <TabsContent value="settings">
                    {effectivePropertyId ? (
                      <ZohoSettings propertyId={effectivePropertyId} />
                    ) : (
                      <p className="text-muted-foreground text-sm">Select a property to configure Zoho settings.</p>
                    )}
                  </TabsContent>
                </Tabs>
              )}

              {properties.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No properties yet. Add one to get started.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Zoho;
