import type { CodFeeDraft } from '../../types/cod-fee';

export const initialCodFeeDraft: CodFeeDraft = {
  hideCodShippingMethod: false,
  codShippingMethodName: 'Standard - Cash on Delivery',
  hideBelowOrderTotal: '',
  hideAboveOrderTotal: '',
  feeType: 'fixed',
  feeAmount: '20000',
  minimumOrderAmount: '',
  provinces: '',
  excludedCustomerTags: '',
  feeVariant: '',
  displayMessage: 'COD fee will be added for cash on delivery orders.',
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

export function getShippingLimitError(draft: CodFeeDraft) {
  const hasBothLimits =
    draft.hideBelowOrderTotal !== '' && draft.hideAboveOrderTotal !== '';

  if (
    draft.hideCodShippingMethod &&
    hasBothLimits &&
    Number(draft.hideBelowOrderTotal) >= Number(draft.hideAboveOrderTotal)
  ) {
    return 'The maximum order total must be greater than the minimum.';
  }

  return undefined;
}
