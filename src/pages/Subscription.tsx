import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { useConversations } from '@/hooks/useConversations';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CreditCard, Calendar, MessageSquare, TrendingUp, AlertCircle, ArrowUpRight, ArrowDownRight, Receipt, XCircle, Settings, Building2, CheckCircle2, Loader2, Infinity } from 'lucide-react';
import { PricingSection } from '@/components/pricing/PricingSection';
import { pricingPlans } from '@/components/pricing/PricingData';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const Subscription = () => {
  const { user } = useAuth();
  const { plan, status, isTrialing, trialDaysLeft, isComped, isActive, currentPeriodEnd, loading: subLoading, refreshSubscription } = useSubscription();
  const { properties } = useConversations();
  const [searchParams] = useSearchParams();
  const isAddPropertyIntent = searchParams.get('reason') === 'add-property';
  const isSuccess = searchParams.get('success') === 'true';
  const [portalLoading, setPortalLoading] = useState(false);
  const { toast } = useToast();
  const [conversationsUsed, setConversationsUsed] = useState(0);

  const activePlan = pricingPlans.find(p => p.id === plan);
  const conversationLimit = isComped ? 0 : (activePlan?.conversationsNum || 500);
  const usagePercent = isComped ? 0 : (conversationLimit > 0 ? Math.min((conversationsUsed / conversationLimit) * 100, 100) : 0);

  useEffect(() => {
    if (!properties.length) return;
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const propertyIds = properties.map(p => p.id);

    supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .in('property_id', propertyIds)
      .gte('created_at', firstOfMonth)
      .eq('is_test', false)
      .then(({ count }) => setConversationsUsed(count || 0));
  }, [properties]);

  const handleManageBilling = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-billing-portal');
      if (error) throw error;
      if (data?.url) window.open(data.url, '_blank');
    } catch (err) {
      toast({ title: 'Error', description: 'Could not open billing portal', variant: 'destructive' });
    } finally {
      setPortalLoading(false);
    }
  };

  const statusLabel = isComped ? 'Comped' : isTrialing ? 'Free Trial' : status === 'active' ? activePlan?.name || 'Active' : 'No Plan';
  const statusColor = isComped || status === 'active' ? 'border-primary text-primary bg-primary/10' : isTrialing ? 'border-amber-500 text-amber-600 bg-amber-500/10' : 'border-destructive text-destructive bg-destructive/10';

  return (
    <DashboardLayout className="bg-background">
      <div className="flex-1 flex flex-col overflow-y-auto">
        <PageHeader title="Subscription" />

        <div className="flex-1 p-3 md:p-6 space-y-4 md:space-y-8 max-w-6xl mx-auto w-full">
          {/* Success Banner */}
          {isSuccess && (
            <Card className="border-green-300 bg-green-50/60">
              <CardContent className="flex items-center gap-4 py-5">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
                <div>
                  <h3 className="font-semibold text-foreground">Subscription activated!</h3>
                  <p className="text-sm text-muted-foreground">Your plan is now active. Enjoy all features.</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Add Property Paywall Banner */}
          {isAddPropertyIntent && (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="flex items-center gap-4 py-5">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground text-lg">Add Another Property</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Your first property is free. Each additional property is <span className="font-bold text-foreground">$97/month</span>.
                  </p>
                </div>
                <Badge variant="outline" className="border-primary text-primary bg-primary/10 shrink-0 text-sm px-3 py-1">
                  $97/property
                </Badge>
              </CardContent>
            </Card>
          )}

          {/* Current Plan Status */}
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="md:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-primary" />
                      Current Plan
                    </CardTitle>
                    <CardDescription>
                      {isComped ? "Your account has complimentary access"
                        : isTrialing ? "You're currently on a free trial"
                        : status === 'active' ? `You're on the ${activePlan?.name} plan`
                        : "Choose a plan to get started"}
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className={cn("text-sm font-semibold", statusColor)}>
                    {statusLabel}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {isTrialing && !isComped && (
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
                    <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {trialDaysLeft} days left in your free trial
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Choose a plan below to continue using Care Assist after your trial ends. No credit card required.
                      </p>
                    </div>
                  </div>
                )}

                {(status === 'active' || isComped) && (
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-muted/50 border border-border/50">
                      <p className="text-xs text-muted-foreground font-medium">Monthly Price</p>
                      <p className="text-2xl font-bold text-foreground mt-1">
                        {isComped ? 'Free' : `$${activePlan?.price || 0}`}
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-muted/50 border border-border/50">
                      <p className="text-xs text-muted-foreground font-medium">Next Billing Date</p>
                      <p className="text-lg font-semibold text-foreground mt-1 flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {currentPeriodEnd ? new Date(currentPeriodEnd).toLocaleDateString() : isComped ? 'Never' : '—'}
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-muted/50 border border-border/50">
                      <p className="text-xs text-muted-foreground font-medium">Status</p>
                      <Badge className="mt-2 bg-green-100 text-green-700 border-green-200">
                        {isComped ? 'Comped' : 'Active'}
                      </Badge>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  Usage
                </CardTitle>
                <CardDescription>Conversations this month</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isComped ? (
                  <div className="flex flex-col items-center gap-2 py-2">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Infinity className="h-5 w-5 text-primary" />
                    </div>
                    <p className="text-lg font-bold text-foreground">Unlimited</p>
                    <p className="text-xs text-muted-foreground text-center">
                      {conversationsUsed.toLocaleString()} conversations this month — no limits applied
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{conversationsUsed.toLocaleString()} used</span>
                        <span className="font-medium text-foreground">{conversationLimit.toLocaleString()} limit</span>
                      </div>
                      <Progress value={usagePercent} className="h-3" />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {conversationLimit - conversationsUsed > 0
                        ? `${(conversationLimit - conversationsUsed).toLocaleString()} conversations remaining`
                        : 'Limit reached — upgrade for more'}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Manage Plan Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                Manage Plan
              </CardTitle>
              <CardDescription>
                {status === 'active'
                  ? 'Manage your subscription through the billing portal.'
                  : 'Choose a plan to get started.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                <button
                  onClick={handleManageBilling}
                  disabled={!status || status === 'trialing' || isComped || portalLoading}
                  className={cn(
                    "flex flex-col items-center gap-3 p-5 rounded-xl border border-border/50 bg-muted/30 hover:bg-muted/50 transition-colors text-center",
                    (!status || status === 'trialing' || isComped) && "opacity-60 cursor-not-allowed"
                  )}
                >
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    {portalLoading ? <Loader2 className="h-5 w-5 text-primary animate-spin" /> : <ArrowUpRight className="h-5 w-5 text-primary" />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Upgrade Plan</p>
                    <p className="text-xs text-muted-foreground mt-1">Move to a higher tier</p>
                  </div>
                </button>

                <button
                  onClick={handleManageBilling}
                  disabled={!status || status === 'trialing' || isComped || portalLoading}
                  className={cn(
                    "flex flex-col items-center gap-3 p-5 rounded-xl border border-border/50 bg-muted/30 hover:bg-muted/50 transition-colors text-center",
                    (!status || status === 'trialing' || isComped) && "opacity-60 cursor-not-allowed"
                  )}
                >
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Receipt className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Billing History</p>
                    <p className="text-xs text-muted-foreground mt-1">View invoices and payments</p>
                  </div>
                </button>

                <button
                  onClick={handleManageBilling}
                  disabled={!status || status === 'trialing' || isComped || portalLoading}
                  className={cn(
                    "flex flex-col items-center gap-3 p-5 rounded-xl border border-border/50 bg-muted/30 hover:bg-muted/50 transition-colors text-center",
                    (!status || status === 'trialing' || isComped) && "opacity-60 cursor-not-allowed"
                  )}
                >
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <ArrowDownRight className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Downgrade Plan</p>
                    <p className="text-xs text-muted-foreground mt-1">Switch to a lower tier</p>
                  </div>
                </button>

                <button
                  onClick={handleManageBilling}
                  disabled={!status || status === 'trialing' || isComped || portalLoading}
                  className={cn(
                    "flex flex-col items-center gap-3 p-5 rounded-xl border border-border/50 bg-muted/30 hover:bg-muted/50 transition-colors text-center",
                    (!status || status === 'trialing' || isComped) && "opacity-60 cursor-not-allowed"
                  )}
                >
                  <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                    <XCircle className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Cancel Subscription</p>
                    <p className="text-xs text-muted-foreground mt-1">End at next billing cycle</p>
                  </div>
                </button>
              </div>

              {(!status || status === 'trialing' || isComped) && (
                <p className="text-xs text-muted-foreground mt-4 text-center">
                  {isComped ? 'Your account has complimentary access — no billing needed.' : 'These options become active once you subscribe.'}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Pricing Plans */}
          {!isComped && (
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-2">
                {plan ? 'Switch Plans' : 'Choose a Plan'}
              </h2>
              <p className="text-muted-foreground mb-8">
                {plan
                  ? 'Upgrade or downgrade your plan at any time.'
                  : 'Start your 14-day free trial — no credit card required.'}
              </p>
              <PricingSection
                showComparison={true}
                ctaPath="/dashboard/subscription"
                ctaLabel={plan ? 'Switch to This Plan' : 'Start 14-Day Free Trial'}
                currentPlan={plan}
              />
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Subscription;
