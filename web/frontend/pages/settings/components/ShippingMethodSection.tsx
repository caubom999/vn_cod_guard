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
import type { CodShippingMethod } from '../../../types/cod-fee';
import { SettingsSection } from './SettingsSection';

export function ShippingMethodSection({
  value,
  methods,
  error,
  isLoading,
  isSyncing,
  onChange,
  onSync,
}: {
  value: string;
  methods: CodShippingMethod[];
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
      title="Shipping method"
      description="Select the COD shipping method customers see at checkout."
    >
      <Card>
        <BlockStack gap="300">
          <InlineGrid
            columns={{ xs: 1, sm: ['twoThirds', 'oneThird'] }}
            gap="300"
            alignItems="end"
          >
            <Select
              label="COD shipping method"
              options={options}
              value={value}
              onChange={onChange}
              disabled={isLoading || isSyncing}
              error={error}
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
    </SettingsSection>
  );
}
