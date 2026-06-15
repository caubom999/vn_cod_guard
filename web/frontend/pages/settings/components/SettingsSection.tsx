import { BlockStack, InlineGrid, Text } from '@shopify/polaris';
import type { ReactNode } from 'react';

export function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <InlineGrid columns={['oneThird', 'twoThirds']} gap="600">
      <BlockStack gap="100">
        <Text as="h2" variant="headingMd">
          {title}
        </Text>
        <Text as="p" tone="subdued">
          {description}
        </Text>
      </BlockStack>
      {children}
    </InlineGrid>
  );
}
