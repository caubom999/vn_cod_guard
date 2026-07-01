import {
  BlockStack,
  Card,
  Checkbox,
  InlineGrid,
  InlineStack,
  Text,
  TextField,
} from '@shopify/polaris';
import type { HideCodShippingMethodSectionProps } from '../../../types/cod-fee';

export function HideCodShippingMethodSection({
  draft,
  setField,
  error,
}: HideCodShippingMethodSectionProps) {
  return (
    <Card>
      <BlockStack gap="400">
        <InlineStack align="space-between" blockAlign="center" gap="400">
          <BlockStack gap="100">
            <Text as="h2" variant="headingMd">
              Hide COD shipping method
            </Text>
            <Text as="p" tone="subdued">
              Hide the COD delivery option at checkout when the order total is
              outside your allowed range.
            </Text>
          </BlockStack>
          <Checkbox
            label="Enable rule"
            checked={draft.hideCodShippingMethod}
            onChange={(value) => setField('hideCodShippingMethod', value)}
          />
        </InlineStack>

        <TextField
          label="Shipping method name"
          value={draft.codShippingMethodName}
          onChange={(value) => setField('codShippingMethodName', value)}
          autoComplete="off"
          disabled={!draft.hideCodShippingMethod}
          helpText="Enter the exact name shown at checkout."
        />

        <InlineGrid columns={{ xs: 1, md: 2 }} gap="400">
          <TextField
            label="Hide when order total is less than"
            value={draft.hideBelowOrderTotal}
            onChange={(value) => setField('hideBelowOrderTotal', value)}
            type="number"
            min={0}
            autoComplete="off"
            suffix="VND"
            placeholder="No lower limit"
            disabled={!draft.hideCodShippingMethod}
          />
          <TextField
            label="Hide when order total is greater than"
            value={draft.hideAboveOrderTotal}
            onChange={(value) => setField('hideAboveOrderTotal', value)}
            type="number"
            min={0}
            autoComplete="off"
            suffix="VND"
            placeholder="No upper limit"
            disabled={!draft.hideCodShippingMethod}
            error={error}
          />
        </InlineGrid>

        <Text as="p" tone="subdued">
          Leave either limit empty if you only need one condition.
        </Text>
      </BlockStack>
    </Card>
  );
}
