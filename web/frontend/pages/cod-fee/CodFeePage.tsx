import { BlockStack, InlineGrid } from '@shopify/polaris';
import { useEffect, useMemo, useState } from 'react';
import { ErrorBanner } from '../../components/dashboard/shared';
import {
  type CodDeliveryRule,
  useCodDeliveryRule,
  useUpdateCodDeliveryRule,
} from '../../hook/cod-delivery-rule';
import {
  useCodFeeSetting,
  useUpdateCodFeeSetting,
} from '../../hook/cod-fee-setting';
import {
  useCodPaymentRule,
  useUpdateCodPaymentRule,
} from '../../hook/cod-payment-rule';
import type {
  CodDeliveryAdvancedRuleDraft,
  CodDeliveryAdvancedRuleUpdater,
  CodDeliveryAdvancedRules,
  CodFeeDraft,
  CodFeeFieldUpdater,
  CodFeeSetting,
  CodPaymentRule,
  CodPaymentRuleDraft,
  FeeType,
} from '../../types/cod-fee';
import {
  getCodFeeValidation,
  getPaymentRuleValidation,
  getShippingRuleValidation,
  initialCodPaymentRuleDraft,
  initialCodFeeDraft,
} from './cod-fee-form';
import { AdvancedCodRulesSection } from './components/AdvancedCodRulesSection';
import { CodFeeSaveBar } from './components/CodFeeSaveBar';
import { CodDeliveryRuleSaveBar } from './components/CodDeliveryRuleSaveBar';
import { DisplayMessageSection } from './components/DisplayMessageSection';
import { FeeCalculationSection } from './components/FeeCalculationSection';
import { FeeConditionsSection } from './components/FeeConditionsSection';
import { FeeProductSection } from './components/FeeProductSection';
import { HideCodShippingMethodSection } from './components/HideCodShippingMethodSection';
import { HideCodPaymentMethodSection } from './components/HideCodPaymentMethodSection';

function CodFeePage() {
  const [draft, setDraft] = useState<CodFeeDraft>(initialCodFeeDraft);
  const [paymentDraft, setPaymentDraft] = useState<CodPaymentRuleDraft>(
    initialCodPaymentRuleDraft,
  );
  const deliveryRule = useCodDeliveryRule();
  const updateDeliveryRule = useUpdateCodDeliveryRule();
  const paymentRule = useCodPaymentRule();
  const updatePaymentRule = useUpdateCodPaymentRule();
  const feeSetting = useCodFeeSetting();
  const updateFeeSetting = useUpdateCodFeeSetting();
  const feeValidation = getCodFeeValidation(draft);
  const shippingValidation = getShippingRuleValidation(draft);
  const paymentValidation = getPaymentRuleValidation(paymentDraft);
  const deliveryRuleDirty = useMemo(
    () =>
      deliveryRule.data
        ? JSON.stringify(toDeliveryRuleInput(draft)) !==
          JSON.stringify(toDeliveryRuleInput(deliveryRule.data))
        : false,
    [draft, deliveryRule.data],
  );
  const feeSettingDirty = useMemo(
    () =>
      feeSetting.data
        ? JSON.stringify(toCodFeeInput(draft)) !==
          JSON.stringify(toCodFeeInput(feeSetting.data))
        : false,
    [draft, feeSetting.data],
  );
  const paymentRuleDirty = useMemo(
    () =>
      paymentRule.data
        ? JSON.stringify(toPaymentRuleInput(paymentDraft)) !==
          JSON.stringify(toPaymentRuleInput(paymentRule.data))
        : false,
    [paymentDraft, paymentRule.data],
  );

  useEffect(() => {
    if (!deliveryRule.data) {
      return;
    }

    setDraft((current) => ({
      ...current,
      hideCodShippingMethod: deliveryRule.data.enabled,
      codShippingMethodName: deliveryRule.data.shippingMethodName,
      hideBelowOrderTotal: amountToText(deliveryRule.data.hideBelowOrderTotal),
      hideAboveOrderTotal: amountToText(deliveryRule.data.hideAboveOrderTotal),
      advancedDeliveryRules: toAdvancedRuleDraft(
        deliveryRule.data.advancedRules,
      ),
    }));
  }, [deliveryRule.data]);

  useEffect(() => {
    if (!paymentRule.data) {
      return;
    }

    setPaymentDraft({
      enabled: paymentRule.data.enabled,
      paymentMethodName: paymentRule.data.paymentMethodName,
      hideBelowOrderTotal: amountToText(paymentRule.data.hideBelowOrderTotal),
      hideAboveOrderTotal: amountToText(paymentRule.data.hideAboveOrderTotal),
    });
  }, [paymentRule.data]);

  useEffect(() => {
    if (!feeSetting.data) {
      return;
    }

    setDraft((current) => ({
      ...current,
      feeEnabled: feeSetting.data.enabled,
      feeType: feeSetting.data.feeType,
      feeAmount: String(feeSetting.data.feeAmount),
      minimumOrderAmount: amountToText(feeSetting.data.minimumOrderAmount),
      provinces: feeSetting.data.provinces.join(', '),
      excludedCustomerTags: feeSetting.data.excludedCustomerTags.join(', '),
      lineItemTitle: feeSetting.data.lineItemTitle,
      displayMessage: feeSetting.data.displayMessage,
    }));
  }, [feeSetting.data]);

  const setField: CodFeeFieldUpdater = (key, value) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const setAdvancedRule: CodDeliveryAdvancedRuleUpdater = (key, value) => {
    setDraft((current) => ({
      ...current,
      advancedDeliveryRules: {
        ...current.advancedDeliveryRules,
        [key]: value,
      },
    }));
  };

  const handleFeeTypeChange = (feeType: FeeType) => {
    setDraft((current) => ({
      ...current,
      feeType,
      feeAmount: feeType === 'fixed' ? '20000' : '2',
    }));
  };

  const handleDeliveryRuleSave = () => {
    if (!shippingValidation.isValid) {
      return;
    }

    updateDeliveryRule.mutate(toDeliveryRuleInput(draft));
  };

  const handleCodFeeSave = () => {
    if (!feeValidation.isValid) {
      return;
    }

    updateFeeSetting.mutate(toCodFeeInput(draft));
  };

  const handlePaymentRuleSave = () => {
    if (!paymentValidation.isValid) {
      return;
    }

    updatePaymentRule.mutate(toPaymentRuleInput(paymentDraft));
  };

  return (
    <BlockStack gap="500">
      {deliveryRule.error ||
      updateDeliveryRule.error ||
      paymentRule.error ||
      updatePaymentRule.error ||
      feeSetting.error ||
      updateFeeSetting.error ? (
        <ErrorBanner
          error={
            deliveryRule.error ||
            updateDeliveryRule.error ||
            paymentRule.error ||
            updatePaymentRule.error ||
            feeSetting.error ||
            updateFeeSetting.error
          }
        />
      ) : null}

      <HideCodShippingMethodSection
        draft={draft}
        setField={setField}
        nameError={shippingValidation.nameError}
        limitError={shippingValidation.limitError}
        isLoading={deliveryRule.isLoading}
      />

      <HideCodPaymentMethodSection
        draft={paymentDraft}
        setDraft={setPaymentDraft}
        nameError={paymentValidation.nameError}
        limitError={paymentValidation.limitError}
        isDirty={paymentRuleDirty}
        isLoading={paymentRule.isLoading}
        isSaving={updatePaymentRule.isPending}
        isSaved={updatePaymentRule.isSuccess}
        onSave={handlePaymentRuleSave}
      />

      <AdvancedCodRulesSection
        rules={draft.advancedDeliveryRules}
        setRule={setAdvancedRule}
        disabled={
          deliveryRule.isLoading ||
          updateDeliveryRule.isPending ||
          !draft.hideCodShippingMethod
        }
      />

      <CodDeliveryRuleSaveBar
        isDirty={deliveryRuleDirty}
        isValid={shippingValidation.isValid}
        isSaving={updateDeliveryRule.isPending}
        isSaved={updateDeliveryRule.isSuccess}
        onSave={handleDeliveryRuleSave}
      />

      <InlineGrid columns={{ xs: 1, md: 2 }} gap="400">
        <FeeCalculationSection
          draft={draft}
          setField={setField}
          onFeeTypeChange={handleFeeTypeChange}
          error={feeValidation.feeAmountError}
          disabled={feeSetting.isLoading || updateFeeSetting.isPending}
        />
        <FeeConditionsSection
          draft={draft}
          setField={setField}
          minimumError={feeValidation.minimumError}
          disabled={feeSetting.isLoading || updateFeeSetting.isPending}
        />
      </InlineGrid>

      <FeeProductSection
        lineItemTitle={draft.lineItemTitle}
        setField={setField}
        error={feeValidation.lineItemTitleError}
        disabled={feeSetting.isLoading || updateFeeSetting.isPending}
      />
      <DisplayMessageSection
        message={draft.displayMessage}
        setField={setField}
        error={feeValidation.displayMessageError}
        disabled={feeSetting.isLoading || updateFeeSetting.isPending}
      />
      <CodFeeSaveBar
        isDirty={feeSettingDirty}
        isValid={feeValidation.isValid}
        isSaving={updateFeeSetting.isPending}
        isSaved={updateFeeSetting.isSuccess}
        onSave={handleCodFeeSave}
      />
    </BlockStack>
  );
}

function toPaymentRuleInput(rule: CodPaymentRuleDraft | CodPaymentRule) {
  if (typeof rule.hideBelowOrderTotal === 'string') {
    return {
      enabled: rule.enabled,
      paymentMethodName: rule.paymentMethodName.trim(),
      hideBelowOrderTotal:
        rule.hideBelowOrderTotal === ''
          ? null
          : Number(rule.hideBelowOrderTotal),
      hideAboveOrderTotal:
        rule.hideAboveOrderTotal === ''
          ? null
          : Number(rule.hideAboveOrderTotal),
    };
  }

  return {
    enabled: rule.enabled,
    paymentMethodName: rule.paymentMethodName,
    hideBelowOrderTotal: rule.hideBelowOrderTotal,
    hideAboveOrderTotal: rule.hideAboveOrderTotal,
  };
}

function toCodFeeInput(setting: CodFeeDraft | CodFeeSetting) {
  if ('feeEnabled' in setting) {
    return {
      enabled: setting.feeEnabled,
      feeType: setting.feeType,
      feeAmount: Number(setting.feeAmount),
      minimumOrderAmount:
        setting.minimumOrderAmount === ''
          ? null
          : Number(setting.minimumOrderAmount),
      provinces: splitList(setting.provinces),
      excludedCustomerTags: splitList(setting.excludedCustomerTags),
      lineItemTitle: setting.lineItemTitle.trim(),
      displayMessage: setting.displayMessage.trim(),
    };
  }

  return {
    enabled: setting.enabled,
    feeType: setting.feeType,
    feeAmount: setting.feeAmount,
    minimumOrderAmount: setting.minimumOrderAmount,
    provinces: setting.provinces,
    excludedCustomerTags: setting.excludedCustomerTags,
    lineItemTitle: setting.lineItemTitle,
    displayMessage: setting.displayMessage,
  };
}

function splitList(value: string) {
  return [
    ...new Set(
      value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ];
}

function amountToText(value: number | null) {
  return value === null ? '' : String(value);
}

function toDeliveryRuleInput(rule: CodFeeDraft | CodDeliveryRule) {
  if ('hideCodShippingMethod' in rule) {
    return {
      enabled: rule.hideCodShippingMethod,
      shippingMethodName: rule.codShippingMethodName.trim(),
      hideBelowOrderTotal:
        rule.hideBelowOrderTotal === ''
          ? null
          : Number(rule.hideBelowOrderTotal),
      hideAboveOrderTotal:
        rule.hideAboveOrderTotal === ''
          ? null
          : Number(rule.hideAboveOrderTotal),
      advancedRules: toAdvancedRules(rule.advancedDeliveryRules),
    };
  }

  return {
    enabled: rule.enabled,
    shippingMethodName: rule.shippingMethodName,
    hideBelowOrderTotal: rule.hideBelowOrderTotal,
    hideAboveOrderTotal: rule.hideAboveOrderTotal,
    advancedRules: rule.advancedRules,
  };
}

function toAdvancedRuleDraft(
  rules: CodDeliveryAdvancedRules,
): CodDeliveryAdvancedRuleDraft {
  return {
    hideDiscountedOrders: rules.hideDiscountedOrders,
    hideCustomerTags: rules.hideCustomerTags.join(', '),
    requireCustomerTags: rules.requireCustomerTags.join(', '),
    hideCustomerEmails: rules.hideCustomerEmails.join(', '),
    hideCustomerPhones: rules.hideCustomerPhones.join(', '),
    hideCountries: rules.hideCountries.join(', '),
    requireCountries: rules.requireCountries.join(', '),
    hideProvinces: rules.hideProvinces.join(', '),
    requireProvinces: rules.requireProvinces.join(', '),
    hidePostalCodes: rules.hidePostalCodes.join(', '),
    requirePostalCodes: rules.requirePostalCodes.join(', '),
    hideProductIds: rules.hideProductIds.join(', '),
    hideGiftCards: rules.hideGiftCards,
    hideCollectionIds: rules.hideCollectionIds.join(', '),
    requireCollectionIds: rules.requireCollectionIds.join(', '),
    hideProductVendors: rules.hideProductVendors.join(', '),
    requireProductVendors: rules.requireProductVendors.join(', '),
    hideShippingRates: rules.hideShippingRates.join(', '),
    requireShippingRates: rules.requireShippingRates.join(', '),
    hideLocalPickup: rules.hideLocalPickup,
    requireLocalPickup: rules.requireLocalPickup,
    hideLocalDelivery: rules.hideLocalDelivery,
    requireLocalDelivery: rules.requireLocalDelivery,
  };
}

function toAdvancedRules(
  rules: CodDeliveryAdvancedRuleDraft,
): CodDeliveryAdvancedRules {
  return {
    hideDiscountedOrders: rules.hideDiscountedOrders,
    hideCustomerTags: splitList(rules.hideCustomerTags),
    requireCustomerTags: splitList(rules.requireCustomerTags),
    hideCustomerEmails: splitList(rules.hideCustomerEmails),
    hideCustomerPhones: splitList(rules.hideCustomerPhones),
    hideCountries: splitList(rules.hideCountries),
    requireCountries: splitList(rules.requireCountries),
    hideProvinces: splitList(rules.hideProvinces),
    requireProvinces: splitList(rules.requireProvinces),
    hidePostalCodes: splitList(rules.hidePostalCodes),
    requirePostalCodes: splitList(rules.requirePostalCodes),
    hideProductIds: splitList(rules.hideProductIds),
    hideGiftCards: rules.hideGiftCards,
    hideCollectionIds: splitList(rules.hideCollectionIds),
    requireCollectionIds: splitList(rules.requireCollectionIds),
    hideProductVendors: splitList(rules.hideProductVendors),
    requireProductVendors: splitList(rules.requireProductVendors),
    hideShippingRates: splitList(rules.hideShippingRates),
    requireShippingRates: splitList(rules.requireShippingRates),
    hideLocalPickup: rules.hideLocalPickup,
    requireLocalPickup: rules.requireLocalPickup,
    hideLocalDelivery: rules.hideLocalDelivery,
    requireLocalDelivery: rules.requireLocalDelivery,
  };
}

export default CodFeePage;
