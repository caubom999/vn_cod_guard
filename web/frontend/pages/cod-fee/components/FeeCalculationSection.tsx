import {
  BlockStack,
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
  disabled,
}: FeeCalculationSectionProps) {
  return (
    <BlockStack gap="400">
      <BlockStack gap="100">
        <Checkbox
          label="Enable COD surcharge"
          checked={draft.feeEnabled}
          onChange={(value) => setField('feeEnabled', value)}
          disabled={disabled}
        />
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
        disabled={disabled || !draft.feeEnabled}
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
        disabled={disabled || !draft.feeEnabled}
      />
      <Checkbox
        label="Apply only when the payment method is COD"
        checked
        disabled
        helpText="COD payment method names are managed in Settings."
      />
    </BlockStack>
  );
}
