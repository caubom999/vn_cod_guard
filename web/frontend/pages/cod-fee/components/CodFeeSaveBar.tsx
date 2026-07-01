import { Badge, Button, Card, InlineStack, Text } from '@shopify/polaris';
import type { CodFeeSaveBarProps } from '../../../types/cod-fee';

export function CodFeeSaveBar({
  isDirty,
  isValid,
  isSaving,
  isSaved,
  onSave,
}: CodFeeSaveBarProps) {
  return (
    <Card>
      <InlineStack align="space-between" blockAlign="center" gap="300">
        <Text as="p" tone="subdued">
          The fee is added to eligible COD orders after Shopify creates them.
        </Text>
        <InlineStack gap="300" blockAlign="center">
          {isSaved && !isDirty ? (
            <Badge tone="success">COD fee saved</Badge>
          ) : null}
          <Button
            variant="primary"
            disabled={!isDirty || !isValid}
            loading={isSaving}
            onClick={onSave}
          >
            Save COD fee
          </Button>
        </InlineStack>
      </InlineStack>
    </Card>
  );
}
