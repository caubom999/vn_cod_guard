import { Banner, type BannerProps } from '@shopify/polaris';
import { isFunction } from 'lodash-es';
import { useCallback, useState } from 'react';
import { useSessionStorage } from '../../../hook/useSessionStorage';

export enum ESessionStorageKeys {
  SSK_WIDGET_BANNER = 'SSK_WIDGET_BANNER',
  SSK_PRODUCT_BANNER = 'SSK_PRODUCT_BANNER',
  SSK_FAQ_MORE_PAGE_BANNER = 'SSK_FAQ_MORE_PAGE_BANNER',
  SSK_CREATE_SUCCESS = 'SSK_CREATE_SUCCESS',
}

enum EBannerStatus {
  VISIBLE,
  HIDDEN,
}

interface IBannerWithDismissProps extends BannerProps {
  sessionKey: ESessionStorageKeys;
}

export function BannerWithDismiss({
  sessionKey,
  children,
  onDismiss,
  ...restProps
}: IBannerWithDismissProps) {
  const { setItem, getItem } = useSessionStorage();
  const [isShow, setIsShow] = useState(() => {
    const value = getItem(sessionKey);
    if (!value) {
      return true;
    }

    return Number(value) === EBannerStatus.VISIBLE;
  });

  const handleDismiss = useCallback(() => {
    setItem(sessionKey, `${EBannerStatus.HIDDEN}`);
    isFunction(onDismiss) && onDismiss();
    setIsShow(false);
  }, [onDismiss, sessionKey, setItem]);

  return isShow ? (
    <div className="mb-4">
      <Banner {...restProps} onDismiss={handleDismiss}>
        {children}
      </Banner>
    </div>
  ) : null;
}
