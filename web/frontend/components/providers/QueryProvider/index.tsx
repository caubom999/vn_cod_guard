import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './query-client';

interface IQueryProviderProps {
  children?: React.ReactNode;
}

/**
 * Sets up the QueryClientProvider from react-query.
 * @desc See: https://react-query.tanstack.com/reference/QueryClientProvider#_top
 */
export default function QueryProvider({ children }: IQueryProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
