import type { CodFeeDraft, CodPaymentRuleDraft } from '../../types/cod-fee';

export const initialAdvancedPaymentRules = {
  hideCustomerTags: '',
  requireCustomerTags: '',
  hideCustomerEmails: '',
  hideCustomerPhones: '',
  hideCountries: '',
  requireCountries: '',
  hideProvinces: '',
  requireProvinces: '',
  hidePostalCodes: '',
  requirePostalCodes: '',
  hideProductIds: '',
  hideGiftCards: false,
  hideCollectionIds: '',
  requireCollectionIds: '',
  hideProductVendors: '',
  requireProductVendors: '',
  hideShippingRates: '',
  requireShippingRates: '',
  hideLocalPickup: false,
  requireLocalPickup: false,
  hideLocalDelivery: false,
  requireLocalDelivery: false,
} as const;

export const initialCodPaymentRuleDraft: CodPaymentRuleDraft = {
  hideByOrderTotal: false,
  hideDiscountedOrders: false,
  minimumDiscountAmount: '0',
  paymentMethodName: 'Cash on Delivery (COD)',
  hideBelowOrderTotal: '',
  hideAboveOrderTotal: '',
  advancedRules: { ...initialAdvancedPaymentRules },
};

export const initialCodFeeDraft: CodFeeDraft = {
  hideCodShippingMethod: false,
  codShippingMethodName: 'Standard - Cash on Delivery',
  hideBelowOrderTotal: '',
  hideAboveOrderTotal: '',
  feeEnabled: false,
  feeType: 'fixed',
  feeAmount: '20000',
  minimumOrderAmount: '',
  provinces: '',
  excludedCustomerTags: '',
  lineItemTitle: 'COD fee',
  displayMessage: 'A COD fee will be added to this order.',
};

export function getFeeAmountError(draft: CodFeeDraft) {
  const feeAmount = Number(draft.feeAmount);

  if (draft.feeAmount === '' || feeAmount <= 0) {
    return 'Enter a fee greater than 0.';
  }

  if (draft.feeType === 'percentage' && feeAmount > 100) {
    return 'Percentage must be 100 or less.';
  }

  return undefined;
}

export function getCodFeeValidation(draft: CodFeeDraft) {
  const feeAmountError = getFeeAmountError(draft);
  const minimum = Number(draft.minimumOrderAmount);
  const minimumError =
    draft.minimumOrderAmount !== '' &&
    (!Number.isFinite(minimum) || minimum < 0)
      ? 'Enter a valid minimum order total.'
      : undefined;
  const lineItemTitleError = !draft.lineItemTitle.trim()
    ? 'Enter a fee line item title.'
    : draft.lineItemTitle.trim().length > 255
      ? 'Use 255 characters or fewer.'
      : undefined;
  const displayMessageError = !draft.displayMessage.trim()
    ? 'Enter a customer-facing message.'
    : draft.displayMessage.trim().length > 1000
      ? 'Use 1,000 characters or fewer.'
      : undefined;

  return {
    feeAmountError,
    minimumError,
    lineItemTitleError,
    displayMessageError,
    isValid: !(
      feeAmountError ||
      minimumError ||
      lineItemTitleError ||
      displayMessageError
    ),
  };
}

export function getShippingRuleValidation(draft: CodFeeDraft) {
  const shippingMethodName = draft.codShippingMethodName.trim();
  const hasBothLimits =
    draft.hideBelowOrderTotal !== '' && draft.hideAboveOrderTotal !== '';
  const hasAnyLimit =
    draft.hideBelowOrderTotal !== '' || draft.hideAboveOrderTotal !== '';
  const nameError = !shippingMethodName
    ? 'Enter the shipping method name shown at checkout.'
    : undefined;
  let limitError: string | undefined;
  if (
    draft.hideCodShippingMethod &&
    hasBothLimits &&
    Number(draft.hideBelowOrderTotal) >= Number(draft.hideAboveOrderTotal)
  ) {
    limitError = 'The maximum order total must be greater than the minimum.';
  } else if (draft.hideCodShippingMethod && !hasAnyLimit) {
    limitError = 'Enter at least one order total limit.';
  }

  return {
    nameError,
    limitError,
    isValid: !nameError && !limitError,
  };
}

export function getPaymentRuleValidation(draft: CodPaymentRuleDraft) {
  const paymentMethodName = draft.paymentMethodName.trim();
  const hasAnyLimit =
    draft.hideBelowOrderTotal !== '' || draft.hideAboveOrderTotal !== '';
  const hasBothLimits =
    draft.hideBelowOrderTotal !== '' && draft.hideAboveOrderTotal !== '';
  const nameError = !paymentMethodName
    ? 'Enter the payment method name shown at checkout.'
    : undefined;
  let limitError: string | undefined;
  const minimumDiscountAmount = Number(draft.minimumDiscountAmount);
  const discountAmountError =
    draft.hideDiscountedOrders &&
    (draft.minimumDiscountAmount === '' ||
      !Number.isFinite(minimumDiscountAmount) ||
      minimumDiscountAmount < 0)
      ? 'Enter a valid discount amount.'
      : undefined;

  if (
    draft.hideByOrderTotal &&
    hasBothLimits &&
    Number(draft.hideBelowOrderTotal) >= Number(draft.hideAboveOrderTotal)
  ) {
    limitError = 'The maximum order total must be greater than the minimum.';
  } else if (draft.hideByOrderTotal && !hasAnyLimit) {
    limitError = 'Enter at least one order total limit.';
  }

  return {
    nameError,
    limitError,
    discountAmountError,
    isValid: !nameError && !limitError && !discountAmountError,
  };
}
