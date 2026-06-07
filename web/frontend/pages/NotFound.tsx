import { EmptyState, Page } from '@shopify/polaris';

export default function NotFound() {
  return (
    <Page>
      <EmptyState heading="Page not found" action={{ content: 'Go home', url: '/' }}>
        <p>The page you are looking for does not exist.</p>
      </EmptyState>
    </Page>
  );
}
