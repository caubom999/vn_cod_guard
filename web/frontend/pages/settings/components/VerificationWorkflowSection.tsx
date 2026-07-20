import {
  BlockStack,
  Card,
  Checkbox,
  Divider,
  FormLayout,
  Select,
  TextField,
} from '@shopify/polaris';
import type { UpdateCodSettings } from '../../../hook/cod-settings';
import type { SettingsValidation } from '../settings-form';
import { SettingsSection } from './SettingsSection';

const channelOptions = [
  { label: 'Email', value: 'EMAIL' },
  { label: 'WhatsApp — setup required', value: 'WHATSAPP', disabled: true },
  { label: 'SMS — setup required', value: 'SMS', disabled: true },
];

export function VerificationWorkflowSection({
  form,
  validation,
  setField,
  setNumberField,
}: {
  form: UpdateCodSettings;
  validation: SettingsValidation;
  setField: <K extends keyof UpdateCodSettings>(
    key: K,
    value: UpdateCodSettings[K],
  ) => void;
  setNumberField: (key: keyof UpdateCodSettings, value: string) => void;
}) {
  return (
    <SettingsSection
      title="Verification workflow"
      description="Choose the customer channel and timing rules used when a COD order enters the confirmation flow."
    >
      <Card>
        <BlockStack gap="400">
          <Checkbox
            label="Enable Vietnam COD Guard"
            checked={form.enabled}
            onChange={(checked) => setField('enabled', checked)}
          />

          <Select
            label="Default verification channel"
            options={channelOptions}
            value={form.defaultChannel}
            helpText="Email is available now. Connect a provider before enabling WhatsApp or SMS."
            onChange={(value) =>
              setField(
                'defaultChannel',
                value as UpdateCodSettings['defaultChannel'],
              )
            }
          />

          <Divider />

          <FormLayout>
            <FormLayout.Group>
              <TextField
                label="Confirmation deadline"
                suffix="minutes"
                type="number"
                min={1}
                max={10080}
                value={String(form.confirmationDeadlineMinutes)}
                onChange={(value) =>
                  setNumberField('confirmationDeadlineMinutes', value)
                }
                autoComplete="off"
                error={validation.errors.confirmationDeadlineMinutes}
              />
              <TextField
                label="Reminder delay"
                suffix="minutes"
                type="number"
                min={1}
                max={10080}
                value={String(form.reminderDelayMinutes)}
                onChange={(value) =>
                  setNumberField('reminderDelayMinutes', value)
                }
                autoComplete="off"
                error={validation.errors.reminderDelayMinutes}
              />
              <TextField
                label="Max reminders"
                type="number"
                min={0}
                max={10}
                value={String(form.maxReminders)}
                onChange={(value) => setNumberField('maxReminders', value)}
                autoComplete="off"
                error={validation.errors.maxReminders}
              />
            </FormLayout.Group>
          </FormLayout>

          <Checkbox
            label="Auto cancel unconfirmed orders"
            checked={form.autoCancelUnconfirmed}
            onChange={(checked) => setField('autoCancelUnconfirmed', checked)}
          />
        </BlockStack>
      </Card>
    </SettingsSection>
  );
}
