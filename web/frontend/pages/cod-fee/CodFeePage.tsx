import { BlockStack, InlineGrid } from '@shopify/polaris';
import { useMemo, useState } from 'react';
import type {
  CodFeeDraft,
  CodFeeFieldUpdater,
  FeeType,
} from '../../types/cod-fee';
import {
  getFeeAmountError,
  getShippingLimitError,
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
  const [savedDraft, setSavedDraft] =
    useState<CodFeeDraft>(initialCodFeeDraft);
  const [hasSaved, setHasSaved] = useState(false);

  const isDirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(savedDraft),
    [draft, savedDraft],
  );
  const feeAmountError = getFeeAmountError(draft);
  const shippingLimitError = getShippingLimitError(draft);

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

  const handleSave = () => {
    setSavedDraft(draft);
    setHasSaved(true);
  };

  return (
    <BlockStack gap="500">
      <HideCodShippingMethodSection
        draft={draft}
        setField={setField}
        error={shippingLimitError}
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

      <FeeProductSection
        feeVariant={draft.feeVariant}
        setField={setField}
      />
      <DisplayMessageSection
        message={draft.displayMessage}
        setField={setField}
      />
      <CodFeeSaveBar
        isDirty={isDirty}
        isValid={!feeAmountError && !shippingLimitError}
        hasSaved={hasSaved}
        onSave={handleSave}
      />
    </BlockStack>
  );
}

export default CodFeePage;
