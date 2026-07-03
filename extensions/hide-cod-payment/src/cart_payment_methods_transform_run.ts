import type {
  CartPaymentMethodsTransformRunInput,
  CartPaymentMethodsTransformRunResult,
} from "../generated/api";
import { DeliveryMethod } from "../generated/api";

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
  advancedRules?: Partial<AdvancedRules>;
};

type AdvancedRules = {
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

const DEFAULT_RULES: AdvancedRules = {
  hideCustomerTags: [],
  requireCustomerTags: [],
  hideCustomerEmails: [],
  hideCustomerPhones: [],
  hideCountries: [],
  requireCountries: [],
  hideProvinces: [],
  requireProvinces: [],
  hidePostalCodes: [],
  requirePostalCodes: [],
  hideProductIds: [],
  hideGiftCards: false,
  hideCollectionIds: [],
  requireCollectionIds: [],
  hideProductVendors: [],
  requireProductVendors: [],
  hideShippingRates: [],
  requireShippingRates: [],
  hideLocalPickup: false,
  requireLocalPickup: false,
  hideLocalDelivery: false,
  requireLocalDelivery: false,
};

export function cartPaymentMethodsTransformRun(
  input: CartPaymentMethodsTransformRunInput,
): CartPaymentMethodsTransformRunResult {
  const configuration = (input.paymentCustomization?.metafield?.jsonValue ??
    {}) as Configuration;
  const paymentMethodName = configuration.paymentMethodName?.trim();
  const rules = {
    ...DEFAULT_RULES,
    ...(configuration.advancedRules || {}),
  };

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
      discountAmount > (configuration.minimumDiscountAmount ?? 0)) ||
    shouldHideForCustomer(input, rules) ||
    shouldHideForProducts(input, rules) ||
    input.cart.deliveryGroups.some(
      (group) =>
        shouldHideForLocation(group.deliveryAddress, rules) ||
        shouldHideForDeliveryOption(group.selectedDeliveryOption, rules),
    );

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

function shouldHideForCustomer(
  input: CartPaymentMethodsTransformRunInput,
  rules: AdvancedRules,
) {
  const buyer = input.cart.buyerIdentity;
  const email = normalize(buyer?.email);
  const phone = normalizePhone(buyer?.phone);

  return (
    (rules.hideCustomerTags.length > 0 &&
      Boolean(buyer?.customer?.hideTagMatch)) ||
    (rules.requireCustomerTags.length > 0 &&
      !buyer?.customer?.requireTagMatch) ||
    matches(email, rules.hideCustomerEmails) ||
    matches(phone, rules.hideCustomerPhones, normalizePhone)
  );
}

function shouldHideForProducts(
  input: CartPaymentMethodsTransformRunInput,
  rules: AdvancedRules,
) {
  const products = input.cart.lines
    .map((line) =>
      "product" in line.merchandise ? line.merchandise.product : null,
    )
    .filter((product) => product !== null);
  const hasRequiredCollection = products.some(
    (product) => product.requireCollectionMatch,
  );
  const hasRequiredVendor = products.some((product) =>
    matches(product.vendor, rules.requireProductVendors),
  );

  return (
    products.some((product) => matches(product.id, rules.hideProductIds)) ||
    (rules.hideGiftCards && products.some((product) => product.isGiftCard)) ||
    products.some((product) => product.hideCollectionMatch) ||
    (rules.requireCollectionIds.length > 0 && !hasRequiredCollection) ||
    products.some((product) =>
      matches(product.vendor, rules.hideProductVendors),
    ) ||
    (rules.requireProductVendors.length > 0 && !hasRequiredVendor)
  );
}

function shouldHideForLocation(
  address:
    | CartPaymentMethodsTransformRunInput["cart"]["deliveryGroups"][number]["deliveryAddress"]
    | null
    | undefined,
  rules: AdvancedRules,
) {
  const country = address?.countryCode;
  const province = address?.provinceCode;
  const postalCode = address?.zip;

  return (
    matches(country, rules.hideCountries) ||
    (rules.requireCountries.length > 0 &&
      !matches(country, rules.requireCountries)) ||
    matches(province, rules.hideProvinces) ||
    (rules.requireProvinces.length > 0 &&
      !matches(province, rules.requireProvinces)) ||
    matches(postalCode, rules.hidePostalCodes) ||
    (rules.requirePostalCodes.length > 0 &&
      !matches(postalCode, rules.requirePostalCodes))
  );
}

function shouldHideForDeliveryOption(
  option:
    | CartPaymentMethodsTransformRunInput["cart"]["deliveryGroups"][number]["selectedDeliveryOption"]
    | null
    | undefined,
  rules: AdvancedRules,
) {
  const matchesHiddenRate =
    matches(option?.title, rules.hideShippingRates) ||
    matches(option?.code, rules.hideShippingRates);
  const matchesRequiredRate =
    matches(option?.title, rules.requireShippingRates) ||
    matches(option?.code, rules.requireShippingRates);
  const isLocalPickup = option?.deliveryMethodType === DeliveryMethod.PickUp;
  const isLocalDelivery = option?.deliveryMethodType === DeliveryMethod.Local;

  return (
    matchesHiddenRate ||
    (rules.requireShippingRates.length > 0 && !matchesRequiredRate) ||
    (rules.hideLocalPickup && isLocalPickup) ||
    (rules.requireLocalPickup && !isLocalPickup) ||
    (rules.hideLocalDelivery && isLocalDelivery) ||
    (rules.requireLocalDelivery && !isLocalDelivery)
  );
}

function matches(
  value: unknown,
  configuredValues: string[],
  normalizer: (value: unknown) => string = normalize,
) {
  if (!configuredValues.length) {
    return false;
  }

  const normalizedValue = normalizer(value);
  return configuredValues.some(
    (configured) => normalizer(configured) === normalizedValue,
  );
}

function normalize(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function normalizePhone(value: unknown) {
  return typeof value === "string" ? value.replace(/\D/g, "") : "";
}
