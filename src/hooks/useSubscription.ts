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
  return {
    plan: 'enterprise',
    status: 'active',
    isTrialing: false,
    trialDaysLeft: 0,
    isComped: true,
    isActive: true,
    currentPeriodEnd: null,
    loading: false,
    canUseFeature: () => true,
    refreshSubscription: async () => {},
  };
}
