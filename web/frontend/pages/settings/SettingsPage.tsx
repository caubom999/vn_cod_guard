import {
  Badge,
  Banner,
  BlockStack,
  Card,
  InlineStack,
  SkeletonBodyText,
  Text,
} from '@shopify/polaris';
import { SaveBar } from '@shopify/app-bridge-react';
import { useEffect, useMemo, useState } from 'react';
import {
  useCodDeliveryRule,
  useCodShippingMethods,
  useUpdateCodDeliveryRule,
} from '../../hook/cod-delivery-rule';
import {
  useCodPaymentMethods,
  useCodPaymentRule,
  useUpdateCodPaymentRule,
} from '../../hook/cod-payment-rule';
import {
  type UpdateCodSettings,
  useCodSettings,
  useUpdateCodSettings,
} from '../../hook/cod-settings';
import { ErrorBanner } from '../../components/dashboard/shared';
import { PaymentMethodSection } from './components/PaymentMethodSection';
import { ShippingMethodSection } from './components/ShippingMethodSection';
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
  const deliveryRule = useCodDeliveryRule();
  const shippingMethods = useCodShippingMethods();
  const updateDeliveryRule = useUpdateCodDeliveryRule();
  const paymentRule = useCodPaymentRule();
  const paymentMethods = useCodPaymentMethods();
  const updatePaymentRule = useUpdateCodPaymentRule();
  const updateSettings = useUpdateCodSettings();
  const [form, setForm] = useState<UpdateCodSettings>(emptySettingsForm);
  const [shippingMethodName, setShippingMethodName] = useState('');

  useEffect(() => {
    if (!settings) {
      return;
    }

    setForm(toSettingsForm(settings));
  }, [settings]);

  useEffect(() => {
    if (deliveryRule.data) {
      setShippingMethodName(deliveryRule.data.shippingMethodName);
    }
  }, [deliveryRule.data]);

  const settingsDirty = useMemo(() => {
    if (!settings) {
      return false;
    }

    return JSON.stringify(form) !== JSON.stringify(toSettingsForm(settings));
  }, [form, settings]);
  const shippingMethodDirty = Boolean(
    deliveryRule.data &&
      shippingMethodName !== deliveryRule.data.shippingMethodName,
  );
  const paymentMethodDirty = Boolean(
    paymentRule.data &&
      form.codPaymentNames[0] &&
      form.codPaymentNames[0] !== paymentRule.data.paymentMethodName,
  );
  const isDirty =
    settingsDirty || shippingMethodDirty || paymentMethodDirty;

  const validation = useMemo(() => validateSettingsForm(form), [form]);
  const shippingMethodError = shippingMethodName.trim()
    ? undefined
    : 'Select a COD shipping method.';
  const isValid = validation.isValid && !shippingMethodError;
  const isSaving =
    updateSettings.isPending ||
    updateDeliveryRule.isPending ||
    updatePaymentRule.isPending;
  const error =
    settingsError ||
    deliveryRule.error ||
    shippingMethods.error ||
    updateDeliveryRule.error ||
    paymentRule.error ||
    paymentMethods.error ||
    updatePaymentRule.error ||
    updateSettings.error;

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

  const handleSave = async () => {
    if (!isValid) {
      return;
    }

    const updates: Promise<unknown>[] = [];

    if (settingsDirty) {
      updates.push(updateSettings.mutateAsync(form));
    }

    if (shippingMethodDirty && deliveryRule.data) {
      updates.push(
        updateDeliveryRule.mutateAsync({
          enabled: deliveryRule.data.enabled,
          shippingMethodName: shippingMethodName.trim(),
          hideBelowOrderTotal: deliveryRule.data.hideBelowOrderTotal,
          hideAboveOrderTotal: deliveryRule.data.hideAboveOrderTotal,
        }),
      );
    }

    if (paymentMethodDirty && paymentRule.data) {
      updates.push(
        updatePaymentRule.mutateAsync({
          hideByOrderTotal: paymentRule.data.hideByOrderTotal,
          hideDiscountedOrders: paymentRule.data.hideDiscountedOrders,
          minimumDiscountAmount: paymentRule.data.minimumDiscountAmount,
          paymentMethodName: form.codPaymentNames[0].trim(),
          hideBelowOrderTotal: paymentRule.data.hideBelowOrderTotal,
          hideAboveOrderTotal: paymentRule.data.hideAboveOrderTotal,
          advancedRules: paymentRule.data.advancedRules,
        }),
      );
    }

    await Promise.allSettled(updates);
  };

  const handleDiscard = () => {
    if (settings) {
      setForm(toSettingsForm(settings));
    }

    if (deliveryRule.data) {
      setShippingMethodName(deliveryRule.data.shippingMethodName);
    }
  };

  return (
    <BlockStack gap="500">
      <InlineStack align="end">
        <Badge tone={form.enabled ? 'success' : 'critical'}>
          {form.enabled ? 'Enabled' : 'Disabled'}
        </Badge>
      </InlineStack>

      {error ? <ErrorBanner error={error} /> : null}

      {!isValid ? (
        <Banner tone="warning">
          <Text as="p">
            {validation.summary ||
              'Select the COD shipping method before saving.'}
          </Text>
        </Banner>
      ) : null}

      {isSettingsLoading || deliveryRule.isLoading || paymentRule.isLoading ? (
        <Card>
          <SkeletonBodyText lines={12} />
        </Card>
      ) : (
        <BlockStack gap="600">
          <ShippingMethodSection
            value={shippingMethodName}
            methods={shippingMethods.data?.methods || []}
            error={shippingMethodError}
            isLoading={shippingMethods.isLoading}
            isSyncing={shippingMethods.isFetching}
            onChange={setShippingMethodName}
            onSync={() => {
              void shippingMethods.refetch();
            }}
          />

          <PaymentMethodSection
            value={form.codPaymentNames[0] || ''}
            methods={paymentMethods.data?.methods || []}
            error={validation.errors.codPaymentNames}
            isLoading={paymentMethods.isLoading}
            isSyncing={paymentMethods.isFetching}
            onChange={(value) => setField('codPaymentNames', [value])}
            onSync={() => {
              void paymentMethods.refetch();
            }}
          />

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

          <SaveBar id="cod-settings-save-bar" open={isDirty}>
            <button
              variant="primary"
              disabled={!isValid || isSaving}
              loading={isSaving}
              onClick={handleSave}
            >
              Save
            </button>
            <button
              disabled={isSaving}
              onClick={handleDiscard}
            >
              Discard
            </button>
          </SaveBar>
        </BlockStack>
      )}
    </BlockStack>
  );
}

export default function SettingsPage() {
  return <SettingsScreen />;
}
