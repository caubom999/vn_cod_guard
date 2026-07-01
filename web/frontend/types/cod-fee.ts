export type FeeType = 'fixed' | 'percentage';

export type CodFeeDraft = {
  hideCodShippingMethod: boolean;
  codShippingMethodName: string;
  hideBelowOrderTotal: string;
  hideAboveOrderTotal: string;
  feeType: FeeType;
  feeAmount: string;
  minimumOrderAmount: string;
  provinces: string;
  excludedCustomerTags: string;
  feeVariant: string;
  displayMessage: string;
};

export type CodFeeFieldUpdater = <K extends keyof CodFeeDraft>(
  key: K,
  value: CodFeeDraft[K],
) => void;

export type HideCodShippingMethodSectionProps = {
  draft: CodFeeDraft;
  setField: CodFeeFieldUpdater;
  nameError?: string;
  limitError?: string;
  isDirty: boolean;
  isLoading: boolean;
  isSaving: boolean;
  isSaved: boolean;
  onSave: () => void;
};

export type FeeCalculationSectionProps = {
  draft: CodFeeDraft;
  setField: CodFeeFieldUpdater;
  onFeeTypeChange: (feeType: FeeType) => void;
  error?: string;
};

export type FeeConditionsSectionProps = {
  draft: CodFeeDraft;
  setField: CodFeeFieldUpdater;
};

export type FeeProductSectionProps = {
  feeVariant: string;
  setField: CodFeeFieldUpdater;
};

export type DisplayMessageSectionProps = {
  message: string;
  setField: CodFeeFieldUpdater;
};
