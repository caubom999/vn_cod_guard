export type FeeType = 'fixed' | 'percentage';

export type CodFeeDraft = {
  hideCodShippingMethod: boolean;
  codShippingMethodName: string;
  hideBelowOrderTotal: string;
  hideAboveOrderTotal: string;
  feeEnabled: boolean;
  feeType: FeeType;
  feeAmount: string;
  minimumOrderAmount: string;
  provinces: string;
  excludedCustomerTags: string;
  lineItemTitle: string;
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
  disabled?: boolean;
};

export type FeeConditionsSectionProps = {
  draft: CodFeeDraft;
  setField: CodFeeFieldUpdater;
  minimumError?: string;
  disabled?: boolean;
};

export type FeeProductSectionProps = {
  lineItemTitle: string;
  setField: CodFeeFieldUpdater;
  error?: string;
  disabled?: boolean;
};

export type DisplayMessageSectionProps = {
  message: string;
  setField: CodFeeFieldUpdater;
  error?: string;
  disabled?: boolean;
};

export type CodFeeSetting = {
  id: number;
  shopId: number;
  enabled: boolean;
  feeType: FeeType;
  feeAmount: number;
  minimumOrderAmount: number | null;
  provinces: string[];
  excludedCustomerTags: string[];
  lineItemTitle: string;
  displayMessage: string;
  updatedAt: string;
};

export type UpdateCodFeeSetting = Omit<
  CodFeeSetting,
  'id' | 'shopId' | 'updatedAt'
>;

export type CodFeeSaveBarProps = {
  isDirty: boolean;
  isValid: boolean;
  isSaving: boolean;
  isSaved: boolean;
  onSave: () => void;
};
