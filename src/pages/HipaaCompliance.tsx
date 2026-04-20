import { useState, useEffect } from 'react';
import { usePersistedProperty } from '@/hooks/usePersistedProperty';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { useAuth } from '@/hooks/useAuth';
import { useConversations } from '@/hooks/useConversations';
import { PropertySelector } from '@/components/PropertySelector';
import { Loader2 } from 'lucide-react';
import { HipaaSettings } from '@/components/settings/HipaaSettings';

const HipaaCompliance = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { properties, loading: dataLoading } = useConversations();
  const [selectedPropertyId, setSelectedPropertyId] = usePersistedProperty();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (properties.length > 0 && !selectedPropertyId) {
      setSelectedPropertyId(properties[0].id);
    }
  }, [properties, selectedPropertyId]);

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
        <PageHeader
          title="HIPAA Compliance"
          propertySelector={
            properties.length > 1 ? (
              <PropertySelector
                properties={properties}
                selectedPropertyId={selectedPropertyId}
                onPropertyChange={setSelectedPropertyId}
                onDeleteProperty={async () => false}
                showDomain={false}
                showIcon={false}
                className="w-auto"
              />
            ) : undefined
          }
        />
        <div className="flex-1 p-2 overflow-hidden">
          <div className="h-full overflow-auto scrollbar-hide rounded-lg border border-border/30 bg-background dark:bg-background/50 dark:backdrop-blur-sm p-4 md:p-6">
            <div className="max-w-4xl mx-auto">
              {selectedPropertyId ? (
                <HipaaSettings propertyId={selectedPropertyId} />
              ) : (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  No properties found. Create a property first.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default HipaaCompliance;
