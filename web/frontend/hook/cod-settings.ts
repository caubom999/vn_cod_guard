import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from './api';

export type CodSettings = {
  id: number;
  shopId: number;
  enabled: boolean;
  defaultChannel: 'EMAIL' | 'SMS' | 'WHATSAPP';
  confirmationDeadlineMinutes: number;
  reminderDelayMinutes: number;
  maxReminders: number;
  autoCancelUnconfirmed: boolean;
  pendingTag: string;
  confirmedTag: string;
  cancelledTag: string;
  expiredTag: string;
  riskTag: string;
  codPaymentNames: string[];
  availableChannels: Array<'EMAIL' | 'SMS' | 'WHATSAPP'>;
};

export type UpdateCodSettings = Omit<
  CodSettings,
  'id' | 'shopId' | 'availableChannels'
>;

export function useCodSettings() {
  const api = useApi();

  return useQuery({
    queryKey: ['cod-settings'],
    queryFn: () => api<CodSettings>('/api/cod/settings'),
  });
}

export function useUpdateCodSettings() {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (settings: UpdateCodSettings) =>
      api<CodSettings>('/api/cod/settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
      }),
    onSuccess: (settings) => {
      queryClient.setQueryData(['cod-settings'], settings);
    },
  });
}
