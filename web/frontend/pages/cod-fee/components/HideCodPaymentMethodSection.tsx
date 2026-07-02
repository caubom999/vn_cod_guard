import {
  Badge,
  BlockStack,
  Button,
  Card,
  Checkbox,
  InlineGrid,
  InlineStack,
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
  isDirty,
  isLoading,
  isSaving,
  isSaved,
  onSave,
}: HideCodPaymentMethodSectionProps) {
  const update = <K extends keyof typeof draft>(
    key: K,
    value: (typeof draft)[K],
  ) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  return (
    <Card>
      <BlockStack gap="400">
        <InlineStack align="space-between" blockAlign="center" gap="400">
          <BlockStack gap="100">
            <Text as="h2" variant="headingMd">
              Hide cash on delivery based on the order total
            </Text>
            <Text as="p" tone="subdued">
              Hide the COD payment method in the Payment section when the order
              total is outside your allowed range.
            </Text>
          </BlockStack>
          <Checkbox
            label="Enable rule"
            checked={draft.enabled}
            onChange={(value) => update('enabled', value)}
            disabled={isLoading}
          />
        </InlineStack>

        {isLoading ? (
          <SkeletonBodyText lines={4} />
        ) : (
          <>
            <TextField
              label="Payment method name"
              value={draft.paymentMethodName}
              onChange={(value) => update('paymentMethodName', value)}
              autoComplete="off"
              disabled={!draft.enabled}
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
                disabled={!draft.enabled}
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
                disabled={!draft.enabled}
                error={limitError}
              />
            </InlineGrid>

            <InlineStack align="space-between" blockAlign="center" gap="300">
              <Text as="p" tone="subdued">
                This rule targets the payment method, not the COD shipping rate.
              </Text>
              <InlineStack gap="300" blockAlign="center">
                {isSaved && !isDirty ? (
                  <Badge tone="success">Saved to Shopify</Badge>
                ) : null}
                <Button
                  variant="primary"
                  disabled={!isDirty || Boolean(nameError || limitError)}
                  loading={isSaving}
                  onClick={onSave}
                >
                  Save payment rule
                </Button>
              </InlineStack>
            </InlineStack>
          </>
        )}
      </BlockStack>
    </Card>
  );
}
