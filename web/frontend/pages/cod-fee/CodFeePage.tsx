import {
  Badge,
  BlockStack,
  Button,
  Card,
  Checkbox,
  Divider,
  InlineGrid,
  InlineStack,
  Select,
  Text,
  TextField,
} from '@shopify/polaris';
import { useMemo, useState } from 'react';

type FeeType = 'fixed' | 'percentage';

type CodFeeDraft = {
  enabled: boolean;
  feeType: FeeType;
  feeAmount: string;
  minimumOrderAmount: string;
  provinces: string;
  excludedCustomerTags: string;
  feeVariant: string;
  displayMessage: string;
};

const initialDraft: CodFeeDraft = {
  enabled: false,
  feeType: 'fixed',
  feeAmount: '20000',
  minimumOrderAmount: '',
  provinces: '',
  excludedCustomerTags: '',
  feeVariant: '',
  displayMessage: 'COD fee will be added for cash on delivery orders.',
};

function CodFeePage() {
  const [draft, setDraft] = useState<CodFeeDraft>(initialDraft);
  const [savedDraft, setSavedDraft] = useState<CodFeeDraft>(initialDraft);
  const [hasSaved, setHasSaved] = useState(false);
  const isDirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(savedDraft),
    [draft, savedDraft],
  );
  const feeAmount = Number(draft.feeAmount);
  const feeAmountError =
    draft.feeAmount === '' || feeAmount <= 0
      ? 'Enter a fee greater than 0.'
      : draft.feeType === 'percentage' && feeAmount > 100
        ? 'Percentage must be 100 or less.'
        : undefined;

  const setField = <K extends keyof CodFeeDraft>(
    key: K,
    value: CodFeeDraft[K],
  ) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  return (
    <BlockStack gap="500">
      <Card>
        <BlockStack gap="400">
          <InlineStack align="space-between" blockAlign="center" gap="400">
            <BlockStack gap="100">
              <Text as="h2" variant="headingMd">
                COD fee status
              </Text>
              <Text as="p" tone="subdued">
                Turn this on when the fee product and rules are ready.
              </Text>
            </BlockStack>
            <Checkbox
              label="Enabled"
              checked={draft.enabled}
              onChange={(value) => setField('enabled', value)}
            />
          </InlineStack>
        </BlockStack>
      </Card>

      <InlineGrid columns={{ xs: 1, md: 2 }} gap="400">
        <Card>
          <BlockStack gap="400">
            <BlockStack gap="100">
              <Text as="h2" variant="headingMd">
                Fee calculation
              </Text>
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
              onChange={(value) => {
                const feeType = value as FeeType;
                setDraft((current) => ({
                  ...current,
                  feeType,
                  feeAmount: feeType === 'fixed' ? '20000' : '2',
                }));
              }}
            />
            <TextField
              label={draft.feeType === 'fixed' ? 'Fee amount' : 'Fee rate'}
              value={draft.feeAmount}
              onChange={(value) => setField('feeAmount', value)}
              type="number"
              min={0}
              autoComplete="off"
              suffix={draft.feeType === 'fixed' ? 'VND' : '%'}
              error={feeAmountError}
            />
            <Checkbox
              label="Apply only when the payment method is COD"
              checked
              disabled
              helpText="COD payment method names are managed in Settings."
            />
          </BlockStack>
        </Card>

        <Card>
          <BlockStack gap="400">
            <BlockStack gap="100">
              <Text as="h2" variant="headingMd">
                Apply when
              </Text>
              <Text as="p" tone="subdued">
                Leave a field empty to apply the fee to all matching orders.
              </Text>
            </BlockStack>
            <TextField
              label="Minimum order total"
              value={draft.minimumOrderAmount}
              onChange={(value) => setField('minimumOrderAmount', value)}
              type="number"
              min={0}
              autoComplete="off"
              suffix="VND"
              placeholder="No minimum"
            />
            <TextField
              label="Province or city"
              value={draft.provinces}
              onChange={(value) => setField('provinces', value)}
              autoComplete="off"
              placeholder="All provinces and cities"
              helpText="Separate multiple locations with commas."
            />
            <TextField
              label="Exclude customer tags"
              value={draft.excludedCustomerTags}
              onChange={(value) => setField('excludedCustomerTags', value)}
              autoComplete="off"
              placeholder="vip, wholesale"
              helpText="Customers with any matching tag will not be charged."
            />
          </BlockStack>
        </Card>
      </InlineGrid>

      <Card>
        <BlockStack gap="400">
          <BlockStack gap="100">
            <Text as="h2" variant="headingMd">
              Fee product
            </Text>
            <Text as="p" tone="subdued">
              Select the Shopify product variant used as the COD fee line
              item.
            </Text>
          </BlockStack>
          {draft.feeVariant ? (
            <InlineStack align="space-between" blockAlign="center" gap="300">
              <BlockStack gap="100">
                <Text as="p" fontWeight="semibold">
                  {draft.feeVariant}
                </Text>
                <Text as="p" tone="subdued">
                  Product variant
                </Text>
              </BlockStack>
              <Button onClick={() => setField('feeVariant', '')}>Change</Button>
            </InlineStack>
          ) : (
            <InlineStack align="start">
              <Button onClick={() => setField('feeVariant', 'COD fee')}>
                Select COD fee product variant
              </Button>
            </InlineStack>
          )}
        </BlockStack>
      </Card>

      <Card>
        <BlockStack gap="400">
          <BlockStack gap="100">
            <Text as="h2" variant="headingMd">
              Display message
            </Text>
            <Text as="p" tone="subdued">
              Explain the surcharge before the customer completes the order.
            </Text>
          </BlockStack>
          <TextField
            label="Customer-facing message"
            value={draft.displayMessage}
            onChange={(value) => setField('displayMessage', value)}
            multiline={3}
            autoComplete="off"
          />
        </BlockStack>
      </Card>

      <Divider />

      <InlineStack align="end" gap="300" blockAlign="center">
        {hasSaved && !isDirty ? (
          <Badge tone="success">Preview saved</Badge>
        ) : null}
        <Button
          variant="primary"
          disabled={!isDirty || Boolean(feeAmountError)}
          onClick={() => {
            setSavedDraft(draft);
            setHasSaved(true);
          }}
        >
          Save configuration
        </Button>
      </InlineStack>
    </BlockStack>
  );
}

export default CodFeePage;
