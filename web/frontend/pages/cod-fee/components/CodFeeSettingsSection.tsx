import {
  BlockStack,
  Box,
  Card,
  Divider,
  InlineGrid,
  Text,
} from '@shopify/polaris';
import type { CodFeeSettingsSectionProps } from '../../../types/cod-fee';
import { DisplayMessageSection } from './DisplayMessageSection';
import { FeeCalculationSection } from './FeeCalculationSection';
import { FeeConditionsSection } from './FeeConditionsSection';
import { FeeProductSection } from './FeeProductSection';

export function CodFeeSettingsSection({
  draft,
  setField,
  onFeeTypeChange,
  feeAmountError,
  minimumError,
  lineItemTitleError,
  displayMessageError,
  disabled,
}: CodFeeSettingsSectionProps) {
  return (
    <Box paddingBlockEnd="600">
      <InlineGrid
        columns={{ xs: 1, md: ['oneThird', 'twoThirds'] }}
        gap={{ xs: '400', md: '600' }}
        alignItems="start"
      >
        <BlockStack gap="200">
          <Text as="h2" variant="headingMd">
            Configure your additional fee
          </Text>
          <Text as="p" tone="subdued">
            Configure the surcharge added to eligible COD orders.
          </Text>
        </BlockStack>

        <Card>
          <BlockStack gap="500">
            <FeeCalculationSection
              draft={draft}
              setField={setField}
              onFeeTypeChange={onFeeTypeChange}
              error={feeAmountError}
              disabled={disabled}
            />
            <Divider />
            <FeeConditionsSection
              draft={draft}
              setField={setField}
              minimumError={minimumError}
              disabled={disabled}
            />
            <Divider />
            <FeeProductSection
              lineItemTitle={draft.lineItemTitle}
              setField={setField}
              error={lineItemTitleError}
              disabled={disabled}
            />
            <Divider />
            <DisplayMessageSection
              message={draft.displayMessage}
              setField={setField}
              error={displayMessageError}
              disabled={disabled}
            />
          </BlockStack>
        </Card>
      </InlineGrid>
    </Box>
  );
}
