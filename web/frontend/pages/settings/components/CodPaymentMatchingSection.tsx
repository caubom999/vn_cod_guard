import { Card, TextField } from '@shopify/polaris';
import { SettingsSection } from './SettingsSection';

export function CodPaymentMatchingSection({
  paymentNamesText,
  onChange,
}: {
  paymentNamesText: string;
  onChange: (value: string) => void;
}) {
  return (
    <SettingsSection
      title="COD payment matching"
      description="Match Shopify payment gateway names that should be treated as cash on delivery."
    >
      <Card>
        <TextField
          label="COD payment method names"
          value={paymentNamesText}
          onChange={onChange}
          multiline={5}
          autoComplete="off"
          helpText="One name per line. Leave empty to use built-in defaults."
        />
      </Card>
    </SettingsSection>
  );
}
