import {
  BlockStack,
  Button,
  Card,
  InlineGrid,
  InlineStack,
  Select,
  Text,
} from '@shopify/polaris';
import { RefreshIcon } from '@shopify/polaris-icons';
import type { ShippingMethodSectionProps } from '../../../types/cod-fee';

export function ShippingMethodSection({
  draft,
  setField,
  methods,
  nameError,
  isLoading,
  isSyncing,
  onSync,
}: ShippingMethodSectionProps) {
  const options = [
    ...(methods.some((method) => method.name === draft.codShippingMethodName) ||
    !draft.codShippingMethodName
      ? []
      : [
          {
            label: draft.codShippingMethodName,
            value: draft.codShippingMethodName,
          },
        ]),
    ...methods.map((method) => ({
      label: method.name,
      value: method.name,
    })),
  ];

  return (
    <InlineGrid
      columns={{ xs: 1, md: ['oneThird', 'twoThirds'] }}
      gap={{ xs: '400', md: '600' }}
      alignItems="start"
    >
      <BlockStack gap="200">
        <Text as="h2" variant="headingMd">
          Shipping method
        </Text>
        <Text as="p" tone="subdued">
          Select the exact COD shipping method shown at checkout.
        </Text>
      </BlockStack>

      <Card>
        <BlockStack gap="300">
          <InlineGrid
            columns={{ xs: 1, sm: ['twoThirds', 'oneThird'] }}
            gap="300"
            alignItems="end"
          >
            <Select
              label="Shipping method name"
              options={options}
              value={draft.codShippingMethodName}
              onChange={(value) => setField('codShippingMethodName', value)}
              disabled={isLoading || isSyncing}
              error={nameError}
              placeholder={
                isLoading ? 'Loading shipping methods…' : 'Select a shipping method'
              }
            />
            <InlineStack align="end">
              <Button
                icon={RefreshIcon}
                onClick={onSync}
                loading={isSyncing}
                disabled={isLoading}
              >
                Sync shipping methods
              </Button>
            </InlineStack>
          </InlineGrid>
          <Text as="p" tone="subdued">
            Sync after adding or renaming a shipping rate in Shopify.
          </Text>
        </BlockStack>
      </Card>
    </InlineGrid>
  );
}
