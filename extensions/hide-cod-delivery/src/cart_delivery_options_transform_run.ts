import type {
  CartDeliveryOptionsTransformRunInput,
  CartDeliveryOptionsTransformRunResult,
} from "../generated/api";

const NO_CHANGES: CartDeliveryOptionsTransformRunResult = {
  operations: [],
};

type Configuration = {
  enabled?: boolean;
  shippingMethodName?: string;
  hideBelowOrderTotal?: number | null;
  hideAboveOrderTotal?: number | null;
};

export function cartDeliveryOptionsTransformRun(
  input: CartDeliveryOptionsTransformRunInput,
): CartDeliveryOptionsTransformRunResult {
  const configuration = (input.deliveryCustomization?.metafield?.jsonValue ??
    {}) as Configuration;
  const shippingMethodName = configuration.shippingMethodName?.trim();

  if (!configuration.enabled || !shippingMethodName) {
    return NO_CHANGES;
  }

  const subtotal = Number(input.cart.cost.subtotalAmount.amount);
  const isBelowMinimum =
    configuration.hideBelowOrderTotal != null &&
    subtotal < configuration.hideBelowOrderTotal;
  const isAboveMaximum =
    configuration.hideAboveOrderTotal != null &&
    subtotal > configuration.hideAboveOrderTotal;

  if (!isBelowMinimum && !isAboveMaximum) {
    return NO_CHANGES;
  }

  const normalizedName = shippingMethodName.toLowerCase();
  const operations = input.cart.deliveryGroups.flatMap((group) =>
    group.deliveryOptions
      .filter((option) => option.title?.trim().toLowerCase() === normalizedName)
      .map((option) => ({
        deliveryOptionHide: {
          deliveryOptionHandle: option.handle,
        },
      })),
  );

  return { operations };
}
