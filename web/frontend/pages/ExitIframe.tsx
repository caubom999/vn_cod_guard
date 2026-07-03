import { useAppBridge } from '@shopify/app-bridge-react';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Banner, Box, Layout, Page } from '@shopify/polaris';

export default function ExitIframe() {
  const app = useAppBridge();
  const { search } = useLocation();
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    app.loading(true);

    return () => {
      app.loading(false);
    };
  }, [app]);

  useEffect(() => {
    if (!app) {
      return;
    }

    if (!search) {
      app.loading(false);
      setShowWarning(true);
      return;
    }

    const params = new URLSearchParams(search);
    const redirectUri = params.get('redirectUri');

    if (!redirectUri) {
      app.loading(false);
      setShowWarning(true);
      return;
    }

    let url: URL;

    try {
      url = new URL(decodeURIComponent(redirectUri));
    } catch {
      app.loading(false);
      setShowWarning(true);
      return;
    }

    if (
      [location.hostname, 'admin.shopify.com'].includes(url.hostname) ||
      url.hostname.endsWith('.myshopify.com')
    ) {
      window.open(url, '_top');
    } else {
      app.loading(false);
      setShowWarning(true);
    }
  }, [app, search, setShowWarning]);

  return showWarning ? (
    <Page narrowWidth>
      <Layout>
        <Layout.Section>
          <Box paddingBlockStart="1600">
            <Banner title="Redirecting outside of Shopify" tone="warning">
              Apps can only use /exitiframe to reach Shopify or the app itself.
            </Banner>
          </Box>
        </Layout.Section>
      </Layout>
    </Page>
  ) : null;
}
