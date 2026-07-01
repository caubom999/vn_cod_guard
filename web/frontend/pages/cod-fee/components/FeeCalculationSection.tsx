import {
  BlockStack,
  Card,
  Checkbox,
  Select,
  Text,
  TextField,
} from '@shopify/polaris';
import type {
  FeeCalculationSectionProps,
  FeeType,
} from '../../../types/cod-fee';

export function FeeCalculationSection({
  draft,
  setField,
  onFeeTypeChange,
  error,
}: FeeCalculationSectionProps) {
  return (
    <Card>
      <BlockStack gap="400">
        <BlockStack gap="100">
          <Text as="h2" variant="headingMd">
            Fee calculation
          </Text>
          <Text as="p" tone="subdued">
            Choose how much customers pay for COD.
          </Text>
        </BlockStack>
        <Select
          label="Fee type"
          options={[
            { label: 'Fixed amount', value: 'fixed' },
            { label: 'Percentage', value: 'percentage' },
          ]}
          value={draft.feeType}
          onChange={(value) => onFeeTypeChange(value as FeeType)}
        />
        <TextField
          label={draft.feeType === 'fixed' ? 'Fee amount' : 'Fee rate'}
          value={draft.feeAmount}
          onChange={(value) => setField('feeAmount', value)}
          type="number"
          min={0}
          autoComplete="off"
          suffix={draft.feeType === 'fixed' ? 'VND' : '%'}
          error={error}
        />
        <Checkbox
          label="Apply only when the payment method is COD"
          checked
          disabled
          helpText="COD payment method names are managed in Settings."
        />
      </BlockStack>
    </Card>
  );
}
