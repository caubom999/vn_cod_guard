import { useQuery } from '@tanstack/react-query';
import { useApi } from './api';

export type Shop = {
  id: number;
  domain: string;
  name?: string | null;
  email?: string | null;
  scopes?: string | null;
  installedAt: string;
  updatedAt: string;
};

export function useCurrentShop() {
  const api = useApi();

  return useQuery({
    queryKey: ['shop', 'me'],
    queryFn: () => api<Shop>('/api/shop/me'),
  });
}
