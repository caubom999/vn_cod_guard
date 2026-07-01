import { BlockStack, InlineGrid } from '@shopify/polaris';
import { useEffect, useMemo, useState } from 'react';
import { ErrorBanner } from '../../components/dashboard/shared';
import {
  type CodDeliveryRule,
  useCodDeliveryRule,
  useUpdateCodDeliveryRule,
} from '../../hook/cod-delivery-rule';
import type {
  CodFeeDraft,
  CodFeeFieldUpdater,
  FeeType,
} from '../../types/cod-fee';
import {
  getFeeAmountError,
  getShippingRuleValidation,
  initialCodFeeDraft,
} from './cod-fee-form';
import { DisplayMessageSection } from './components/DisplayMessageSection';
import { FeeCalculationSection } from './components/FeeCalculationSection';
import { FeeConditionsSection } from './components/FeeConditionsSection';
import { FeeProductSection } from './components/FeeProductSection';
import { HideCodShippingMethodSection } from './components/HideCodShippingMethodSection';

function CodFeePage() {
  const [draft, setDraft] = useState<CodFeeDraft>(initialCodFeeDraft);
  const deliveryRule = useCodDeliveryRule();
  const updateDeliveryRule = useUpdateCodDeliveryRule();
  const feeAmountError = getFeeAmountError(draft);
  const shippingValidation = getShippingRuleValidation(draft);
  const deliveryRuleDirty = useMemo(
    () =>
      deliveryRule.data
        ? JSON.stringify(toDeliveryRuleInput(draft)) !==
          JSON.stringify(toDeliveryRuleInput(deliveryRule.data))
        : false,
    [draft, deliveryRule.data],
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

  return (
    <BlockStack gap="500">
      {deliveryRule.error || updateDeliveryRule.error ? (
        <ErrorBanner error={deliveryRule.error || updateDeliveryRule.error} />
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
          error={feeAmountError}
        />
        <FeeConditionsSection draft={draft} setField={setField} />
      </InlineGrid>

      <FeeProductSection feeVariant={draft.feeVariant} setField={setField} />
      <DisplayMessageSection
        message={draft.displayMessage}
        setField={setField}
      />
    </BlockStack>
  );
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
