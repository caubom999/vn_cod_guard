import { Badge, Button, Card, InlineStack, Text } from '@shopify/polaris';
import type { CodDeliveryRuleSaveBarProps } from '../../../types/cod-fee';

export function CodDeliveryRuleSaveBar({
  isDirty,
  isValid,
  isSaving,
  isSaved,
  onSave,
}: CodDeliveryRuleSaveBarProps) {
  return (
    <Card>
      <InlineStack align="space-between" blockAlign="center" gap="300">
        <Text as="p" tone="subdued">
          Enabled conditions are combined and evaluated during checkout.
        </Text>
        <InlineStack gap="300" blockAlign="center">
          {isSaved && !isDirty ? (
            <Badge tone="success">Saved to Shopify</Badge>
          ) : null}
          <Button
            variant="primary"
            disabled={!isDirty || !isValid}
            loading={isSaving}
            onClick={onSave}
          >
            Save COD visibility rules
          </Button>
        </InlineStack>
      </InlineStack>
    </Card>
  );
}
