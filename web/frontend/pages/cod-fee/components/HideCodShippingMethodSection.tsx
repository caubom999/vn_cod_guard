import {
  BlockStack,
  Badge,
  Button,
  Card,
  Checkbox,
  InlineGrid,
  InlineStack,
  SkeletonBodyText,
  Text,
  TextField,
} from '@shopify/polaris';
import type { HideCodShippingMethodSectionProps } from '../../../types/cod-fee';

export function HideCodShippingMethodSection({
  draft,
  setField,
  nameError,
  limitError,
  isDirty,
  isLoading,
  isSaving,
  isSaved,
  onSave,
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
            disabled={isLoading}
          />
        </InlineStack>

        {isLoading ? (
          <SkeletonBodyText lines={4} />
        ) : (
          <>
            <TextField
              label="Shipping method name"
              value={draft.codShippingMethodName}
              onChange={(value) => setField('codShippingMethodName', value)}
              autoComplete="off"
              disabled={!draft.hideCodShippingMethod}
              helpText="Enter the exact name shown at checkout."
              error={nameError}
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
                error={limitError}
              />
            </InlineGrid>

            <InlineStack align="space-between" blockAlign="center" gap="300">
              <Text as="p" tone="subdued">
                Leave either limit empty if you only need one condition.
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
                  Save shipping rule
                </Button>
              </InlineStack>
            </InlineStack>
          </>
        )}
      </BlockStack>
    </Card>
  );
}
