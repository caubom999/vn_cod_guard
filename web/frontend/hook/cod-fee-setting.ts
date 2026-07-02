import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CodFeeSetting, UpdateCodFeeSetting } from '../types/cod-fee';
import { useApi } from './api';

export function useCodFeeSetting() {
  const api = useApi();

  return useQuery({
    queryKey: ['cod-fee-setting'],
    queryFn: () => api<CodFeeSetting>('/api/cod/fee-setting'),
  });
}

export function useUpdateCodFeeSetting() {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (setting: UpdateCodFeeSetting) =>
      api<CodFeeSetting>('/api/cod/fee-setting', {
        method: 'PUT',
        body: JSON.stringify(setting),
      }),
    onSuccess: (setting) => {
      queryClient.setQueryData(['cod-fee-setting'], setting);
    },
  });
}
