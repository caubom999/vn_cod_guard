import { EmptyState, Page, Text } from '@shopify/polaris';

export default function NotFound() {
  return (
    <Page>
      <EmptyState
        heading="Page not found"
        image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
        action={{ content: 'Go home', url: '/' }}
      >
        <Text as="p">The page you are looking for does not exist.</Text>
      </EmptyState>
    </Page>
  );
}
