import type { Dispatch, SetStateAction } from 'react';

export type FeeType = 'fixed' | 'percentage';

export type CodPaymentRule = {
  id: number;
  shopId: number;
  enabled: boolean;
  paymentMethodName: string;
  hideBelowOrderTotal: number | null;
  hideAboveOrderTotal: number | null;
  shopifyConfigured: boolean;
  updatedAt: string;
};

export type UpdateCodPaymentRule = Pick<
  CodPaymentRule,
  | 'enabled'
  | 'paymentMethodName'
  | 'hideBelowOrderTotal'
  | 'hideAboveOrderTotal'
>;

export type CodPaymentRuleDraft = {
  enabled: boolean;
  paymentMethodName: string;
  hideBelowOrderTotal: string;
  hideAboveOrderTotal: string;
};

export type HideCodPaymentMethodSectionProps = {
  draft: CodPaymentRuleDraft;
  setDraft: Dispatch<SetStateAction<CodPaymentRuleDraft>>;
  nameError?: string;
  limitError?: string;
  isLoading: boolean;
};

export type CodDeliveryAdvancedRules = {
  hideDiscountedOrders: boolean;
  hideCustomerTags: string[];
  requireCustomerTags: string[];
  hideCustomerEmails: string[];
  hideCustomerPhones: string[];
  hideCountries: string[];
  requireCountries: string[];
  hideProvinces: string[];
  requireProvinces: string[];
  hidePostalCodes: string[];
  requirePostalCodes: string[];
  hideProductIds: string[];
  hideGiftCards: boolean;
  hideCollectionIds: string[];
  requireCollectionIds: string[];
  hideProductVendors: string[];
  requireProductVendors: string[];
  hideShippingRates: string[];
  requireShippingRates: string[];
  hideLocalPickup: boolean;
  requireLocalPickup: boolean;
  hideLocalDelivery: boolean;
  requireLocalDelivery: boolean;
};

export type CodDeliveryAdvancedRuleDraft = {
  [K in keyof CodDeliveryAdvancedRules]: CodDeliveryAdvancedRules[K] extends boolean
    ? boolean
    : string;
};

export type CodFeeDraft = {
  hideCodShippingMethod: boolean;
  codShippingMethodName: string;
  hideBelowOrderTotal: string;
  hideAboveOrderTotal: string;
  advancedDeliveryRules: CodDeliveryAdvancedRuleDraft;
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
  isLoading: boolean;
};

export type CodDeliveryAdvancedRuleUpdater = <
  K extends keyof CodDeliveryAdvancedRuleDraft,
>(
  key: K,
  value: CodDeliveryAdvancedRuleDraft[K],
) => void;

export type AdvancedCodRulesSectionProps = {
  rules: CodDeliveryAdvancedRuleDraft;
  setRule: CodDeliveryAdvancedRuleUpdater;
  disabled: boolean;
  paymentRule: HideCodPaymentMethodSectionProps;
};

export type CodDeliveryRuleSaveBarProps = {
  isDirty: boolean;
  isValid: boolean;
  isSaving: boolean;
  onSave: () => void;
  onDiscard: () => void;
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
