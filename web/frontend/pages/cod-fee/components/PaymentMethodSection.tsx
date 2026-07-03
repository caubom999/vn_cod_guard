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
import type { PaymentMethodSectionProps } from '../../../types/cod-fee';

export function PaymentMethodSection({
  draft,
  setDraft,
  methods,
  nameError,
  isLoading,
  isSyncing,
  onSync,
}: PaymentMethodSectionProps) {
  const options = [
    ...(methods.some((method) => method.name === draft.paymentMethodName) ||
    !draft.paymentMethodName
      ? []
      : [{ label: draft.paymentMethodName, value: draft.paymentMethodName }]),
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
          Payment method
        </Text>
        <Text as="p" tone="subdued">
          Select the exact cash on delivery payment method shown at checkout.
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
              label="Payment method name"
              options={options}
              value={draft.paymentMethodName}
              onChange={(paymentMethodName) =>
                setDraft((current) => ({
                  ...current,
                  paymentMethodName,
                }))
              }
              disabled={isLoading || isSyncing}
              error={nameError}
              placeholder={
                isLoading ? 'Loading payment methods…' : 'Select a payment method'
              }
            />
            <InlineStack align="end">
              <Button
                icon={RefreshIcon}
                onClick={onSync}
                loading={isSyncing}
                disabled={isLoading}
              >
                Sync payment methods
              </Button>
            </InlineStack>
          </InlineGrid>
          <Text as="p" tone="subdued">
            Sync after adding or renaming a payment method in Shopify.
          </Text>
        </BlockStack>
      </Card>
    </InlineGrid>
  );
}
