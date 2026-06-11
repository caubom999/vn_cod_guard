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
    updateSettings.mutate(form);
  };

  return (
    <Page
      title="VN-Cod-Guard"
      primaryAction={{
        content: 'Save settings',
        onAction: handleSave,
        loading: updateSettings.isPending,
        disabled: !isDirty || updateSettings.isPending,
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
                        min={15}
                        max={10080}
                        value={String(form.confirmationDeadlineMinutes)}
                        onChange={(value) =>
                          setNumberField('confirmationDeadlineMinutes', value)
                        }
                        autoComplete="off"
                      />
                      <TextField
                        label="Reminder delay (minutes)"
                        type="number"
                        min={5}
                        max={10080}
                        value={String(form.reminderDelayMinutes)}
                        onChange={(value) =>
                          setNumberField('reminderDelayMinutes', value)
                        }
                        autoComplete="off"
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
                      />
                      <TextField
                        label="Risk tag"
                        value={form.riskTag}
                        onChange={(value) => setField('riskTag', value)}
                        autoComplete="off"
                      />
                    </FormLayout.Group>

                    <FormLayout.Group>
                      <TextField
                        label="Confirmed tag"
                        value={form.confirmedTag}
                        onChange={(value) => setField('confirmedTag', value)}
                        autoComplete="off"
                      />
                      <TextField
                        label="Cancelled tag"
                        value={form.cancelledTag}
                        onChange={(value) => setField('cancelledTag', value)}
                        autoComplete="off"
                      />
                      <TextField
                        label="No response tag"
                        value={form.expiredTag}
                        onChange={(value) => setField('expiredTag', value)}
                        autoComplete="off"
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
                        disabled={!isDirty || updateSettings.isPending}
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
