import {
  BlockStack,
  Card,
  Checkbox,
  Collapsible,
  InlineGrid,
  SkeletonBodyText,
  Text,
  TextField,
} from '@shopify/polaris';
import type { HideCodShippingMethodSectionProps } from '../../../types/cod-fee';

export function HideCodShippingMethodSection({
  draft,
  setField,
  limitError,
  isLoading,
}: HideCodShippingMethodSectionProps) {
  return (
    <InlineGrid
      columns={{ xs: 1, md: ['oneThird', 'twoThirds'] }}
      gap={{ xs: '400', md: '600' }}
      alignItems="start"
    >
      <BlockStack gap="200">
        <Text as="h2" variant="headingMd">
          Limit COD shipping method
        </Text>
        <Text as="p" tone="subdued">
          Hide the COD delivery option at checkout when the order total is
          outside your allowed range.
        </Text>
      </BlockStack>

      <Card>
        <BlockStack gap="300">
          <Checkbox
            label="Limit COD shipping method"
            checked={draft.hideCodShippingMethod}
            onChange={(value) => setField('hideCodShippingMethod', value)}
            disabled={isLoading}
          />

          {isLoading ? (
            <SkeletonBodyText lines={3} />
          ) : (
            <Collapsible
              open={draft.hideCodShippingMethod}
              id="cod-shipping-method-settings"
              transition={{ duration: '200ms', timingFunction: 'ease-in-out' }}
            >
              <BlockStack gap="400">
                <Text as="p" tone="subdued">
                  Configure the allowed order total range.
                </Text>

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
                    error={limitError}
                  />
                </InlineGrid>

                <Text as="p" tone="subdued">
                  Leave both limits empty when you only want to use the advanced
                  conditions below.
                </Text>
              </BlockStack>
            </Collapsible>
          )}
        </BlockStack>
      </Card>
    </InlineGrid>
  );
}
