import { BlockStack, Button, Card, InlineStack, Text } from '@shopify/polaris';
import type { FeeProductSectionProps } from '../../../types/cod-fee';

export function FeeProductSection({
  feeVariant,
  setField,
}: FeeProductSectionProps) {
  return (
    <Card>
      <BlockStack gap="400">
        <BlockStack gap="100">
          <Text as="h2" variant="headingMd">
            Fee product
          </Text>
          <Text as="p" tone="subdued">
            Select the Shopify product variant used as the COD fee line item.
          </Text>
        </BlockStack>
        {feeVariant ? (
          <InlineStack align="space-between" blockAlign="center" gap="300">
            <BlockStack gap="100">
              <Text as="p" fontWeight="semibold">
                {feeVariant}
              </Text>
              <Text as="p" tone="subdued">
                Product variant
              </Text>
            </BlockStack>
            <Button onClick={() => setField('feeVariant', '')}>Change</Button>
          </InlineStack>
        ) : (
          <InlineStack align="start">
            <Button onClick={() => setField('feeVariant', 'COD fee')}>
              Select COD fee product variant
            </Button>
          </InlineStack>
        )}
      </BlockStack>
    </Card>
  );
}
