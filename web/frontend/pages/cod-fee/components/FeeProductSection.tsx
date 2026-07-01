import { BlockStack, Card, Text, TextField } from '@shopify/polaris';
import type { FeeProductSectionProps } from '../../../types/cod-fee';

export function FeeProductSection({
  lineItemTitle,
  setField,
  error,
  disabled,
}: FeeProductSectionProps) {
  return (
    <Card>
      <BlockStack gap="400">
        <BlockStack gap="100">
          <Text as="h2" variant="headingMd">
            Fee line item
          </Text>
          <Text as="p" tone="subdued">
            This custom item is added to the Shopify order with the calculated
            fee amount.
          </Text>
        </BlockStack>
        <TextField
          label="Line item title"
          value={lineItemTitle}
          onChange={(value) => setField('lineItemTitle', value)}
          autoComplete="off"
          placeholder="COD fee"
          helpText="Customers will see this title in the updated order."
          error={error}
          disabled={disabled}
        />
      </BlockStack>
    </Card>
  );
}
