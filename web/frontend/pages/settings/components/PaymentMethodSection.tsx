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
import type { CodPaymentMethod } from '../../../types/cod-fee';
import { SettingsSection } from './SettingsSection';

export function PaymentMethodSection({
  value,
  methods,
  error,
  isLoading,
  isSyncing,
  onChange,
  onSync,
}: {
  value: string;
  methods: CodPaymentMethod[];
  error?: string;
  isLoading: boolean;
  isSyncing: boolean;
  onChange: (value: string) => void;
  onSync: () => void;
}) {
  const options = [
    ...(methods.some((method) => method.name === value) || !value
      ? []
      : [{ label: value, value }]),
    ...methods.map((method) => ({
      label: method.name,
      value: method.name,
    })),
  ];

  return (
    <SettingsSection
      title="Payment method"
      description="Select the COD payment method customers see at checkout."
    >
      <Card>
        <BlockStack gap="300">
          <InlineGrid
            columns={{ xs: 1, sm: ['twoThirds', 'oneThird'] }}
            gap="300"
            alignItems="end"
          >
            <Select
              label="COD payment method"
              options={options}
              value={value}
              onChange={onChange}
              disabled={isLoading || isSyncing}
              error={error}
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
    </SettingsSection>
  );
}
