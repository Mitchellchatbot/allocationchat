import { MessageSquare, Zap, Building2, LucideIcon } from 'lucide-react';

export interface PricingPlan {
  id: string;
  name: string;
  price: number;
  description: string;
  conversations: string;
  conversationsNum: number;
  icon: LucideIcon;
  popular?: boolean;
  features: string[];
  gradient: string;
  overflow?: string;
  /** Tailwind classes for the card highlight */
  highlightClasses?: string;
  stripePriceId: string;
  stripeProductId: string;
}

export const pricingPlans: PricingPlan[] = [
  {
    id: 'basic',
    name: 'Basic',
    price: 199,
    description: 'Perfect for small treatment centers getting started with AI chat.',
    conversations: '500',
    conversationsNum: 500,
    icon: MessageSquare,
    gradient: 'from-blue-500 to-indigo-600',
    stripePriceId: 'price_1TCPnOD7O8iu0EzywlExAJ9u',
    stripeProductId: 'prod_UAlKXnxdRG1Rgt',
    features: [
      '500 conversations/month',
      'Natural lead capture',
      'Email notifications',
      'Basic analytics',
      'Crisis detection',
      'Standard support',
    ],
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 399,
    popular: true,
    description: 'For growing centers that need advanced AI and team collaboration.',
    conversations: '2,000',
    conversationsNum: 2000,
    icon: Zap,
    gradient: 'from-primary to-orange-500',
    highlightClasses: 'border-orange-300 bg-orange-50/60',
    stripePriceId: 'price_1TCPq9D7O8iu0EzyquB5INzm',
    stripeProductId: 'prod_UAlMpsN43Fccjn',
    features: [
      '2,000 conversations/month',
      'Natural lead capture',
      'Email & Slack notifications',
      'Advanced analytics',
      'Crisis detection & escalation',
      'Salesforce integration',
      'Custom AI prompts',
      'Launcher effects',
      'Priority support',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 799,
    description: 'For large organizations with high volume and custom needs.',
    conversations: '10,000',
    conversationsNum: 10000,
    icon: Building2,
    gradient: 'from-violet-500 to-purple-600',
    highlightClasses: 'border-orange-400 bg-orange-100/60',
    overflow: 'Pay-as-you-go after 10,000 — $0.05 per extra conversation. Never miss a lead.',
    stripePriceId: 'price_1TCPtFD7O8iu0EzyxeGVBE9D',
    stripeProductId: 'prod_UAlQyKMRVwLzDL',
    features: [
      '10,000 conversations/month',
      'Natural lead capture',
      'All notification channels',
      'Full analytics suite',
      'Crisis detection & escalation',
      'Salesforce integration',
      'Custom AI prompts',
      'Launcher effects',
      'Pay-as-you-go overflow',
      'Priority support',
    ],
  },
];

export const comparisonCategories = [
  {
    name: 'Usage',
    features: [
      { name: 'Monthly conversations', basic: '500', professional: '2,000', enterprise: '10,000+' },
      { name: 'Overflow conversations', basic: false, professional: false, enterprise: 'Pay-as-you-go' },
    ],
  },
  {
    name: 'Features',
    features: [
      { name: 'Natural lead capture', basic: true, professional: true, enterprise: true },
      { name: 'Crisis detection', basic: true, professional: true, enterprise: true },
      { name: 'Custom AI prompts', basic: false, professional: true, enterprise: true },
      { name: 'Launcher effects', basic: false, professional: true, enterprise: true },
    ],
  },
  {
    name: 'Integrations',
    features: [
      { name: 'Email notifications', basic: true, professional: true, enterprise: true },
      { name: 'Slack notifications', basic: false, professional: true, enterprise: true },
      { name: 'Salesforce CRM', basic: false, professional: true, enterprise: true },
    ],
  },
  {
    name: 'Support',
    features: [
      { name: 'Standard support', basic: true, professional: true, enterprise: true },
      { name: 'Priority support', basic: false, professional: true, enterprise: true },
    ],
  },
];
