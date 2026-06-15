import {
  Badge,
  Banner,
  BlockStack,
  Button,
  Card,
  InlineStack,
  SkeletonBodyText,
  Text,
} from '@shopify/polaris';
import { useEffect, useMemo, useState } from 'react';
import {
  type UpdateCodSettings,
  useCodSettings,
  useUpdateCodSettings,
} from '../../hook/cod-settings';
import { ErrorBanner } from '../../components/dashboard/shared';
import { CodPaymentMatchingSection } from './components/CodPaymentMatchingSection';
import { ShopifyTagsSection } from './components/ShopifyTagsSection';
import { VerificationWorkflowSection } from './components/VerificationWorkflowSection';
import {
  emptySettingsForm,
  toSettingsForm,
  validateSettingsForm,
} from './settings-form';

function SettingsScreen() {
  const {
    data: settings,
    isLoading: isSettingsLoading,
    error: settingsError,
  } = useCodSettings();
  const updateSettings = useUpdateCodSettings();
  const [form, setForm] = useState<UpdateCodSettings>(emptySettingsForm);
  const [paymentNamesText, setPaymentNamesText] = useState('');

  useEffect(() => {
    if (!settings) {
      return;
    }

    setForm(toSettingsForm(settings));
    setPaymentNamesText(settings.codPaymentNames.join('\n'));
  }, [settings]);

  const isDirty = useMemo(() => {
    if (!settings) {
      return false;
    }

    return JSON.stringify(form) !== JSON.stringify(toSettingsForm(settings));
  }, [form, settings]);

  const validation = useMemo(() => validateSettingsForm(form), [form]);
  const error = settingsError || updateSettings.error;

  const setField = <K extends keyof UpdateCodSettings>(
    key: K,
    value: UpdateCodSettings[K],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const setNumberField = (key: keyof UpdateCodSettings, value: string) => {
    setForm((current) => ({
      ...current,
      [key]: value === '' ? 0 : Number(value),
    }));
  };

  const handlePaymentNamesChange = (value: string) => {
    setPaymentNamesText(value);
    setField(
      'codPaymentNames',
      value
        .split('\n')
        .map((name) => name.trim())
        .filter(Boolean),
    );
  };

  const handleSave = () => {
    if (!validation.isValid) {
      return;
    }

    updateSettings.mutate(form);
  };

  return (
    <BlockStack gap="500">
      <InlineStack align="space-between" blockAlign="start">
        <BlockStack gap="100">
          <Text as="h1" variant="headingLg">
            Settings
          </Text>
          <Text as="p" tone="subdued">
            Configure how COD orders are matched, verified, tagged, and
            followed up.
          </Text>
        </BlockStack>
        <Badge tone={form.enabled ? 'success' : 'critical'}>
          {form.enabled ? 'Enabled' : 'Disabled'}
        </Badge>
      </InlineStack>

      {error ? <ErrorBanner error={error} /> : null}

      {!validation.isValid ? (
        <Banner tone="warning">
          <Text as="p">{validation.summary}</Text>
        </Banner>
      ) : null}

      {isSettingsLoading ? (
        <Card>
          <SkeletonBodyText lines={12} />
        </Card>
      ) : (
        <BlockStack gap="600">
          <VerificationWorkflowSection
            form={form}
            validation={validation}
            setField={setField}
            setNumberField={setNumberField}
          />

          <ShopifyTagsSection
            form={form}
            validation={validation}
            setField={setField}
          />

          <CodPaymentMatchingSection
            paymentNamesText={paymentNamesText}
            onChange={handlePaymentNamesChange}
          />

          <InlineStack align="end" gap="300" blockAlign="center">
            {updateSettings.isSuccess && !isDirty ? (
              <Badge tone="success">Saved</Badge>
            ) : null}
            <Button
              variant="primary"
              onClick={handleSave}
              loading={updateSettings.isPending}
              disabled={
                !isDirty || !validation.isValid || updateSettings.isPending
              }
            >
              Save settings
            </Button>
          </InlineStack>
        </BlockStack>
      )}
    </BlockStack>
  );
}

export default function SettingsPage() {
  return <SettingsScreen />;
}
