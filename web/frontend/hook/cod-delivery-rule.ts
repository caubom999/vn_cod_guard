import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CodShippingMethod } from '../types/cod-fee';
import { useApi } from './api';

export type CodDeliveryRule = {
  id: number;
  shopId: number;
  enabled: boolean;
  shippingMethodName: string;
  hideBelowOrderTotal: number | null;
  hideAboveOrderTotal: number | null;
  shopifyConfigured: boolean;
  updatedAt: string;
};

export type UpdateCodDeliveryRule = Pick<
  CodDeliveryRule,
  | 'enabled'
  | 'shippingMethodName'
  | 'hideBelowOrderTotal'
  | 'hideAboveOrderTotal'
>;

export function useCodDeliveryRule() {
  const api = useApi();

  return useQuery({
    queryKey: ['cod-delivery-rule'],
    queryFn: () => api<CodDeliveryRule>('/api/cod/delivery-rule'),
  });
}

export function useCodShippingMethods() {
  const api = useApi();

  return useQuery({
    queryKey: ['cod-shipping-methods'],
    queryFn: () =>
      api<{ methods: CodShippingMethod[] }>('/api/cod/delivery-rule/methods'),
  });
}

export function useUpdateCodDeliveryRule() {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (rule: UpdateCodDeliveryRule) =>
      api<CodDeliveryRule>('/api/cod/delivery-rule', {
        method: 'PUT',
        body: JSON.stringify(rule),
      }),
    onSuccess: (rule) => {
      queryClient.setQueryData(['cod-delivery-rule'], rule);
    },
  });
}
