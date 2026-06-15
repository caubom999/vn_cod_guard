import { Card, FormLayout, TextField } from '@shopify/polaris';
import type { UpdateCodSettings } from '../../../hook/cod-settings';
import type { SettingsValidation } from '../settings-form';
import { SettingsSection } from './SettingsSection';

export function ShopifyTagsSection({
  form,
  validation,
  setField,
}: {
  form: UpdateCodSettings;
  validation: SettingsValidation;
  setField: <K extends keyof UpdateCodSettings>(
    key: K,
    value: UpdateCodSettings[K],
  ) => void;
}) {
  return (
    <SettingsSection
      title="Shopify tags"
      description="Tags are applied to Shopify orders as customers confirm, cancel, expire, or require review."
    >
      <Card>
        <FormLayout>
          <FormLayout.Group>
            <TextField
              label="Pending tag"
              value={form.pendingTag}
              onChange={(value) => setField('pendingTag', value)}
              autoComplete="off"
              error={validation.errors.pendingTag}
            />
            <TextField
              label="Risk tag"
              value={form.riskTag}
              onChange={(value) => setField('riskTag', value)}
              autoComplete="off"
              error={validation.errors.riskTag}
            />
          </FormLayout.Group>
          <FormLayout.Group>
            <TextField
              label="Confirmed tag"
              value={form.confirmedTag}
              onChange={(value) => setField('confirmedTag', value)}
              autoComplete="off"
              error={validation.errors.confirmedTag}
            />
            <TextField
              label="Cancelled tag"
              value={form.cancelledTag}
              onChange={(value) => setField('cancelledTag', value)}
              autoComplete="off"
              error={validation.errors.cancelledTag}
            />
            <TextField
              label="No response tag"
              value={form.expiredTag}
              onChange={(value) => setField('expiredTag', value)}
              autoComplete="off"
              error={validation.errors.expiredTag}
            />
          </FormLayout.Group>
        </FormLayout>
      </Card>
    </SettingsSection>
  );
}
