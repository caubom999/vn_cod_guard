import {
  Badge,
  Banner,
  BlockStack,
  Box,
  Button,
  Card,
  Checkbox,
  FormLayout,
  InlineStack,
  Layout,
  Page,
  Select,
  SkeletonBodyText,
  Text,
  TextField,
} from '@shopify/polaris';
import { useEffect, useMemo, useState } from 'react';
import {
  CodSettings,
  UpdateCodSettings,
  useCodSettings,
  useUpdateCodSettings,
} from '../../hook/cod-settings';
import { useCurrentShop } from '../../hook/shop';

const channelOptions = [
  { label: 'Email', value: 'EMAIL' },
  { label: 'SMS', value: 'SMS' },
  { label: 'Zalo', value: 'ZALO' },
  { label: 'WhatsApp', value: 'WHATSAPP' },
  { label: 'Manual', value: 'MANUAL' },
];

const emptyForm: UpdateCodSettings = {
  enabled: true,
  defaultChannel: 'EMAIL',
  confirmationDeadlineMinutes: 1440,
  reminderDelayMinutes: 180,
  maxReminders: 2,
  autoCancelUnconfirmed: false,
  pendingTag: 'cod_pending',
  confirmedTag: 'cod_confirmed',
  cancelledTag: 'cod_cancelled',
  expiredTag: 'cod_no_response',
  riskTag: 'cod_risky',
  codPaymentNames: [],
};

export default function Dashboard() {
  const { data: shop, isLoading: isShopLoading, error: shopError } =
    useCurrentShop();
  const {
    data: settings,
    isLoading: isSettingsLoading,
    error: settingsError,
  } = useCodSettings();
  const updateSettings = useUpdateCodSettings();
  const [form, setForm] = useState<UpdateCodSettings>(emptyForm);
  const [paymentNamesText, setPaymentNamesText] = useState('');

  useEffect(() => {
    if (!settings) {
      return;
    }

    setForm(toForm(settings));
    setPaymentNamesText(settings.codPaymentNames.join('\n'));
  }, [settings]);

  const isDirty = useMemo(() => {
    if (!settings) {
      return false;
    }

    return JSON.stringify(form) !== JSON.stringify(toForm(settings));
  }, [form, settings]);

  const validation = useMemo(() => validateSettingsForm(form), [form]);

  const isLoading = isShopLoading || isSettingsLoading;
  const error = shopError || settingsError || updateSettings.error;

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
    <Page
      title="VN-Cod-Guard"
      primaryAction={{
        content: 'Save settings',
        onAction: handleSave,
        loading: updateSettings.isPending,
        disabled: !isDirty || !validation.isValid || updateSettings.isPending,
      }}
    >
      <Layout>
        <Layout.Section>
          <BlockStack gap="400">
            {error ? (
              <Banner tone="critical">
                <Text as="p">{(error as Error).message}</Text>
              </Banner>
            ) : null}

            {!validation.isValid ? (
              <Banner tone="warning">
                <Text as="p">{validation.summary}</Text>
              </Banner>
            ) : null}

            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="center">
                  <Text as="h2" variant="headingMd">
                    Vietnam COD order guard
                  </Text>
                  <Badge tone={shop ? 'success' : 'attention'}>
                    {shop ? 'Connected' : 'Checking'}
                  </Badge>
                </InlineStack>

                {isShopLoading ? (
                  <SkeletonBodyText lines={4} />
                ) : (
                  <Box>
                    <BlockStack gap="200">
                      <Text as="p">
                        <Text as="span" fontWeight="semibold">
                          Shop:
                        </Text>{' '}
                        {shop?.name || shop?.domain}
                      </Text>
                      <Text as="p">
                        <Text as="span" fontWeight="semibold">
                          Domain:
                        </Text>{' '}
                        {shop?.domain}
                      </Text>
                      <Text as="p">
                        <Text as="span" fontWeight="semibold">
                          Email:
                        </Text>{' '}
                        {shop?.email || 'Not provided'}
                      </Text>
                    </BlockStack>
                  </Box>
                )}
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="center">
                  <Text as="h2" variant="headingMd">
                    COD verification settings
                  </Text>
                  <Badge tone={form.enabled ? 'success' : 'critical'}>
                    {form.enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </InlineStack>

                {isLoading ? (
                  <SkeletonBodyText lines={8} />
                ) : (
                  <FormLayout>
                    <Checkbox
                      label="Enable VN-Cod-Guard"
                      checked={form.enabled}
                      onChange={(checked) => setField('enabled', checked)}
                    />

                    <Select
                      label="Default verification channel"
                      options={channelOptions}
                      value={form.defaultChannel}
                      onChange={(value) =>
                        setField(
                          'defaultChannel',
                          value as UpdateCodSettings['defaultChannel'],
                        )
                      }
                    />

                    <FormLayout.Group>
                      <TextField
                        label="Confirmation deadline (minutes)"
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
                        label="Reminder delay (minutes)"
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
                        onChange={(value) =>
                          setNumberField('maxReminders', value)
                        }
                        autoComplete="off"
                        error={validation.errors.maxReminders}
                      />
                    </FormLayout.Group>

                    <Checkbox
                      label="Auto cancel unconfirmed orders"
                      checked={form.autoCancelUnconfirmed}
                      onChange={(checked) =>
                        setField('autoCancelUnconfirmed', checked)
                      }
                    />

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

                    <TextField
                      label="COD payment method names"
                      value={paymentNamesText}
                      onChange={handlePaymentNamesChange}
                      multiline={5}
                      autoComplete="off"
                      helpText="One name per line, for example: Cash on Delivery (COD). Leave empty to use built-in defaults."
                    />

                    <InlineStack gap="300">
                      <Button
                        variant="primary"
                        onClick={handleSave}
                        loading={updateSettings.isPending}
                        disabled={!isDirty || !validation.isValid || updateSettings.isPending}
                      >
                        Save settings
                      </Button>
                      {updateSettings.isSuccess && !isDirty ? (
                        <Badge tone="success">Saved</Badge>
                      ) : null}
                    </InlineStack>
                  </FormLayout>
                )}
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

function toForm(settings: CodSettings): UpdateCodSettings {
  return {
    enabled: settings.enabled,
    defaultChannel: settings.defaultChannel,
    confirmationDeadlineMinutes: settings.confirmationDeadlineMinutes,
    reminderDelayMinutes: settings.reminderDelayMinutes,
    maxReminders: settings.maxReminders,
    autoCancelUnconfirmed: settings.autoCancelUnconfirmed,
    pendingTag: settings.pendingTag,
    confirmedTag: settings.confirmedTag,
    cancelledTag: settings.cancelledTag,
    expiredTag: settings.expiredTag,
    riskTag: settings.riskTag,
    codPaymentNames: settings.codPaymentNames,
  };
}


type SettingsValidation = {
  isValid: boolean;
  summary?: string;
  errors: Partial<Record<keyof UpdateCodSettings, string>>;
};

function validateSettingsForm(form: UpdateCodSettings): SettingsValidation {
  const errors: SettingsValidation['errors'] = {};

  validateIntegerRange(
    form.confirmationDeadlineMinutes,
    1,
    10080,
    'Confirmation deadline must be between 1 and 10080 minutes.',
    (message) => {
      errors.confirmationDeadlineMinutes = message;
    },
  );
  validateIntegerRange(
    form.reminderDelayMinutes,
    1,
    10080,
    'Reminder delay must be between 1 and 10080 minutes.',
    (message) => {
      errors.reminderDelayMinutes = message;
    },
  );
  validateIntegerRange(
    form.maxReminders,
    0,
    10,
    'Max reminders must be between 0 and 10.',
    (message) => {
      errors.maxReminders = message;
    },
  );

  if (
    !errors.confirmationDeadlineMinutes &&
    !errors.reminderDelayMinutes &&
    form.maxReminders > 0 &&
    form.reminderDelayMinutes >= form.confirmationDeadlineMinutes
  ) {
    errors.reminderDelayMinutes =
      'Reminder delay must be lower than the confirmation deadline when reminders are enabled.';
  }

  for (const key of [
    'pendingTag',
    'confirmedTag',
    'cancelledTag',
    'expiredTag',
    'riskTag',
  ] as const) {
    const value = form[key].trim();

    if (!value) {
      errors[key] = 'Tag is required.';
    } else if (value.length > 64) {
      errors[key] = 'Tag must be 64 characters or fewer.';
    }
  }

  const isValid = Object.keys(errors).length === 0;

  return {
    isValid,
    summary: isValid
      ? undefined
      : 'Please fix the highlighted settings before saving.',
    errors,
  };
}

function validateIntegerRange(
  value: number,
  min: number,
  max: number,
  message: string,
  setError: (message: string) => void,
) {
  if (!Number.isInteger(value) || value < min || value > max) {
    setError(message);
  }
}
