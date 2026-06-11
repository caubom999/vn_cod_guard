import { useCallback } from 'react';

export function useSessionStorage() {
  const getItem = useCallback((key: string) => {
    if (typeof window === 'undefined') {
      return null;
    }

    return window.sessionStorage.getItem(key);
  }, []);

  const setItem = useCallback((key: string, value: string) => {
    if (typeof window === 'undefined') {
      return;
    }

    window.sessionStorage.setItem(key, value);
  }, []);

  const removeItem = useCallback((key: string) => {
    if (typeof window === 'undefined') {
      return;
    }

    window.sessionStorage.removeItem(key);
  }, []);

  return { getItem, setItem, removeItem };
}
