import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CodCollection,
  CodPaymentMethod,
  CodPaymentRule,
  CodProduct,
  UpdateCodPaymentRule,
} from '../types/cod-fee';
import { useApi } from './api';

export function useCodPaymentRule() {
  const api = useApi();

  return useQuery({
    queryKey: ['cod-payment-rule'],
    queryFn: () => api<CodPaymentRule>('/api/cod/payment-rule'),
  });
}

export function useCodPaymentMethods() {
  const api = useApi();

  return useQuery({
    queryKey: ['cod-payment-methods'],
    queryFn: () =>
      api<{ methods: CodPaymentMethod[] }>('/api/cod/payment-rule/methods'),
  });
}

export function useCodProducts(ids: string[]) {
  const api = useApi();

  return useQuery({
    queryKey: ['cod-products', ids],
    queryFn: () =>
      api<{ products: CodProduct[] }>('/api/cod/payment-rule/products', {
        method: 'POST',
        body: JSON.stringify({ ids }),
      }),
    enabled: ids.length > 0,
  });
}

export function useCodCollections(ids: string[]) {
  const api = useApi();

  return useQuery({
    queryKey: ['cod-collections', ids],
    queryFn: () =>
      api<{ collections: CodCollection[] }>(
        '/api/cod/payment-rule/collections',
        {
          method: 'POST',
          body: JSON.stringify({ ids }),
        },
      ),
    enabled: ids.length > 0,
  });
}

export function useUpdateCodPaymentRule() {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (rule: UpdateCodPaymentRule) =>
      api<CodPaymentRule>('/api/cod/payment-rule', {
        method: 'PUT',
        body: JSON.stringify(rule),
      }),
    onSuccess: (rule) => {
      queryClient.setQueryData(['cod-payment-rule'], rule);
    },
  });
}
