import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { CodDeliveryRule, Prisma, Shop } from '@prisma/client';
import {
  CREATE_COD_DELIVERY_CUSTOMIZATION,
  SET_COD_DELIVERY_ACTIVATION,
  SET_COD_DELIVERY_CONFIGURATION,
} from '../../graphql/mutation/delivery-customization.mutation';
import { DELIVERY_METHODS } from '../../graphql/query/delivery-method.query';
import { ShopifyService } from '../../shopify/shopify.service';
import { CodDeliveryRuleRepository } from './cod-delivery-rule.repository';

const FUNCTION_HANDLE = 'hide-cod-delivery';
const METAFIELD_NAMESPACE = '$app:hide-cod-delivery';
const METAFIELD_KEY = 'function-configuration';

export type CodDeliveryAdvancedRules = {
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

const DEFAULT_ADVANCED_RULES: CodDeliveryAdvancedRules = {
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

export type UpdateCodDeliveryRuleDto = {
  enabled?: boolean;
  shippingMethodName?: string;
  hideBelowOrderTotal?: number | null;
  hideAboveOrderTotal?: number | null;
  advancedRules?: Partial<CodDeliveryAdvancedRules>;
};

type DeliveryCustomizationPayload = {
  deliveryCustomization?: {
    id?: string;
    metafield?: { id?: string } | null;
  } | null;
  userErrors?: Array<{ message: string }>;
};

type MetafieldsSetPayload = {
  metafields?: Array<{ id?: string } | null> | null;
  userErrors?: Array<{ message: string }>;
};

type DeliveryCustomizationActivationPayload = {
  ids?: string[] | null;
  userErrors?: Array<{ message: string }>;
};

@Injectable()
export class CodDeliveryRuleService {
  private readonly logger = new Logger(CodDeliveryRuleService.name);

  constructor(
    private readonly rules: CodDeliveryRuleRepository,
    private readonly shopify: ShopifyService,
  ) {}

  async get(shopId: number) {
    return this.toResponse(await this.rules.getOrCreate(shopId));
  }

  async getShippingMethods(shop: Shop) {
    try {
      const response = await this.shopify.graphql(
        shop.domain,
        DELIVERY_METHODS,
      );
      const nodes =
        (
          response as {
            data?: {
              deliveryProfiles?: {
                nodes?: Array<{
                  profileLocationGroups?: Array<{
                    locationGroupZones?: {
                      nodes?: Array<{
                        methodDefinitions?: {
                          nodes?: Array<{
                            id?: string;
                            name?: string;
                            active?: boolean;
                          }>;
                        };
                      }>;
                    };
                  }>;
                }>;
              };
            };
          }
        ).data?.deliveryProfiles?.nodes || [];

      const methods = nodes
        .flatMap((profile) => profile.profileLocationGroups || [])
        .flatMap((group) => group.locationGroupZones?.nodes || [])
        .flatMap((zone) => zone.methodDefinitions?.nodes || [])
        .filter((method) => method.active !== false)
        .map((method) => ({
          id: method.id || '',
          name: method.name?.trim() || '',
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
        `Could not load shipping methods for ${shop.domain}: ${message}`,
      );
      throw new BadRequestException(
        `Could not load Shopify shipping methods: ${message}`,
      );
    }
  }

  async update(shop: Shop, dto: UpdateCodDeliveryRuleDto) {
    const current = await this.rules.getOrCreate(shop.id);
    const validated = this.validate(dto, current);
    const synced = await this.syncShopify(shop, current, validated);
    const saved = await this.rules.update(shop.id, {
      ...validated,
      ...synced,
    });

    return this.toResponse(saved);
  }

  private validate(dto: UpdateCodDeliveryRuleDto, current: CodDeliveryRule) {
    const enabled =
      typeof dto.enabled === 'boolean' ? dto.enabled : current.enabled;
    const shippingMethodName =
      dto.shippingMethodName === undefined
        ? current.shippingMethodName
        : dto.shippingMethodName.trim();
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
    if (!shippingMethodName || shippingMethodName.length > 255) {
      throw new BadRequestException(
        'Shipping method name is required and must be 255 characters or fewer',
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
      enabled &&
      hideBelowOrderTotal === null &&
      hideAboveOrderTotal === null
    ) {
      throw new BadRequestException(
        'Configure at least one condition before enabling the rule',
      );
    }

    return {
      enabled,
      shippingMethodName,
      hideBelowOrderTotal:
        hideBelowOrderTotal === null
          ? null
          : new Prisma.Decimal(hideBelowOrderTotal),
      hideAboveOrderTotal:
        hideAboveOrderTotal === null
          ? null
          : new Prisma.Decimal(hideAboveOrderTotal),
    };
  }

  private validateAdvancedRules(
    value: Partial<CodDeliveryAdvancedRules> | undefined,
    current: CodDeliveryAdvancedRules,
  ): CodDeliveryAdvancedRules {
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
      return current === null ? null : current.toNumber();
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
    current: CodDeliveryRule,
    rule: {
      enabled: boolean;
      shippingMethodName: string;
      hideBelowOrderTotal: Prisma.Decimal | null;
      hideAboveOrderTotal: Prisma.Decimal | null;
    },
  ) {
    if (!rule.enabled && !current.shopifyDeliveryCustomizationId) {
      return {};
    }

    const configurationValue = JSON.stringify({
      enabled: rule.enabled,
      shippingMethodName: rule.shippingMethodName,
      hideBelowOrderTotal: rule.hideBelowOrderTotal?.toNumber() ?? null,
      hideAboveOrderTotal: rule.hideAboveOrderTotal?.toNumber() ?? null,
    });
    const createMetafield = {
      namespace: METAFIELD_NAMESPACE,
      key: METAFIELD_KEY,
      type: 'json',
      value: configurationValue,
    };

    try {
      if (!current.shopifyDeliveryCustomizationId) {
        return await this.createShopifyCustomization(
          shop.domain,
          rule.enabled,
          createMetafield,
        );
      }

      let shopifyMetafieldId = current.shopifyMetafieldId;

      if (rule.enabled) {
        shopifyMetafieldId = await this.setShopifyConfiguration(
          shop.domain,
          current.shopifyDeliveryCustomizationId,
          configurationValue,
        );
      }

      await this.setShopifyActivation(
        shop.domain,
        current.shopifyDeliveryCustomizationId,
        rule.enabled,
      );

      return {
        shopifyDeliveryCustomizationId: current.shopifyDeliveryCustomizationId,
        shopifyMetafieldId,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown Shopify error';

      this.logger.warn(
        `Could not sync COD delivery rule for ${shop.domain}: ${message}`,
      );
      throw new BadRequestException(
        `Could not update Shopify checkout rule: ${message}`,
      );
    }
  }

  private async createShopifyCustomization(
    shopDomain: string,
    enabled: boolean,
    metafield: {
      namespace: string;
      key: string;
      type: string;
      value: string;
    },
  ) {
    const response = await this.shopify.graphql(
      shopDomain,
      CREATE_COD_DELIVERY_CUSTOMIZATION,
      {
        deliveryCustomization: {
          title: 'VN COD Guard - Hide COD shipping method',
          enabled,
          functionHandle: FUNCTION_HANDLE,
          metafields: [metafield],
        },
      },
    );
    const payload = this.getPayload<DeliveryCustomizationPayload>(
      response,
      'deliveryCustomizationCreate',
    );

    this.throwUserErrors(payload.userErrors);

    const customization = payload.deliveryCustomization;

    if (!customization?.id || !customization.metafield?.id) {
      throw new Error(
        'Shopify did not return the delivery customization identifiers',
      );
    }

    return {
      shopifyDeliveryCustomizationId: customization.id,
      shopifyMetafieldId: customization.metafield.id,
    };
  }

  private async setShopifyConfiguration(
    shopDomain: string,
    ownerId: string,
    value: string,
  ) {
    const response = await this.shopify.graphql(
      shopDomain,
      SET_COD_DELIVERY_CONFIGURATION,
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
      SET_COD_DELIVERY_ACTIVATION,
      {
        ids: [customizationId],
        enabled,
      },
    );
    const payload = this.getPayload<DeliveryCustomizationActivationPayload>(
      response,
      'deliveryCustomizationActivation',
    );

    this.throwUserErrors(payload.userErrors);

    if (!payload.ids?.includes(customizationId)) {
      throw new Error('Shopify did not confirm the delivery rule activation');
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

  private toResponse(rule: CodDeliveryRule) {
    return {
      id: rule.id,
      shopId: rule.shopId,
      enabled: rule.enabled,
      shippingMethodName: rule.shippingMethodName,
      hideBelowOrderTotal: rule.hideBelowOrderTotal?.toNumber() ?? null,
      hideAboveOrderTotal: rule.hideAboveOrderTotal?.toNumber() ?? null,
      advancedRules: this.getAdvancedRules(rule.advancedRulesJson),
      shopifyConfigured: Boolean(rule.shopifyDeliveryCustomizationId),
      updatedAt: rule.updatedAt,
    };
  }

  private getAdvancedRules(
    value: Prisma.JsonValue | Prisma.InputJsonValue | null,
  ): CodDeliveryAdvancedRules {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return { ...DEFAULT_ADVANCED_RULES };
    }

    return this.validateAdvancedRules(
      value as Partial<CodDeliveryAdvancedRules>,
      DEFAULT_ADVANCED_RULES,
    );
  }

  private hasAdvancedRule(rules: CodDeliveryAdvancedRules) {
    return Object.values(rules).some(
      (value) => value === true || (Array.isArray(value) && value.length > 0),
    );
  }
}
