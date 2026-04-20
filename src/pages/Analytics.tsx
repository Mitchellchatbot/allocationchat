import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { DashboardTour } from '@/components/dashboard/DashboardTour';
import { BlogAnalytics } from '@/components/dashboard/BlogAnalytics';
import { Building2, Loader2 } from 'lucide-react';
import { useConversations } from '@/hooks/useConversations';
import { PropertySelector } from '@/components/PropertySelector';
import { usePersistedProperty } from '@/hooks/usePersistedProperty';

const Analytics = () => {
  const { properties, loading, deleteProperty } = useConversations();
  const [selectedPropertyId, setSelectedPropertyId] = usePersistedProperty();

  // Default is "All Properties" (empty string) — no auto-select needed

  return (
    <DashboardLayout>
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <PageHeader
          title="Analytics"
          docsLink="/documentation/analytics/overview"
          tourSection="analytics"
          propertySelector={
            !loading && properties.length > 0 ? (
              <PropertySelector
                properties={properties}
                selectedPropertyId={selectedPropertyId}
                onPropertyChange={(id) => setSelectedPropertyId(id === 'all' ? '' : id)}
                onDeleteProperty={deleteProperty}
                variant="header"
                showAllOption
                showAddButton
              />
            ) : undefined
          }
        >
          {loading ? (
            <div className="flex items-center gap-2 text-sidebar-foreground/60">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Loading...</span>
            </div>
          ) : null}
        </PageHeader>

        {/* Content */}
        <div className="flex-1 p-2 overflow-hidden">
          <div className="h-full overflow-auto scrollbar-hide rounded-lg border border-border/30 bg-background dark:bg-background/50 dark:backdrop-blur-sm p-6">
            <div className="max-w-4xl mx-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4 animate-in fade-in duration-300">
                <div className="relative">
                  <div className="h-12 w-12 rounded-full border-4 border-muted" />
                  <div className="absolute inset-0 h-12 w-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                </div>
                <p className="text-sm text-muted-foreground">Loading analytics...</p>
              </div>
            ) : properties.length === 0 ? (
              <div className="text-center py-20 animate-in fade-in duration-300">
                <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h2 className="text-lg font-semibold text-foreground mb-2">No Properties Yet</h2>
                <p className="text-muted-foreground">
                  Create a property first to start tracking analytics.
                </p>
              </div>
            ) : (
              <div className="content-ready">
                <BlogAnalytics propertyId={selectedPropertyId} />
              </div>
            )}
            </div>
          </div>
        </div>
      </div>
      <DashboardTour />
    </DashboardLayout>
  );
};

export default Analytics;