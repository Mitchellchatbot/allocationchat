import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export type PlanId = 'basic' | 'professional' | 'enterprise' | null;

export type SubscriptionStatus = 'trialing' | 'active' | 'canceled' | 'past_due' | 'comped' | 'trial_expired' | 'no_subscription' | null;

type GatedFeature =
  | 'salesforce'
  | 'slack'
  | 'custom_prompts'
  | 'launcher_effects'
  | 'advanced_analytics'
  | 'priority_support'
  | 'overflow';

const FEATURE_PLAN_MAP: Record<GatedFeature, PlanId[]> = {
  salesforce: ['professional', 'enterprise'],
  slack: ['professional', 'enterprise'],
  custom_prompts: ['professional', 'enterprise'],
  launcher_effects: ['professional', 'enterprise'],
  advanced_analytics: ['professional', 'enterprise'],
  priority_support: ['professional', 'enterprise'],
  overflow: ['enterprise'],
};

const INTERNAL_EMAILS = ['henry@scaledai.org'];

interface SubscriptionData {
  plan: PlanId;
  status: SubscriptionStatus;
  isTrialing: boolean;
  trialDaysLeft: number;
  isComped: boolean;
  isActive: boolean;
  currentPeriodEnd: string | null;
  loading: boolean;
  canUseFeature: (feature: GatedFeature) => boolean;
  refreshSubscription: () => Promise<void>;
}

export function useSubscription(): SubscriptionData {
  const { user, isAgent, isClient, loading: authLoading } = useAuth();
  const [plan, setPlan] = useState<PlanId>(null);
  const [status, setStatus] = useState<SubscriptionStatus>(null);
  const [isComped, setIsComped] = useState(false);
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const isInternalEmail = user?.email && INTERNAL_EMAILS.includes(user.email);

  // Agents bypass entirely
  const isAgentOnly = isAgent && !isClient;

  const checkSubscription = useCallback(async () => {
    if (!user || authLoading) return;

    // Agents don't have subscriptions
    if (isAgentOnly) {
      setIsComped(true);
      setStatus('comped');
      setPlan('enterprise');
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('check-subscription');
      if (error) throw error;

      setPlan(data.plan_id || null);
      setStatus(data.status || 'no_subscription');
      setIsComped(data.is_comped || false);
      setTrialEndsAt(data.trial_ends_at || null);
      setCurrentPeriodEnd(data.current_period_end || null);
    } catch (err) {
      console.error('Failed to check subscription:', err);
    } finally {
      setLoading(false);
    }
  }, [user, authLoading, isAgentOnly]);

  useEffect(() => {
    checkSubscription();

    // Refresh every 60 seconds
    const interval = setInterval(checkSubscription, 60000);
    return () => clearInterval(interval);
  }, [checkSubscription]);

  const trialDaysLeft = trialEndsAt
    ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const isTrialing = status === 'trialing' && trialDaysLeft > 0;
  const isActive = isAgentOnly || isInternalEmail || isComped || status === 'active' || isTrialing;

  const canUseFeature = useCallback(
    (feature: GatedFeature): boolean => {
      // Bypass for agents, comped, internal accounts, and trialing users
      if (isAgentOnly || isInternalEmail || isComped || isTrialing) return true;

      // Active subscription — check plan tier
      if (status === 'active' && plan) {
        const allowedPlans = FEATURE_PLAN_MAP[feature];
        return allowedPlans.includes(plan);
      }

      // No active subscription — basic features only
      if (status === 'active' && !plan) return false;

      return false;
    },
    [isAgentOnly, isInternalEmail, isComped, isTrialing, status, plan]
  );

  return {
    plan,
    status,
    isTrialing,
    trialDaysLeft,
    isComped,
    isActive,
    currentPeriodEnd,
    loading,
    canUseFeature,
    refreshSubscription: checkSubscription,
  };
}
