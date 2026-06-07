import { useAppBridge } from '@shopify/app-bridge-react';
import { useCallback } from 'react';

declare global {
  interface Window {
    shopify?: {
      idToken?: () => Promise<string>;
    };
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export function useApi() {
  const app = useAppBridge();

  const getSessionToken = useCallback(async () => {
    const appBridge = app as unknown as { idToken?: () => Promise<string> };
    const token = await (appBridge.idToken?.() || window.shopify?.idToken?.());

    if (!token) {
      throw new ApiError('Unable to get Shopify session token', 401);
    }

    return token;
  }, [app]);

  return useCallback(
    async <T>(url: string, init: RequestInit = {}) => {
      const token = await getSessionToken();
      const headers = new Headers(init.headers);

      headers.set('Content-Type', 'application/json');
      headers.set('Authorization', `Bearer ${token}`);

      const response = await fetch(url, {
        ...init,
        headers,
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new ApiError(body?.message || response.statusText, response.status);
      }

      return response.json() as Promise<T>;
    },
    [getSessionToken],
  );
}
