import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from './api';

export type SmsProviderOption = {
  id: 'twilio' | 'esms';
  name: string;
  description: string;
  availability: 'available' | 'coming-soon';
  badge?: 'new';
};

export type SmsIntegration = {
  provider: 'twilio' | 'esms';
  enabled: boolean;
  configured: boolean;
  readyForLiveDelivery: boolean;
  from: string;
  brandname: string;
  hasAccountSid: boolean;
  hasAuthToken: boolean;
  hasApiKey: boolean;
  hasSecretKey: boolean;
  billingOwner: 'merchant' | 'platform';
  updatedAt: string;
  providers: SmsProviderOption[];
};

export type UpdateSmsIntegration = {
  provider: 'twilio' | 'esms';
  enabled: boolean;
  from?: string;
  accountSid?: string;
  authToken?: string;
  apiKey?: string;
  secretKey?: string;
  brandname?: string;
};

export function useSmsIntegration() {
  const api = useApi();
  return useQuery({
    queryKey: ['sms-integration'],
    queryFn: () => api<SmsIntegration>('/api/cod/integrations/sms'),
  });
}

export function useUpdateSmsIntegration() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateSmsIntegration) =>
      api<SmsIntegration>('/api/cod/integrations/sms', {
        method: 'PUT',
        body: JSON.stringify(input),
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(['sms-integration'], data);
      void queryClient.invalidateQueries({ queryKey: ['cod-settings'] });
    },
  });
}

export function useTestSmsIntegration() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api<{
        ok: true;
        provider: string;
        balance?: number;
        registeredTemplateCount?: number;
        registeredNetworks?: string[];
      }>('/api/cod/integrations/sms/test', { method: 'POST' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['sms-integration'] });
      void queryClient.invalidateQueries({ queryKey: ['cod-settings'] });
    },
  });
}

export function useDisconnectSmsIntegration() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api<SmsIntegration>('/api/cod/integrations/sms', { method: 'DELETE' }),
    onSuccess: (data) => {
      queryClient.setQueryData(['sms-integration'], data);
      void queryClient.invalidateQueries({ queryKey: ['cod-settings'] });
    },
  });
}
