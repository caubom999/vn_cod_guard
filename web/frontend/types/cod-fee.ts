import type { Dispatch, SetStateAction } from 'react';

export type FeeType = 'fixed' | 'percentage';

export type CodShippingMethod = {
  id: string;
  name: string;
};

export type CodPaymentMethod = {
  id: string;
  name: string;
};

export type CodPaymentRule = {
  id: number;
  shopId: number;
  enabled: boolean;
  hideByOrderTotal: boolean;
  hideDiscountedOrders: boolean;
  minimumDiscountAmount: number;
  paymentMethodName: string;
  hideBelowOrderTotal: number | null;
  hideAboveOrderTotal: number | null;
  advancedRules: CodPaymentAdvancedRules;
  configurationVersion: number;
  shopifyConfigured: boolean;
  updatedAt: string;
};

export type UpdateCodPaymentRule = Pick<
  CodPaymentRule,
  | 'hideByOrderTotal'
  | 'hideDiscountedOrders'
  | 'minimumDiscountAmount'
  | 'paymentMethodName'
  | 'hideBelowOrderTotal'
  | 'hideAboveOrderTotal'
  | 'advancedRules'
>;

export type CodPaymentRuleDraft = {
  hideByOrderTotal: boolean;
  hideDiscountedOrders: boolean;
  minimumDiscountAmount: string;
  paymentMethodName: string;
  hideBelowOrderTotal: string;
  hideAboveOrderTotal: string;
  advancedRules: CodPaymentAdvancedRuleDraft;
};

export type HideCodPaymentMethodSectionProps = {
  draft: CodPaymentRuleDraft;
  setDraft: Dispatch<SetStateAction<CodPaymentRuleDraft>>;
  limitError?: string;
  discountAmountError?: string;
  isLoading: boolean;
};

export type CodPaymentAdvancedRules = {
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

export type CodPaymentAdvancedRuleDraft = {
  [K in keyof CodPaymentAdvancedRules]: CodPaymentAdvancedRules[K] extends boolean
    ? boolean
    : string;
};

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
  limitError?: string;
  isLoading: boolean;
};

export type ShippingMethodSectionProps = {
  draft: CodFeeDraft;
  setField: CodFeeFieldUpdater;
  methods: CodShippingMethod[];
  nameError?: string;
  isLoading: boolean;
  isSyncing: boolean;
  onSync: () => void;
};

export type CodPaymentAdvancedRuleUpdater = <
  K extends keyof CodPaymentAdvancedRuleDraft,
>(
  key: K,
  value: CodPaymentAdvancedRuleDraft[K],
) => void;

export type AdvancedCodRulesSectionProps = {
  rules: CodPaymentAdvancedRuleDraft;
  setRule: CodPaymentAdvancedRuleUpdater;
  disabled: boolean;
  paymentRule: HideCodPaymentMethodSectionProps;
};

export type PaymentMethodSectionProps = {
  draft: CodPaymentRuleDraft;
  setDraft: Dispatch<SetStateAction<CodPaymentRuleDraft>>;
  methods: CodPaymentMethod[];
  nameError?: string;
  isLoading: boolean;
  isSyncing: boolean;
  onSync: () => void;
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

export type CodFeeSettingsSectionProps = {
  draft: CodFeeDraft;
  setField: CodFeeFieldUpdater;
  onFeeTypeChange: (feeType: FeeType) => void;
  feeAmountError?: string;
  minimumError?: string;
  lineItemTitleError?: string;
  displayMessageError?: string;
  disabled: boolean;
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
