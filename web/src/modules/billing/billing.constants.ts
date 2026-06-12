import { BillingPlanKey } from '@prisma/client';

export type BillingPlanDefinition = {
  key: BillingPlanKey;
  name: string;
  displayName: string;
  priceUsd: number;
  monthlyCodOrderLimit: number;
  trialDays: number;
  features: string[];
};

export const BILLING_PLANS: Record<BillingPlanKey, BillingPlanDefinition> = {
  FREE: {
    key: BillingPlanKey.FREE,
    name: 'VN-Cod-Guard Free',
    displayName: 'Free',
    priceUsd: 0,
    monthlyCodOrderLimit: 50,
    trialDays: 0,
    features: ['50 COD orders/month', 'Email verification', 'Basic risk rules'],
  },
  STARTER: {
    key: BillingPlanKey.STARTER,
    name: 'VN-Cod-Guard Starter',
    displayName: 'Starter',
    priceUsd: 9,
    monthlyCodOrderLimit: 500,
    trialDays: 14,
    features: [
      '500 COD orders/month',
      'Email verification',
      'Reminder automation',
    ],
  },
  GROWTH: {
    key: BillingPlanKey.GROWTH,
    name: 'VN-Cod-Guard Growth',
    displayName: 'Growth',
    priceUsd: 19,
    monthlyCodOrderLimit: 2000,
    trialDays: 14,
    features: [
      '2,000 COD orders/month',
      'Advanced risk rules',
      'Blacklist automation',
    ],
  },
  PRO: {
    key: BillingPlanKey.PRO,
    name: 'VN-Cod-Guard Pro',
    displayName: 'Pro',
    priceUsd: 39,
    monthlyCodOrderLimit: 10000,
    trialDays: 14,
    features: [
      '10,000 COD orders/month',
      'High-volume automation',
      'Priority operations',
    ],
  },
};

export const BILLING_LIMIT_WARNING_RATIO = 0.8;
