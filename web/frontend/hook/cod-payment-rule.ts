import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CodPaymentRule, UpdateCodPaymentRule } from '../types/cod-fee';
import { useApi } from './api';

export function useCodPaymentRule() {
  const api = useApi();

  return useQuery({
    queryKey: ['cod-payment-rule'],
    queryFn: () => api<CodPaymentRule>('/api/cod/payment-rule'),
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
