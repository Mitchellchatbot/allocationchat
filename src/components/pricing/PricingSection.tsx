import { Link } from 'react-router-dom';
import { Check, ArrowRight, Sparkles, TrendingUp, CreditCard, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { pricingPlans, comparisonCategories } from './PricingData';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

interface PricingSectionProps {
  showComparison?: boolean;
  ctaPath?: string;
  ctaLabel?: string;
  currentPlan?: string | null;
}

export const PricingSection = ({ showComparison = true, ctaPath = '/auth', ctaLabel, currentPlan }: PricingSectionProps) => {
  const { toast } = useToast();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleCheckout = async (planId: string) => {
    setLoadingPlan(planId);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { plan_id: planId },
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, '_blank');
      else throw new Error('No checkout URL returned');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Could not start checkout', variant: 'destructive' });
    } finally {
      setLoadingPlan(null);
    }
  };
  return (
    <div className="space-y-20">
      {/* No credit card banner */}
      <div className="flex justify-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium text-primary">
          <CreditCard className="h-4 w-4" />
          No credit card required — start your free trial instantly
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="grid md:grid-cols-3 gap-4 md:gap-6 lg:gap-8 max-w-6xl mx-auto -mt-12">
        {pricingPlans.map((plan) => {
          const isCurrentPlan = currentPlan === plan.id;
          return (
          <div
            key={plan.id}
            className={cn(
              "relative group rounded-2xl md:rounded-3xl border p-5 md:p-8 transition-all duration-500 hover:shadow-2xl hover:-translate-y-1 flex flex-col",
              isCurrentPlan
                ? "border-primary ring-2 ring-primary/30 shadow-xl shadow-primary/10"
                : plan.highlightClasses
                  ? plan.highlightClasses
                  : "bg-card/60 border-border/50 hover:border-primary/30",
              plan.popular && !isCurrentPlan && "shadow-xl shadow-primary/10 scale-[1.02]"
            )}
          >
            {isCurrentPlan && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <Badge className="bg-primary text-primary-foreground border-0 px-4 py-1 text-sm font-bold shadow-lg shadow-primary/30">
                  <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                  Your Plan
                </Badge>
              </div>
            )}
            {plan.popular && !isCurrentPlan && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <Badge className="bg-gradient-to-r from-primary to-orange-500 text-primary-foreground border-0 px-4 py-1 text-sm font-bold shadow-lg shadow-primary/30">
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                  Most Popular
                </Badge>
              </div>
            )}

            {/* Header */}
            <div className="mb-6">
              <div className={cn(
                "h-12 w-12 rounded-2xl bg-gradient-to-br flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-500",
                plan.gradient
              )}>
                <plan.icon className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-foreground">{plan.name}</h3>
              <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
            </div>

            {/* Price */}
            <div className="mb-4 md:mb-6">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl md:text-5xl font-black text-foreground">${plan.price}</span>
                <span className="text-muted-foreground font-medium text-sm">/mo</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Up to <span className="font-semibold text-foreground">{plan.conversations}</span> conversations
              </p>
            </div>

            {/* Overflow badge for Enterprise */}
            {plan.overflow && (
              <div className="mb-5 flex items-start gap-1.5 p-2 rounded-lg bg-primary/5 border border-primary/10">
                <TrendingUp className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-[11px] text-muted-foreground leading-snug">
                  {plan.overflow}
                </p>
              </div>
            )}

            {/* Features */}
            <ul className="space-y-3 mb-8 flex-1">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center mt-0.5 flex-shrink-0 shadow-sm shadow-primary/10">
                    <Check className="h-3 w-3 text-primary" strokeWidth={3} />
                  </div>
                  <span className="text-sm text-muted-foreground">{feature}</span>
                </li>
              ))}
            </ul>

            {/* CTA */}
            <div className="mt-auto">
              <Button
                onClick={() => !isCurrentPlan && handleCheckout(plan.id)}
                disabled={isCurrentPlan || loadingPlan === plan.id}
                className={cn(
                  "w-full h-12 text-base font-bold rounded-xl gap-2 group/btn",
                  isCurrentPlan
                    ? "bg-primary/10 text-primary border-primary/30 cursor-default"
                    : plan.popular
                      ? "bg-gradient-to-r from-primary to-orange-500 text-primary-foreground hover:opacity-90 shadow-lg shadow-primary/25"
                      : ""
                )}
                variant={isCurrentPlan ? 'outline' : plan.popular ? 'default' : 'outline'}
                size="lg"
              >
                {isCurrentPlan ? (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Current Plan
                  </>
                ) : loadingPlan === plan.id ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                  <>
                    {ctaLabel || 'Start 14-Day Free Trial'}
                    <ArrowRight className="h-4 w-4 group-hover/btn:translate-x-0.5 transition-transform" />
                  </>
                )}
              </Button>
            </div>
          </div>
          );
        })}
      </div>

      {/* Comparison Table */}
      {showComparison && (
        <div className="max-w-5xl mx-auto">
          <h3 className="text-xl md:text-2xl font-bold text-center text-foreground mb-2 md:mb-3">
            Compare Plans in Detail
          </h3>
          <p className="text-center text-muted-foreground mb-6 md:mb-10 text-sm">
            See exactly what's included in each plan
          </p>

          {/* Desktop: grid comparison table */}
          <div className="hidden md:block rounded-2xl border border-border/40 overflow-hidden bg-card shadow-lg">
            {/* Table header */}
            <div className="grid grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr] border-b border-border/40">
              <div className="p-5" />
              {pricingPlans.map((plan) => (
                <div key={plan.id} className={cn(
                  "p-5 text-center",
                  plan.popular && "bg-primary/5 border-x border-primary/10",
                )}>
                  <p className="font-extrabold text-lg text-foreground">{plan.name}</p>
                  <p className="text-sm font-bold text-primary mt-0.5">${plan.price}<span className="text-muted-foreground font-medium text-xs">/mo</span></p>
                </div>
              ))}
            </div>

            {/* Category rows */}
            {comparisonCategories.map((category) => (
              <div key={category.name}>
                <div className="px-5 py-3 bg-muted/50 border-b border-border/30">
                  <p className="text-xs font-extrabold text-foreground/70 uppercase tracking-widest">{category.name}</p>
                </div>
                {category.features.map((feature, idx) => (
                  <div
                    key={feature.name}
                    className={cn(
                      "grid grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr] border-b border-border/10 transition-colors hover:bg-muted/10",
                      idx % 2 !== 0 && "bg-muted/[0.03]"
                    )}
                  >
                    <div className="px-5 py-3 text-sm text-foreground/80 flex items-center font-medium">
                      {feature.name}
                    </div>
                    {(['basic', 'professional', 'enterprise'] as const).map((planId) => {
                      const value = feature[planId];
                      const isPro = planId === 'professional';
                      return (
                        <div key={planId} className={cn(
                          "px-5 py-3 text-center flex items-center justify-center",
                          isPro && "bg-primary/[0.03] border-x border-primary/5",
                        )}>
                          {value === true ? (
                            <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary/25 to-primary/10 flex items-center justify-center shadow-sm shadow-primary/15 ring-1 ring-primary/15">
                              <Check className="h-4 w-4 text-primary" strokeWidth={3} />
                            </div>
                          ) : value === false ? (
                            <span className="text-muted-foreground/25 text-sm">—</span>
                          ) : (
                            <span className="text-sm font-semibold text-foreground">{value}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            ))}

            {/* Bottom CTA row */}
            <div className="grid grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr] bg-muted/20 border-t border-border/30">
              <div className="p-4" />
              {pricingPlans.map((plan) => (
                <div key={plan.id} className={cn(
                  "p-4 flex items-center justify-center",
                  plan.popular && "bg-primary/[0.03] border-x border-primary/5",
                )}>
                  <Button
                      onClick={() => handleCheckout(plan.id)}
                      disabled={loadingPlan === plan.id}
                      variant={plan.popular ? 'default' : 'outline'}
                      size="sm"
                      className={cn(
                        "rounded-lg gap-1.5 font-semibold text-xs h-9 px-4",
                        plan.popular && "bg-gradient-to-r from-primary to-orange-500 text-primary-foreground border-0 shadow-md"
                      )}
                    >
                      {loadingPlan === plan.id ? <Loader2 className="h-3 w-3 animate-spin" /> : (
                        <>
                          {ctaLabel || 'Get Started'}
                          <ArrowRight className="h-3 w-3" />
                        </>
                      )}
                    </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile: stacked per-plan cards */}
          <div className="md:hidden space-y-4">
            {pricingPlans.map((plan) => (
              <div
                key={plan.id}
                className={cn(
                  "rounded-2xl border overflow-hidden",
                  plan.popular
                    ? "border-primary/30 bg-primary/[0.02] shadow-md"
                    : "border-border/40 bg-card"
                )}
              >
                {/* Plan header */}
                <div className={cn(
                  "flex items-center justify-between px-4 py-3 border-b",
                  plan.popular ? "bg-primary/5 border-primary/10" : "bg-muted/30 border-border/30"
                )}>
                  <div>
                    <p className="font-bold text-foreground">{plan.name}</p>
                    <p className="text-sm font-bold text-primary">${plan.price}<span className="text-muted-foreground font-normal text-xs">/mo</span></p>
                  </div>
                  {plan.popular && (
                    <Badge className="bg-gradient-to-r from-primary to-orange-500 text-primary-foreground border-0 text-xs">
                      <Sparkles className="h-3 w-3 mr-1" />
                      Popular
                    </Badge>
                  )}
                </div>

                {/* Features list */}
                <div className="divide-y divide-border/10">
                  {comparisonCategories.map((category) => (
                    category.features.map((feature) => {
                      const value = feature[plan.id as keyof typeof feature];
                      return (
                        <div key={feature.name} className="flex items-center justify-between px-4 py-2.5">
                          <span className="text-xs text-muted-foreground">{feature.name}</span>
                          <div className="flex-shrink-0 ml-3">
                            {value === true ? (
                              <div className="h-5 w-5 rounded-full bg-primary/15 flex items-center justify-center">
                                <Check className="h-3 w-3 text-primary" strokeWidth={3} />
                              </div>
                            ) : value === false ? (
                              <span className="text-muted-foreground/30 text-xs">—</span>
                            ) : (
                              <span className="text-xs font-semibold text-foreground">{value}</span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ))}
                </div>

                {/* CTA */}
                <div className="p-3 border-t border-border/20">
                  <Button
                      onClick={() => handleCheckout(plan.id)}
                      disabled={loadingPlan === plan.id}
                      variant={plan.popular ? 'default' : 'outline'}
                      size="sm"
                      className={cn(
                        "w-full rounded-xl gap-1.5 font-semibold text-xs h-9",
                        plan.popular && "bg-gradient-to-r from-primary to-orange-500 text-primary-foreground border-0 shadow-md"
                      )}
                    >
                      {loadingPlan === plan.id ? <Loader2 className="h-3 w-3 animate-spin" /> : (
                        <>
                          {ctaLabel || 'Get Started'}
                          <ArrowRight className="h-3 w-3" />
                        </>
                      )}
                    </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
