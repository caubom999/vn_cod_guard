import { BlockStack, Card, Text, TextField } from '@shopify/polaris';
import type { DisplayMessageSectionProps } from '../../../types/cod-fee';

export function DisplayMessageSection({
  message,
  setField,
  error,
  disabled,
}: DisplayMessageSectionProps) {
  return (
    <Card>
      <BlockStack gap="400">
        <BlockStack gap="100">
          <Text as="h2" variant="headingMd">
            Display message
          </Text>
          <Text as="p" tone="subdued">
            Save the message used to explain this surcharge to customers.
          </Text>
        </BlockStack>
        <TextField
          label="Customer-facing message"
          value={message}
          onChange={(value) => setField('displayMessage', value)}
          multiline={3}
          autoComplete="off"
          error={error}
          disabled={disabled}
        />
      </BlockStack>
    </Card>
  );
}
