import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardTour } from '@/components/dashboard/DashboardTour';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { useAuth } from '@/hooks/useAuth';
import { useConversations } from '@/hooks/useConversations';
import { PropertySelector } from '@/components/PropertySelector';
import { toast } from 'sonner';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Globe,
  Plus,
  Loader2,
  MessageCircle,
  Mail,
  Bell,
  Volume2,
  ClipboardList,
  Building2,
  MessageSquare,
} from 'lucide-react';
import { SlackSettings } from '@/components/settings/SlackSettings';
import { EmailSettings } from '@/components/settings/EmailSettings';
import { NotificationLog } from '@/components/settings/NotificationLog';
import { BusinessInfoSettings } from '@/components/settings/BusinessInfoSettings';
import { GoogleChatSettings } from '@/components/settings/GoogleChatSettings';
import { useNotificationSound } from '@/hooks/useNotificationSound';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';

const VALID_TABS = ['slack', 'google-chat', 'email', 'business', 'logs'] as const;

const Notifications = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { properties, loading: dataLoading, createProperty, deleteProperty } = useConversations();
  const { enabled: soundEnabled, setEnabled: setSoundEnabled } = useNotificationSound();
  
  // Read property & tab from URL, fall back to defaults
  const selectedPropertyId = searchParams.get('property') || '';
  const activeTab = (VALID_TABS as readonly string[]).includes(searchParams.get('tab') || '') 
    ? searchParams.get('tab')! 
    : 'slack';
  
  const setSelectedPropertyId = useCallback((id: string) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (id) {
        next.set('property', id);
      } else {
        next.delete('property');
      }
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const setActiveTab = useCallback((tab: string) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('tab', tab);
      return next;
    }, { replace: true });
  }, [setSearchParams]);
  
  // New property dialog
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newPropertyName, setNewPropertyName] = useState('');
  const [newPropertyDomain, setNewPropertyDomain] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Listen for tour tab-switch events
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.tab) setActiveTab(detail.tab);
    };
    window.addEventListener('tour-switch-tab', handler);
    return () => window.removeEventListener('tour-switch-tab', handler);
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Default is "All Properties" (empty string) — no auto-select needed

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

  return (
    <DashboardLayout>
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <PageHeader title="Notifications" docsLink="/documentation/integrations/slack" tourSection="notifications" />

        {/* Content */}
        <div className="flex-1 p-2 overflow-hidden">
          <div className="h-full overflow-auto scrollbar-hide rounded-lg border border-border/30 bg-background dark:bg-background/50 dark:backdrop-blur-sm p-4 md:p-6">
            <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">

              {/* Dashboard-Level Notification Settings */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Bell className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-base">Dashboard Notifications</CardTitle>
                  </div>
                  <CardDescription>Global notification preferences for your dashboard</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="flex items-center gap-2">
                        <Volume2 className="h-4 w-4 text-muted-foreground" />
                        Notification Sound
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Play a sound when new notifications arrive
                      </p>
                    </div>
                    <Switch
                      checked={soundEnabled}
                      onCheckedChange={setSoundEnabled}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Property Selector */}
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
                          <DialogDescription>
                            Add another website to manage with Scaled Bot
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="new-property-name">Property Name</Label>
                            <Input
                              id="new-property-name"
                              placeholder="My Website"
                              value={newPropertyName}
                              onChange={(e) => setNewPropertyName(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="new-property-domain">Domain</Label>
                            <Input
                              id="new-property-domain"
                              placeholder="example.com"
                              value={newPropertyDomain}
                              onChange={(e) => setNewPropertyDomain(e.target.value)}
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button onClick={handleCreateProperty} disabled={isCreating}>
                            {isCreating ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : null}
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
                    onPropertyChange={(id) => setSelectedPropertyId(id === 'all' ? '' : id)}
                    onDeleteProperty={deleteProperty}
                    showDomain
                    showIcon={false}
                    showAllOption
                    className="w-full"
                  />
                </CardContent>
              </Card>

              <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-5" data-tour="notifications-tabs">
                    <TabsTrigger value="slack" className="gap-1.5 text-xs sm:text-sm" data-tour="notifications-slack-tab">
                      <MessageCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      Slack
                    </TabsTrigger>
                    <TabsTrigger value="google-chat" className="gap-1.5 text-xs sm:text-sm">
                      <MessageSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      Google Chat
                    </TabsTrigger>
                    <TabsTrigger value="email" className="gap-1.5 text-xs sm:text-sm" data-tour="notifications-email-tab">
                      <Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      Email
                    </TabsTrigger>
                    <TabsTrigger value="business" className="gap-1.5 text-xs sm:text-sm">
                      <Building2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      Business Info
                    </TabsTrigger>
                    <TabsTrigger value="logs" className="gap-1.5 text-xs sm:text-sm">
                      <ClipboardList className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      Logs
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                <div className="mt-4 md:mt-6" style={{ display: activeTab === 'slack' ? 'block' : 'none' }}>
                  {selectedPropertyId ? (
                    <SlackSettings propertyId={selectedPropertyId} />
                  ) : properties.length > 0 ? (
                    <SlackSettings bulkPropertyIds={properties.map(p => p.id)} bulkProperties={properties} />
                  ) : (
                    <Card>
                      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                        <Globe className="h-10 w-10 text-muted-foreground/40 mb-3" />
                        <p className="text-sm text-muted-foreground">Add a property to configure Slack settings</p>
                      </CardContent>
                    </Card>
                  )}
                </div>

                <div className="mt-4 md:mt-6" style={{ display: activeTab === 'google-chat' ? 'block' : 'none' }}>
                  {selectedPropertyId ? (
                    <GoogleChatSettings propertyId={selectedPropertyId} />
                  ) : properties.length > 0 ? (
                    <GoogleChatSettings bulkPropertyIds={properties.map(p => p.id)} bulkProperties={properties} />
                  ) : (
                    <Card>
                      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                        <Globe className="h-10 w-10 text-muted-foreground/40 mb-3" />
                        <p className="text-sm text-muted-foreground">Add a property to configure Google Chat settings</p>
                      </CardContent>
                    </Card>
                  )}
                </div>

                <div className="mt-4 md:mt-6" style={{ display: activeTab === 'email' ? 'block' : 'none' }}>
                  {selectedPropertyId ? (
                    <EmailSettings propertyId={selectedPropertyId} />
                  ) : properties.length > 0 ? (
                    <EmailSettings bulkPropertyIds={properties.map(p => p.id)} />
                  ) : (
                    <Card>
                      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                        <Globe className="h-10 w-10 text-muted-foreground/40 mb-3" />
                        <p className="text-sm text-muted-foreground">Add a property to configure Email settings</p>
                      </CardContent>
                    </Card>
                  )}
                </div>

                <div className="mt-4 md:mt-6" style={{ display: activeTab === 'business' ? 'block' : 'none' }}>
                  {selectedPropertyId ? (
                    <BusinessInfoSettings propertyId={selectedPropertyId} />
                  ) : properties.length > 0 ? (
                    <BusinessInfoSettings bulkPropertyIds={properties.map(p => p.id)} />
                  ) : (
                    <Card>
                      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                        <Globe className="h-10 w-10 text-muted-foreground/40 mb-3" />
                        <p className="text-sm text-muted-foreground">Add a property to configure business info</p>
                      </CardContent>
                    </Card>
                  )}
                </div>

                <div className="mt-4 md:mt-6" style={{ display: activeTab === 'logs' ? 'block' : 'none' }}>
                  <NotificationLog propertyId={selectedPropertyId || undefined} />
                </div>

              {properties.length === 0 && (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <Globe className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Properties Yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Add your first property to get started
                    </p>
                    <Button onClick={() => setIsDialogOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Property
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
      <DashboardTour />
    </DashboardLayout>
  );
};

export default Notifications;
