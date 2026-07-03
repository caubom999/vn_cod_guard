import { Banner, Layout, Page, Text } from '@shopify/polaris';
import { useRouteError } from 'react-router-dom';

export default function ErrorPage() {
  const error = useRouteError() as Error;

  return (
    <Page title="Something went wrong">
      <Layout>
        <Layout.Section>
          <Banner title="The app could not load this page" tone="critical">
            <Text as="p">
              {error?.message || 'Please refresh the page and try again.'}
            </Text>
          </Banner>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
