import { EmptyState, Page } from '@shopify/polaris';

export default function NotFound() {
  return (
    <Page>
      <EmptyState
        heading="Page not found"
        image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
        action={{ content: 'Go home', url: '/' }}
      >
        <p>The page you are looking for does not exist.</p>
      </EmptyState>
    </Page>
  );
}
