import { Badge, Button, Divider, InlineStack } from '@shopify/polaris';
import type { CodFeeSaveBarProps } from '../../../types/cod-fee';

export function CodFeeSaveBar({
  isDirty,
  isValid,
  hasSaved,
  onSave,
}: CodFeeSaveBarProps) {
  return (
    <>
      <Divider />
      <InlineStack align="end" gap="300" blockAlign="center">
        {hasSaved && !isDirty ? (
          <Badge tone="success">Preview saved</Badge>
        ) : null}
        <Button
          variant="primary"
          disabled={!isDirty || !isValid}
          onClick={onSave}
        >
          Save configuration
        </Button>
      </InlineStack>
    </>
  );
}
