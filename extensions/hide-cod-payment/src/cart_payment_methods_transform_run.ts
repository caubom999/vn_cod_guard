import type {
  CartPaymentMethodsTransformRunInput,
  CartPaymentMethodsTransformRunResult,
} from "../generated/api";

const NO_CHANGES: CartPaymentMethodsTransformRunResult = {
  operations: [],
};

type Configuration = {
  enabled?: boolean;
  hideByOrderTotal?: boolean;
  hideDiscountedOrders?: boolean;
  minimumDiscountAmount?: number;
  paymentMethodName?: string;
  hideBelowOrderTotal?: number | null;
  hideAboveOrderTotal?: number | null;
};

export function cartPaymentMethodsTransformRun(
  input: CartPaymentMethodsTransformRunInput,
): CartPaymentMethodsTransformRunResult {
  const configuration = (input.paymentCustomization?.metafield?.jsonValue ??
    {}) as Configuration;
  const paymentMethodName = configuration.paymentMethodName?.trim();

  if (!configuration.enabled || !paymentMethodName) {
    return NO_CHANGES;
  }

  const total = Number(input.cart.cost.totalAmount.amount);
  const discountAmount = input.cart.lines.reduce(
    (totalDiscount, line) =>
      totalDiscount +
      line.discountAllocations.reduce(
        (lineDiscount, allocation) =>
          lineDiscount + Number(allocation.discountedAmount.amount),
        0,
      ),
    0,
  );
  const shouldHide =
    (configuration.hideByOrderTotal &&
      ((configuration.hideBelowOrderTotal != null &&
        total < configuration.hideBelowOrderTotal) ||
        (configuration.hideAboveOrderTotal != null &&
          total > configuration.hideAboveOrderTotal))) ||
    (configuration.hideDiscountedOrders &&
      discountAmount > (configuration.minimumDiscountAmount ?? 0));

  if (!shouldHide) {
    return NO_CHANGES;
  }

  const normalizedName = paymentMethodName.toLowerCase();
  const operations = input.paymentMethods
    .filter(
      (paymentMethod) =>
        paymentMethod.name.trim().toLowerCase() === normalizedName,
    )
    .map((paymentMethod) => ({
      paymentMethodHide: {
        paymentMethodId: paymentMethod.id,
      },
    }));

  return { operations };
}
