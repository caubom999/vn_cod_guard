import { Page, Text } from '@shopify/polaris';
import { useRouteError } from 'react-router-dom';

export default function ErrorPage() {
  const error = useRouteError() as Error;

  return (
    <Page title="Something went wrong">
      <Text as="p" tone="critical">
        {error?.message || 'The app could not load this page.'}
      </Text>
    </Page>
  );
}
