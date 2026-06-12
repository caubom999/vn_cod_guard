import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from './api';

export type BillingPlanKey = 'FREE' | 'STARTER' | 'GROWTH' | 'PRO';

export type BillingPlan = {
  key: BillingPlanKey;
  name: string;
  displayName: string;
  priceUsd: number;
  monthlyCodOrderLimit: number;
  trialDays: number;
  features: string[];
};

export type BillingSubscription = {
  id: number;
  shopId: number;
  planKey: BillingPlanKey;
  status:
    | 'ACTIVE'
    | 'PENDING'
    | 'CANCELLED'
    | 'DECLINED'
    | 'EXPIRED'
    | 'FROZEN';
  shopifySubscriptionGid?: string | null;
  confirmationUrl?: string | null;
  trialEndsAt?: string | null;
  currentPeriodStartedAt?: string | null;
  currentPeriodEndsAt?: string | null;
  cancelledAt?: string | null;
};

export type BillingUsage = {
  periodStart: string;
  periodEnd: string;
  codOrdersUsed: number;
  monthlyCodOrderLimit: number;
  remainingCodOrders: number;
  limitReached: boolean;
  warning: boolean;
};

export type BillingSummary = {
  plans: BillingPlan[];
  subscription: BillingSubscription;
  currentPlan: BillingPlan;
  usage: BillingUsage;
  billingTest: boolean;
};

export function useBillingSummary() {
  const api = useApi();

  return useQuery({
    queryKey: ['billing-summary'],
    queryFn: () => api<BillingSummary>('/api/billing/summary'),
  });
}

export function useSubscribeBillingPlan() {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (planKey: BillingPlanKey) =>
      api<{ confirmationUrl: string; subscription: BillingSubscription }>(
        '/api/billing/subscribe',
        {
          method: 'POST',
          body: JSON.stringify({ planKey }),
        },
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['billing-summary'] }),
  });
}

export function useSelectFreePlan() {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      api<BillingSubscription>('/api/billing/select-free', { method: 'POST' }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['billing-summary'] }),
  });
}

export function useSyncBilling() {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      api<BillingSubscription>('/api/billing/sync', { method: 'POST' }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['billing-summary'] }),
  });
}
