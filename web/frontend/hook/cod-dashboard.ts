import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from './api';

export type CodOrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'CANCELLED_BY_CUSTOMER'
  | 'EXPIRED'
  | 'NEEDS_REVIEW'
  | 'SKIPPED';

export type Overview = {
  counts: {
    totalCodOrders: number;
    pending: number;
    confirmed: number;
    cancelled: number;
    expired: number;
    risky: number;
  };
  metrics: {
    confirmationRate: number;
    noResponseRate: number;
    cancelledByCustomer: number;
    estimatedShippingCostSaved: number;
    riskOrdersPrevented: number;
    actionableOrders: number;
  };
};

export type CodOrderSummary = {
  id: number;
  orderName?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  totalAmount?: string | number | null;
  currency?: string | null;
  status: CodOrderStatus;
  riskScore: number;
  riskReasonJson?: unknown;
  reminderCount: number;
  expiresAt?: string | null;
  createdAt: string;
};

export type CodOrderDetail = CodOrderSummary & {
  shopifyOrderGid: string;
  orderNumber?: string | null;
  paymentMethod?: string | null;
  financialStatus?: string | null;
  fulfillmentStatus?: string | null;
  normalizedPhone?: string | null;
  shippingProvince?: string | null;
  shippingCity?: string | null;
  shippingDistrict?: string | null;
  lineItemsJson?: unknown;
  verifiedAt?: string | null;
  cancelledAt?: string | null;
  sessions: Array<{
    id: number;
    channel: string;
    status: string;
    expiresAt: string;
    lastSentAt?: string | null;
    createdAt: string;
    deliveries: Array<{
      id: number;
      provider?: string | null;
      recipient: string;
      status: string;
      error?: string | null;
      subject?: string | null;
      sentAt?: string | null;
      createdAt: string;
    }>;
  }>;
  events: Array<{
    id: number;
    type: string;
    message?: string | null;
    createdAt: string;
  }>;
  jobs: Array<{
    id: number;
    type: string;
    status: string;
    runAt: string;
    attempts: number;
    lastError?: string | null;
  }>;
};

export type MessageTemplate = {
  id: number;
  type: string;
  channel: string;
  locale: string;
  templateKey?: string | null;
  subject?: string | null;
  body: string;
  enabled: boolean;
};

export type RiskRule = {
  id: number;
  name: string;
  enabled: boolean;
  priority: number;
  conditionJson: unknown;
  actionJson: unknown;
};

export type BlacklistEntry = {
  id: number;
  type: 'PHONE' | 'EMAIL' | 'ADDRESS';
  value: string;
  normalizedValue: string;
  reason?: string | null;
  hitCount: number;
  lastSeenAt?: string | null;
  updatedAt: string;
};

export type BlacklistScoringSettings = {
  blacklistPhoneEnabled: boolean;
  blacklistPhoneScore: number;
  blacklistEmailEnabled: boolean;
  blacklistEmailScore: number;
  blacklistAddressEnabled: boolean;
  blacklistAddressScore: number;
};

export function useCodOverview() {
  const api = useApi();

  return useQuery({
    queryKey: ['cod-overview'],
    queryFn: () => api<Overview>('/api/cod/dashboard/overview'),
  });
}

export function useCodOrders(status?: string, search?: string) {
  const api = useApi();

  return useQuery({
    queryKey: ['cod-orders', status || 'ALL', search || ''],
    queryFn: () =>
      api<CodOrderSummary[]>(
        '/api/cod/orders?' +
          new URLSearchParams({
            ...(status ? { status } : {}),
            ...(search ? { search } : {}),
            limit: '100',
          }).toString(),
      ),
  });
}

export function useCodOrderDetail(id?: number | null) {
  const api = useApi();

  return useQuery({
    queryKey: ['cod-order-detail', id],
    enabled: Boolean(id),
    queryFn: () => api<CodOrderDetail>('/api/cod/orders/' + id),
  });
}

export function useMessageTemplates() {
  const api = useApi();

  return useQuery({
    queryKey: ['message-templates'],
    queryFn: () => api<MessageTemplate[]>('/api/cod/message-templates'),
  });
}

export function useUpdateMessageTemplate() {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      id: number;
      subject?: string | null;
      body?: string;
      enabled?: boolean;
      templateKey?: string;
    }) =>
      api<MessageTemplate>('/api/cod/message-templates/' + input.id, {
        method: 'PUT',
        body: JSON.stringify(input),
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['message-templates'] }),
  });
}

export function useRiskRules() {
  const api = useApi();

  return useQuery({
    queryKey: ['risk-rules'],
    queryFn: () => api<RiskRule[]>('/api/cod/risk/rules'),
  });
}

export function useUpdateRiskRule() {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      ...updates
    }: {
      id: number;
      enabled: boolean;
      conditionJson: unknown;
      actionJson: unknown;
    }) =>
      api<RiskRule>('/api/cod/risk/rules/' + id, {
        method: 'PUT',
        body: JSON.stringify(updates),
      }),
    onSuccess: (updatedRule) => {
      queryClient.setQueryData<RiskRule[]>(['risk-rules'], (rules = []) =>
        rules.map((rule) =>
          rule.id === updatedRule.id ? updatedRule : rule,
        ),
      );
    },
  });
}

export function useBlacklist() {
  const api = useApi();

  return useQuery({
    queryKey: ['blacklist'],
    queryFn: () => api<BlacklistEntry[]>('/api/cod/risk/blacklist'),
  });
}

export function useBlacklistScoring() {
  const api = useApi();

  return useQuery({
    queryKey: ['blacklist-scoring'],
    queryFn: () =>
      api<BlacklistScoringSettings>('/api/cod/risk/blacklist-scoring'),
  });
}

export function useUpdateBlacklistScoring() {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (settings: BlacklistScoringSettings) =>
      api<BlacklistScoringSettings>('/api/cod/risk/blacklist-scoring', {
        method: 'PUT',
        body: JSON.stringify(settings),
      }),
    onSuccess: (settings) => {
      queryClient.setQueryData(['blacklist-scoring'], settings);
    },
  });
}

export function useCreateBlacklistEntry() {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { type: string; value: string; reason?: string }) =>
      api<BlacklistEntry>('/api/cod/risk/blacklist', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['blacklist'] }),
  });
}

export function useDeleteBlacklistEntry() {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) =>
      api<BlacklistEntry>('/api/cod/risk/blacklist/' + id, {
        method: 'DELETE',
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['blacklist'] }),
  });
}
