import { AppProvider } from '@shopify/polaris';
import { useCallback } from 'react';
import '@shopify/polaris/build/esm/styles.css';
import type { LinkLikeComponentProps } from '@shopify/polaris/build/ts/src/utilities/link';
import polarisTranslations from '@shopify/polaris/locales/en.json';
import { useNavigate } from 'react-router-dom';

function AppBridgeLink({
  url,
  children,
  external,
  ...rest
}: LinkLikeComponentProps) {
  const navigate = useNavigate();
  const handleClick = useCallback(() => {
    navigate(url);
  }, [navigate, url]);

  const IS_EXTERNAL_LINK_REGEX = /^(?:[a-z][a-z\d+.-]*:|\/\/)/;

  if (external || IS_EXTERNAL_LINK_REGEX.test(url)) {
    return (
      <a {...rest} href={url} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  }

  return (
    <a {...rest} onClick={handleClick}>
      {children}
    </a>
  );
}

/**
 * Sets up the AppProvider from Polaris.
 * @desc PolarisProvider passes a custom link component to Polaris.
 * The Link component handles navigation within an embedded app.
 * Prefer using this vs any other method such as an anchor.
 * Use it by importing Link from Polaris, e.g:
 *
 * ```
 * import {Link} from '@shopify/polaris'
 *
 * function MyComponent() {
 *  return (
 *    <div><Link url="/tab2">Tab 2</Link></div>
 *  )
 * }
 * ```
 *
 * PolarisProvider also passes translations to Polaris.
 *
 */
export function PolarisProvider({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider i18n={polarisTranslations} linkComponent={AppBridgeLink}>
      {children}
    </AppProvider>
  );
}
