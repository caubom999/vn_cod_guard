import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { CodPaymentRule, Prisma, Shop } from '@prisma/client';
import {
  CREATE_COD_PAYMENT_CUSTOMIZATION,
  SET_COD_PAYMENT_ACTIVATION,
  SET_COD_PAYMENT_CONFIGURATION,
} from '../../graphql/mutation/payment-customization.mutation';
import { PAYMENT_GATEWAYS } from '../../graphql/query/payment-gateway.query';
import { ShopifyService } from '../../shopify/shopify.service';
import { CodPaymentRuleRepository } from './cod-payment-rule.repository';

const FUNCTION_HANDLE = 'hide-cod-payment';
const METAFIELD_NAMESPACE = '$app:hide-cod-payment';
const METAFIELD_KEY = 'function-configuration';

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

const DEFAULT_ADVANCED_RULES: CodPaymentAdvancedRules = {
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

export type UpdateCodPaymentRuleDto = {
  hideByOrderTotal?: boolean;
  hideDiscountedOrders?: boolean;
  minimumDiscountAmount?: number;
  paymentMethodName?: string;
  hideBelowOrderTotal?: number | null;
  hideAboveOrderTotal?: number | null;
  advancedRules?: Partial<CodPaymentAdvancedRules>;
};

type PaymentCustomizationPayload = {
  paymentCustomization?: {
    id?: string;
    metafield?: { id?: string } | null;
  } | null;
  userErrors?: Array<{ message: string }>;
};

type MetafieldsSetPayload = {
  metafields?: Array<{ id?: string } | null> | null;
  userErrors?: Array<{ message: string }>;
};

type PaymentCustomizationActivationPayload = {
  ids?: string[] | null;
  userErrors?: Array<{ message: string }>;
};

@Injectable()
export class CodPaymentRuleService {
  private readonly logger = new Logger(CodPaymentRuleService.name);

  constructor(
    private readonly rules: CodPaymentRuleRepository,
    private readonly shopify: ShopifyService,
  ) {}

  async get(shopId: number) {
    return this.toResponse(await this.rules.getOrCreate(shopId));
  }

  async getPaymentMethods(shop: Shop) {
    try {
      const response = await this.shopify.graphql(
        shop.domain,
        PAYMENT_GATEWAYS,
      );
      const nodes =
        (
          response as {
            data?: {
              translatableResources?: {
                nodes?: Array<{
                  resourceId?: string;
                  translatableContent?: Array<{
                    key?: string;
                    value?: string;
                  }>;
                }>;
              };
            };
          }
        ).data?.translatableResources?.nodes || [];

      const methods = nodes
        .map((node) => ({
          id: node.resourceId || '',
          name:
            node.translatableContent
              ?.find((content) => content.key === 'name')
              ?.value?.trim() || '',
        }))
        .filter(
          (method, index, all) =>
            method.id &&
            method.name &&
            all.findIndex((item) => item.name === method.name) === index,
        );

      return { methods };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown Shopify error';

      this.logger.warn(
        `Could not load payment methods for ${shop.domain}: ${message}`,
      );
      throw new BadRequestException(
        `Could not load Shopify payment methods: ${message}`,
      );
    }
  }

  async update(shop: Shop, dto: UpdateCodPaymentRuleDto) {
    const current = await this.rules.getOrCreate(shop.id);
    const validated = this.validate(dto, current);
    const synced = await this.syncShopify(shop, current, validated);
    const saved = await this.rules.update(shop.id, {
      ...validated,
      ...synced,
      configurationVersion: 2,
    });

    return this.toResponse(saved);
  }

  private validate(dto: UpdateCodPaymentRuleDto, current: CodPaymentRule) {
    const hideByOrderTotal =
      typeof dto.hideByOrderTotal === 'boolean'
        ? dto.hideByOrderTotal
        : current.hideByOrderTotal;
    const hideDiscountedOrders =
      typeof dto.hideDiscountedOrders === 'boolean'
        ? dto.hideDiscountedOrders
        : current.hideDiscountedOrders;
    const minimumDiscountAmount =
      dto.minimumDiscountAmount === undefined
        ? current.minimumDiscountAmount.toNumber()
        : dto.minimumDiscountAmount;
    const advancedRules = this.validateAdvancedRules(
      dto.advancedRules,
      this.getAdvancedRules(current.advancedRulesJson),
    );
    const enabled =
      hideByOrderTotal ||
      hideDiscountedOrders ||
      this.hasAdvancedRule(advancedRules);
    const paymentMethodName =
      dto.paymentMethodName === undefined
        ? current.paymentMethodName
        : dto.paymentMethodName.trim();
    const hideBelowOrderTotal = this.amountOrNull(
      dto.hideBelowOrderTotal,
      current.hideBelowOrderTotal,
      'hideBelowOrderTotal',
    );
    const hideAboveOrderTotal = this.amountOrNull(
      dto.hideAboveOrderTotal,
      current.hideAboveOrderTotal,
      'hideAboveOrderTotal',
    );

    if (!paymentMethodName || paymentMethodName.length > 255) {
      throw new BadRequestException(
        'Payment method name is required and must be 255 characters or fewer',
      );
    }

    if (
      hideBelowOrderTotal !== null &&
      hideAboveOrderTotal !== null &&
      hideBelowOrderTotal >= hideAboveOrderTotal
    ) {
      throw new BadRequestException(
        'Maximum order total must be greater than minimum order total',
      );
    }

    if (
      hideByOrderTotal &&
      hideBelowOrderTotal === null &&
      hideAboveOrderTotal === null
    ) {
      throw new BadRequestException(
        'Enter at least one order total limit before enabling the rule',
      );
    }

    if (
      !Number.isFinite(minimumDiscountAmount) ||
      minimumDiscountAmount < 0 ||
      minimumDiscountAmount > 999999999999
    ) {
      throw new BadRequestException(
        'Minimum discount amount must be a valid positive amount',
      );
    }

    return {
      enabled,
      hideByOrderTotal,
      hideDiscountedOrders,
      minimumDiscountAmount: new Prisma.Decimal(minimumDiscountAmount),
      paymentMethodName,
      hideBelowOrderTotal:
        hideBelowOrderTotal === null
          ? null
          : new Prisma.Decimal(hideBelowOrderTotal),
      hideAboveOrderTotal:
        hideAboveOrderTotal === null
          ? null
          : new Prisma.Decimal(hideAboveOrderTotal),
      advancedRulesJson: advancedRules as unknown as Prisma.InputJsonValue,
    };
  }

  private validateAdvancedRules(
    value: Partial<CodPaymentAdvancedRules> | undefined,
    current: CodPaymentAdvancedRules,
  ): CodPaymentAdvancedRules {
    const source = value || current;
    const booleanKeys = [
      'hideGiftCards',
      'hideLocalPickup',
      'requireLocalPickup',
      'hideLocalDelivery',
      'requireLocalDelivery',
    ] as const;
    const listKeys = [
      'hideCustomerTags',
      'requireCustomerTags',
      'hideCustomerEmails',
      'hideCustomerPhones',
      'hideCountries',
      'requireCountries',
      'hideProvinces',
      'requireProvinces',
      'hidePostalCodes',
      'requirePostalCodes',
      'hideProductIds',
      'hideCollectionIds',
      'requireCollectionIds',
      'hideProductVendors',
      'requireProductVendors',
      'hideShippingRates',
      'requireShippingRates',
    ] as const;
    const result = { ...DEFAULT_ADVANCED_RULES };

    for (const key of booleanKeys) {
      result[key] =
        typeof source[key] === 'boolean' ? source[key] : current[key];
    }

    for (const key of listKeys) {
      const list = source[key];

      if (!Array.isArray(list)) {
        result[key] = current[key];
        continue;
      }

      const cleaned = [
        ...new Set(
          list
            .filter((item): item is string => typeof item === 'string')
            .map((item) => item.trim())
            .filter(Boolean),
        ),
      ];

      if (cleaned.length > 100 || cleaned.some((item) => item.length > 255)) {
        throw new BadRequestException(
          `${key} supports up to 100 values of 255 characters each`,
        );
      }

      if (
        (key === 'hideCollectionIds' || key === 'requireCollectionIds') &&
        cleaned.some((item) => !/^gid:\/\/shopify\/Collection\/\d+$/.test(item))
      ) {
        throw new BadRequestException(
          `${key} values must be Shopify collection GIDs`,
        );
      }

      if (
        key === 'hideProductIds' &&
        cleaned.some((item) => !/^gid:\/\/shopify\/Product\/\d+$/.test(item))
      ) {
        throw new BadRequestException(
          'hideProductIds values must be Shopify product GIDs',
        );
      }

      result[key] = cleaned;
    }

    return result;
  }

  private amountOrNull(
    value: number | null | undefined,
    current: Prisma.Decimal | null,
    field: string,
  ) {
    if (value === undefined) {
      return current?.toNumber() ?? null;
    }

    if (value === null) {
      return null;
    }

    if (!Number.isFinite(value) || value < 0 || value > 999999999999) {
      throw new BadRequestException(`${field} must be a valid positive amount`);
    }

    return value;
  }

  private async syncShopify(
    shop: Shop,
    current: CodPaymentRule,
    rule: {
      enabled: boolean;
      hideByOrderTotal: boolean;
      hideDiscountedOrders: boolean;
      minimumDiscountAmount: Prisma.Decimal;
      paymentMethodName: string;
      hideBelowOrderTotal: Prisma.Decimal | null;
      hideAboveOrderTotal: Prisma.Decimal | null;
      advancedRulesJson: Prisma.InputJsonValue;
    },
  ) {
    if (!rule.enabled && !current.shopifyPaymentCustomizationId) {
      return {};
    }

    const advancedRules = this.getAdvancedRules(rule.advancedRulesJson);
    const configurationValue = JSON.stringify({
      enabled: rule.enabled,
      hideByOrderTotal: rule.hideByOrderTotal,
      hideDiscountedOrders: rule.hideDiscountedOrders,
      minimumDiscountAmount: rule.minimumDiscountAmount.toNumber(),
      paymentMethodName: rule.paymentMethodName,
      hideBelowOrderTotal: rule.hideBelowOrderTotal?.toNumber() ?? null,
      hideAboveOrderTotal: rule.hideAboveOrderTotal?.toNumber() ?? null,
      advancedRules,
      hideCustomerTags: advancedRules.hideCustomerTags,
      requireCustomerTags: advancedRules.requireCustomerTags,
      hideCollectionIds: advancedRules.hideCollectionIds,
      requireCollectionIds: advancedRules.requireCollectionIds,
    });

    try {
      if (!current.shopifyPaymentCustomizationId) {
        return await this.createShopifyCustomization(
          shop.domain,
          rule.enabled,
          configurationValue,
        );
      }

      let shopifyMetafieldId = current.shopifyMetafieldId;

      if (rule.enabled) {
        shopifyMetafieldId = await this.setShopifyConfiguration(
          shop.domain,
          current.shopifyPaymentCustomizationId,
          configurationValue,
        );
      }

      await this.setShopifyActivation(
        shop.domain,
        current.shopifyPaymentCustomizationId,
        rule.enabled,
      );

      return {
        shopifyPaymentCustomizationId: current.shopifyPaymentCustomizationId,
        shopifyMetafieldId,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown Shopify error';

      this.logger.warn(
        `Could not sync COD payment rule for ${shop.domain}: ${message}`,
      );
      throw new BadRequestException(
        `Could not update Shopify payment rule: ${message}`,
      );
    }
  }

  private async createShopifyCustomization(
    shopDomain: string,
    enabled: boolean,
    value: string,
  ) {
    const response = await this.shopify.graphql(
      shopDomain,
      CREATE_COD_PAYMENT_CUSTOMIZATION,
      {
        paymentCustomization: {
          title: 'VN COD Guard - Hide COD payment method',
          enabled,
          functionHandle: FUNCTION_HANDLE,
          metafields: [
            {
              namespace: METAFIELD_NAMESPACE,
              key: METAFIELD_KEY,
              type: 'json',
              value,
            },
          ],
        },
      },
    );
    const payload = this.getPayload<PaymentCustomizationPayload>(
      response,
      'paymentCustomizationCreate',
    );

    this.throwUserErrors(payload.userErrors);

    if (
      !payload.paymentCustomization?.id ||
      !payload.paymentCustomization.metafield?.id
    ) {
      throw new Error(
        'Shopify did not return the payment customization identifiers',
      );
    }

    return {
      shopifyPaymentCustomizationId: payload.paymentCustomization.id,
      shopifyMetafieldId: payload.paymentCustomization.metafield.id,
    };
  }

  private async setShopifyConfiguration(
    shopDomain: string,
    ownerId: string,
    value: string,
  ) {
    const response = await this.shopify.graphql(
      shopDomain,
      SET_COD_PAYMENT_CONFIGURATION,
      {
        metafields: [
          {
            ownerId,
            namespace: METAFIELD_NAMESPACE,
            key: METAFIELD_KEY,
            type: 'json',
            value,
          },
        ],
      },
    );
    const payload = this.getPayload<MetafieldsSetPayload>(
      response,
      'metafieldsSet',
    );

    this.throwUserErrors(payload.userErrors);

    const metafieldId = payload.metafields?.[0]?.id;

    if (!metafieldId) {
      throw new Error('Shopify did not return the configuration metafield ID');
    }

    return metafieldId;
  }

  private async setShopifyActivation(
    shopDomain: string,
    customizationId: string,
    enabled: boolean,
  ) {
    const response = await this.shopify.graphql(
      shopDomain,
      SET_COD_PAYMENT_ACTIVATION,
      {
        ids: [customizationId],
        enabled,
      },
    );
    const payload = this.getPayload<PaymentCustomizationActivationPayload>(
      response,
      'paymentCustomizationActivation',
    );

    this.throwUserErrors(payload.userErrors);

    if (!payload.ids?.includes(customizationId)) {
      throw new Error('Shopify did not confirm the payment rule activation');
    }
  }

  private getPayload<T>(response: unknown, key: string) {
    const data = (response as { data?: Record<string, unknown> })?.data;
    return (data?.[key] || {}) as T;
  }

  private throwUserErrors(errors?: Array<{ message: string }>) {
    if (errors?.length) {
      throw new Error(errors.map((error) => error.message).join('; '));
    }
  }

  private toResponse(rule: CodPaymentRule) {
    return {
      id: rule.id,
      shopId: rule.shopId,
      enabled: rule.enabled,
      hideByOrderTotal: rule.hideByOrderTotal,
      hideDiscountedOrders: rule.hideDiscountedOrders,
      minimumDiscountAmount: rule.minimumDiscountAmount.toNumber(),
      paymentMethodName: rule.paymentMethodName,
      hideBelowOrderTotal: rule.hideBelowOrderTotal?.toNumber() ?? null,
      hideAboveOrderTotal: rule.hideAboveOrderTotal?.toNumber() ?? null,
      advancedRules: this.getAdvancedRules(rule.advancedRulesJson),
      configurationVersion: rule.configurationVersion,
      shopifyConfigured: Boolean(rule.shopifyPaymentCustomizationId),
      updatedAt: rule.updatedAt,
    };
  }

  private getAdvancedRules(
    value: Prisma.JsonValue | Prisma.InputJsonValue | null,
  ): CodPaymentAdvancedRules {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return { ...DEFAULT_ADVANCED_RULES };
    }

    return this.validateAdvancedRules(
      value as Partial<CodPaymentAdvancedRules>,
      DEFAULT_ADVANCED_RULES,
    );
  }

  private hasAdvancedRule(rules: CodPaymentAdvancedRules) {
    return Object.values(rules).some(
      (value) => value === true || (Array.isArray(value) && value.length > 0),
    );
  }
}
