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
import type {
  CodFeeDraft,
  CodFeeFieldUpdater,
  CodFeeSetting,
  FeeType,
} from '../../types/cod-fee';
import {
  getCodFeeValidation,
  getShippingRuleValidation,
  initialCodFeeDraft,
} from './cod-fee-form';
import { CodFeeSaveBar } from './components/CodFeeSaveBar';
import { DisplayMessageSection } from './components/DisplayMessageSection';
import { FeeCalculationSection } from './components/FeeCalculationSection';
import { FeeConditionsSection } from './components/FeeConditionsSection';
import { FeeProductSection } from './components/FeeProductSection';
import { HideCodShippingMethodSection } from './components/HideCodShippingMethodSection';

function CodFeePage() {
  const [draft, setDraft] = useState<CodFeeDraft>(initialCodFeeDraft);
  const deliveryRule = useCodDeliveryRule();
  const updateDeliveryRule = useUpdateCodDeliveryRule();
  const feeSetting = useCodFeeSetting();
  const updateFeeSetting = useUpdateCodFeeSetting();
  const feeValidation = getCodFeeValidation(draft);
  const shippingValidation = getShippingRuleValidation(draft);
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
    }));
  }, [deliveryRule.data]);

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

  return (
    <BlockStack gap="500">
      {deliveryRule.error ||
      updateDeliveryRule.error ||
      feeSetting.error ||
      updateFeeSetting.error ? (
        <ErrorBanner
          error={
            deliveryRule.error ||
            updateDeliveryRule.error ||
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
        isDirty={deliveryRuleDirty}
        isLoading={deliveryRule.isLoading}
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
    };
  }

  return {
    enabled: rule.enabled,
    shippingMethodName: rule.shippingMethodName,
    hideBelowOrderTotal: rule.hideBelowOrderTotal,
    hideAboveOrderTotal: rule.hideAboveOrderTotal,
  };
}

export default CodFeePage;
