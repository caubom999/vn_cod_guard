import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { CodPaymentRule, Prisma, Shop } from '@prisma/client';
import {
  CREATE_COD_PAYMENT_CUSTOMIZATION,
  SET_COD_PAYMENT_ACTIVATION,
  SET_COD_PAYMENT_CONFIGURATION,
} from '../../graphql/mutation/payment-customization.mutation';
import { ShopifyService } from '../../shopify/shopify.service';
import { CodPaymentRuleRepository } from './cod-payment-rule.repository';

const FUNCTION_HANDLE = 'hide-cod-payment';
const METAFIELD_NAMESPACE = '$app:hide-cod-payment';
const METAFIELD_KEY = 'function-configuration';

export type UpdateCodPaymentRuleDto = {
  enabled?: boolean;
  paymentMethodName?: string;
  hideBelowOrderTotal?: number | null;
  hideAboveOrderTotal?: number | null;
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

  async update(shop: Shop, dto: UpdateCodPaymentRuleDto) {
    const current = await this.rules.getOrCreate(shop.id);
    const validated = this.validate(dto, current);
    const synced = await this.syncShopify(shop, current, validated);
    const saved = await this.rules.update(shop.id, {
      ...validated,
      ...synced,
    });

    return this.toResponse(saved);
  }

  private validate(dto: UpdateCodPaymentRuleDto, current: CodPaymentRule) {
    const enabled =
      typeof dto.enabled === 'boolean' ? dto.enabled : current.enabled;
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
      enabled &&
      hideBelowOrderTotal === null &&
      hideAboveOrderTotal === null
    ) {
      throw new BadRequestException(
        'Enter at least one order total limit before enabling the rule',
      );
    }

    return {
      enabled,
      paymentMethodName,
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
      paymentMethodName: string;
      hideBelowOrderTotal: Prisma.Decimal | null;
      hideAboveOrderTotal: Prisma.Decimal | null;
    },
  ) {
    if (!rule.enabled && !current.shopifyPaymentCustomizationId) {
      return {};
    }

    const configurationValue = JSON.stringify({
      enabled: rule.enabled,
      paymentMethodName: rule.paymentMethodName,
      hideBelowOrderTotal: rule.hideBelowOrderTotal?.toNumber() ?? null,
      hideAboveOrderTotal: rule.hideAboveOrderTotal?.toNumber() ?? null,
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
      paymentMethodName: rule.paymentMethodName,
      hideBelowOrderTotal: rule.hideBelowOrderTotal?.toNumber() ?? null,
      hideAboveOrderTotal: rule.hideAboveOrderTotal?.toNumber() ?? null,
      shopifyConfigured: Boolean(rule.shopifyPaymentCustomizationId),
      updatedAt: rule.updatedAt,
    };
  }
}
