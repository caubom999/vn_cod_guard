import {
  BlockStack,
  Box,
  Checkbox,
  Collapsible,
  Divider,
  InlineGrid,
  SkeletonBodyText,
  Text,
  TextField,
} from '@shopify/polaris';
import type { HideCodPaymentMethodSectionProps } from '../../../types/cod-fee';

export function HideCodPaymentMethodSection({
  draft,
  setDraft,
  limitError,
  discountAmountError,
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
        label="Hide COD payment based on the order total"
        checked={draft.hideByOrderTotal}
        onChange={(value) => update('hideByOrderTotal', value)}
        disabled={isLoading}
      />

      {isLoading ? (
        <SkeletonBodyText lines={3} />
      ) : (
        <Collapsible
          open={draft.hideByOrderTotal}
          id="cod-payment-order-total-settings"
          transition={{ duration: '200ms', timingFunction: 'ease-in-out' }}
        >
          <BlockStack gap="400">
            <Text as="p" tone="subdued">
              Hide the COD payment method in the Payment section when the order
              total is outside your allowed range.
            </Text>
            <InlineGrid columns={{ xs: 1, md: 2 }} gap="400">
              <TextField
                label="Minimum order total"
                value={draft.hideBelowOrderTotal}
                onChange={(value) => update('hideBelowOrderTotal', value)}
                type="number"
                min={0}
                autoComplete="off"
                suffix="VND"
                placeholder="No lower limit"
              />
              <TextField
                label="Maximum order total"
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
          </BlockStack>
        </Collapsible>
      )}

      <Divider />

      <Checkbox
        label="Hide COD payment if the order has discounts"
        checked={draft.hideDiscountedOrders}
        onChange={(value) => update('hideDiscountedOrders', value)}
        disabled={isLoading}
      />
      <Collapsible
        open={draft.hideDiscountedOrders}
        id="cod-payment-discount-settings"
        transition={{ duration: '200ms', timingFunction: 'ease-in-out' }}
      >
        <Box
          background="bg-surface-secondary"
          borderRadius="200"
          padding="300"
          maxWidth="360px"
        >
          <BlockStack gap="200">
            <Text as="p">
              COD will be hidden if the discount amount on the order is greater
              than:
            </Text>
            <TextField
              label="Minimum discount amount"
              labelHidden
              prefix="VND"
              value={draft.minimumDiscountAmount}
              onChange={(value) => update('minimumDiscountAmount', value)}
              type="number"
              min={0}
              autoComplete="off"
              error={discountAmountError}
              disabled={isLoading}
            />
            <Text as="p" variant="bodySm" tone="subdued">
              <strong>Important:</strong> use this option only if your prices
              include taxes. If taxes are excluded from your prices, disable
              this option.
            </Text>
          </BlockStack>
        </Box>
      </Collapsible>
    </BlockStack>
  );
}
