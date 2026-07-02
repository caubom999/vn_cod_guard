import {
  BlockStack,
  Checkbox,
  Collapsible,
  InlineGrid,
  SkeletonBodyText,
  Text,
  TextField,
} from '@shopify/polaris';
import type { HideCodPaymentMethodSectionProps } from '../../../types/cod-fee';

export function HideCodPaymentMethodSection({
  draft,
  setDraft,
  nameError,
  limitError,
  isLoading,
}: HideCodPaymentMethodSectionProps) {
  const update = <K extends keyof typeof draft>(
    key: K,
    value: (typeof draft)[K],
  ) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  return (
    <BlockStack gap="300">
      <Checkbox
        label="Hide cash on delivery based on the order total"
        checked={draft.enabled}
        onChange={(value) => update('enabled', value)}
        disabled={isLoading}
      />

      {isLoading ? (
        <SkeletonBodyText lines={3} />
      ) : (
        <Collapsible
          open={draft.enabled}
          id="cod-payment-order-total-settings"
          transition={{ duration: '200ms', timingFunction: 'ease-in-out' }}
        >
          <BlockStack gap="400">
            <Text as="p" tone="subdued">
              Hide the COD payment method in the Payment section when the order
              total is outside your allowed range.
            </Text>
            <TextField
              label="Payment method name"
              value={draft.paymentMethodName}
              onChange={(value) => update('paymentMethodName', value)}
              autoComplete="off"
              helpText="Enter the exact name shown in the Payment section at checkout."
              error={nameError}
            />

            <InlineGrid columns={{ xs: 1, md: 2 }} gap="400">
              <TextField
                label="Hide when order total is less than"
                value={draft.hideBelowOrderTotal}
                onChange={(value) => update('hideBelowOrderTotal', value)}
                type="number"
                min={0}
                autoComplete="off"
                suffix="VND"
                placeholder="No lower limit"
              />
              <TextField
                label="Hide when order total is greater than"
                value={draft.hideAboveOrderTotal}
                onChange={(value) => update('hideAboveOrderTotal', value)}
                type="number"
                min={0}
                autoComplete="off"
                suffix="VND"
                placeholder="No upper limit"
                error={limitError}
              />
            </InlineGrid>

            <Text as="p" tone="subdued">
              This rule targets the payment method, not the COD shipping rate.
            </Text>
          </BlockStack>
        </Collapsible>
      )}
    </BlockStack>
  );
}
