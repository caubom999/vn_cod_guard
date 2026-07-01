import { BlockStack, Card, Text, TextField } from '@shopify/polaris';
import type { FeeConditionsSectionProps } from '../../../types/cod-fee';

export function FeeConditionsSection({
  draft,
  setField,
}: FeeConditionsSectionProps) {
  return (
    <Card>
      <BlockStack gap="400">
        <BlockStack gap="100">
          <Text as="h2" variant="headingMd">
            Apply when
          </Text>
          <Text as="p" tone="subdued">
            Leave a field empty to apply the fee to all matching orders.
          </Text>
        </BlockStack>
        <TextField
          label="Minimum order total"
          value={draft.minimumOrderAmount}
          onChange={(value) => setField('minimumOrderAmount', value)}
          type="number"
          min={0}
          autoComplete="off"
          suffix="VND"
          placeholder="No minimum"
        />
        <TextField
          label="Province or city"
          value={draft.provinces}
          onChange={(value) => setField('provinces', value)}
          autoComplete="off"
          placeholder="All provinces and cities"
          helpText="Separate multiple locations with commas."
        />
        <TextField
          label="Exclude customer tags"
          value={draft.excludedCustomerTags}
          onChange={(value) => setField('excludedCustomerTags', value)}
          autoComplete="off"
          placeholder="vip, wholesale"
          helpText="Customers with any matching tag will not be charged."
        />
      </BlockStack>
    </Card>
  );
}
