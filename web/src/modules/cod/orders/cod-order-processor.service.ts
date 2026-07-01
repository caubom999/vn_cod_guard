import { Injectable, Logger } from '@nestjs/common';
import {
  CodOrderStatus,
  CodShopSetting,
  Prisma,
  Shop,
  WebhookEvent,
} from '@prisma/client';
import { BillingService } from '../../billing/billing.service';
import { ADD_SHOPIFY_TAGS } from '../../graphql/mutation/order.mutation';
import { ShopifyService } from '../../shopify/shopify.service';
import { AutomationService } from '../automation/automation.service';
import {
  COD_DEFAULT_PAYMENT_NAMES,
  COD_DEFAULT_TAGS,
  COD_RISK_REVIEW_THRESHOLD,
} from '../cod.constants';
import { RiskService } from '../risk/risk.service';
import { RiskResult } from '../risk/risk.types';
import { CodFeeService } from '../fee/cod-fee.service';
import { normalizeVietnamPhone } from '../utils/phone-normalizer';
import { VerificationService } from '../verification/verification.service';
import { CodOrderRepository } from './cod-order.repository';

type ShopifyOrderPayload = Record<string, unknown>;

type ProcessOrdersCreateInput = {
  shop: Shop;
  event: WebhookEvent;
  payload: ShopifyOrderPayload;
};

@Injectable()
export class CodOrderProcessorService {
  private readonly logger = new Logger(CodOrderProcessorService.name);

  constructor(
    private readonly orders: CodOrderRepository,
    private readonly shopify: ShopifyService,
    private readonly verifications: VerificationService,
    private readonly automation: AutomationService,
    private readonly risks: RiskService,
    private readonly billing: BillingService,
    private readonly codFees: CodFeeService,
  ) {}

  async processOrdersCreate({
    shop,
    event,
    payload,
  }: ProcessOrdersCreateInput) {
    const setting = await this.orders.getOrCreateShopSetting(shop.id);
    const paymentNames = this.getPaymentNames(payload);
    const isCod = this.isCodPayment(paymentNames, setting);
    const shopifyOrderGid = this.getShopifyOrderGid(payload, event);

    if (!shopifyOrderGid) {
      throw new Error('Missing Shopify order id in orders/create webhook');
    }

    const customer = this.getObject(payload, 'customer');
    const shippingAddress = this.getObject(payload, 'shipping_address');
    const billingAddress = this.getObject(payload, 'billing_address');
    const customerPhone = this.firstString(
      this.getString(shippingAddress, 'phone'),
      this.getString(customer, 'phone'),
      this.getString(billingAddress, 'phone'),
    );
    const normalizedPhone = normalizeVietnamPhone(customerPhone);
    const customerEmail = this.firstString(
      this.getString(customer, 'email'),
      this.getString(payload, 'email'),
    );
    const shippingProvince = this.getString(shippingAddress, 'province');
    const shippingCity = this.getString(shippingAddress, 'city');
    const shippingDistrict = this.firstString(
      this.getString(shippingAddress, 'district'),
      this.getString(shippingAddress, 'district_name'),
      this.getString(shippingAddress, 'county'),
    );
    const totalAmount = this.getOrderAmount(payload);
    const risk = await this.risks.evaluate({
      shopId: shop.id,
      shopifyOrderGid,
      isCod,
      totalAmount,
      customerEmail,
      customerPhone,
      normalizedPhone,
      shippingProvince,
      shippingCity,
      shippingDistrict,
      shippingAddressJson: shippingAddress,
    });
    const billingEntitlement = isCod
      ? await this.billing.getEntitlement({
          shopId: shop.id,
          excludeShopifyOrderGid: shopifyOrderGid,
        })
      : null;
    const billingLimitReached = Boolean(
      billingEntitlement && !billingEntitlement.canProcessNextOrder,
    );
    const status = billingLimitReached
      ? CodOrderStatus.NEEDS_REVIEW
      : this.getInitialStatus(isCod, risk);
    const expiresAt =
      isCod && !billingLimitReached
        ? this.addMinutes(new Date(), setting.confirmationDeadlineMinutes)
        : null;

    const codOrder = await this.orders.upsertOrder({
      shopId: shop.id,
      shopifyOrderGid,
      orderName: this.getString(payload, 'name'),
      orderNumber: this.getOrderNumber(payload),
      currency: this.getString(payload, 'currency'),
      totalAmount,
      paymentMethod: paymentNames.join(', ') || null,
      financialStatus: this.getString(payload, 'financial_status'),
      fulfillmentStatus: this.getString(payload, 'fulfillment_status'),
      customerName: this.getCustomerName(customer, shippingAddress),
      customerEmail,
      customerPhone,
      normalizedPhone,
      shippingProvince,
      shippingCity,
      shippingDistrict,
      shippingAddressJson: shippingAddress as Prisma.InputJsonValue,
      lineItemsJson: this.getLineItems(payload) as Prisma.InputJsonValue,
      isCod,
      status,
      riskScore: risk.score,
      riskReasonJson: risk.reasons as Prisma.InputJsonValue,
      expiresAt,
      lastSyncedAt: new Date(),
    });

    await this.orders.createEvent({
      codOrderId: codOrder.id,
      type: isCod ? 'ORDER_CAPTURED' : 'ORDER_SKIPPED_NON_COD',
      message: isCod
        ? 'COD order snapshot created from orders/create webhook.'
        : 'Order snapshot created and skipped because payment method is not COD.',
      metadataJson: {
        webhookEventId: event.id,
        paymentNames,
        tags: this.getTagsForOrder(setting, isCod, risk),
        billing: billingEntitlement
          ? {
              planKey: billingEntitlement.plan.key,
              monthlyCodOrderLimit:
                billingEntitlement.usage.monthlyCodOrderLimit,
              usedBeforeThisOrder: billingEntitlement.usage.codOrdersUsed,
              limitReached: billingLimitReached,
            }
          : undefined,
      } as Prisma.InputJsonValue,
    });

    await this.applyCodFee({
      shop,
      codOrderId: codOrder.id,
      shopifyOrderGid,
      isCod,
      totalAmount,
      currency: this.getString(payload, 'currency'),
      shippingProvince,
      shippingCity,
      customerTags: this.getTags(customer),
      alreadyAppliedAt: codOrder.codFeeAppliedAt,
    });

    if (billingLimitReached && billingEntitlement) {
      await this.billing.recordLimitReached({
        shopId: shop.id,
        planKey: billingEntitlement.plan.key,
        usageCount: billingEntitlement.usage.codOrdersUsed + 1,
        monthlyLimit: billingEntitlement.usage.monthlyCodOrderLimit,
        shopifyOrderGid,
      });

      await this.orders.createEvent({
        codOrderId: codOrder.id,
        type: 'BILLING_LIMIT_REACHED',
        message:
          'Monthly COD order quota reached. Verification is paused until the merchant upgrades or the next billing period starts.',
        metadataJson: {
          planKey: billingEntitlement.plan.key,
          monthlyCodOrderLimit: billingEntitlement.usage.monthlyCodOrderLimit,
          usedIncludingThisOrder: billingEntitlement.usage.codOrdersUsed + 1,
        } as Prisma.InputJsonValue,
      });

      await this.syncShopifyTags({
        shopDomain: shop.domain,
        shopifyOrderGid,
        codOrderId: codOrder.id,
        tags: [setting.riskTag || COD_DEFAULT_TAGS.risky],
      });

      return codOrder;
    }

    if (isCod && expiresAt) {
      const { session } = await this.verifications.createSessionForOrder({
        codOrderId: codOrder.id,
        expiresAt,
        channel: setting.defaultChannel,
      });

      await this.orders.createEvent({
        codOrderId: codOrder.id,
        verificationSessionId: session.id,
        type: 'VERIFICATION_LINK_READY',
        message:
          'Verification token was generated and only tokenHash was stored.',
        metadataJson: {
          tokenHash: session.tokenHash,
          publicPath: '/api/verify/:token',
        } as Prisma.InputJsonValue,
      });

      await this.automation.scheduleInitialJobs({
        codOrderId: codOrder.id,
        expiresAt,
        setting,
      });

      await this.syncShopifyTags({
        shopDomain: shop.domain,
        shopifyOrderGid,
        codOrderId: codOrder.id,
        tags: this.getTagsForOrder(setting, isCod, risk),
      });
    }

    return codOrder;
  }

  private async applyCodFee(input: {
    shop: Shop;
    codOrderId: number;
    shopifyOrderGid: string;
    isCod: boolean;
    totalAmount: Prisma.Decimal | null;
    currency: string | null;
    shippingProvince: string | null;
    shippingCity: string | null;
    customerTags: string[];
    alreadyAppliedAt: Date | null;
  }) {
    try {
      const result = await this.codFees.applyToOrder({
        shop: input.shop,
        codOrderId: input.codOrderId,
        shopifyOrderGid: input.shopifyOrderGid,
        isCod: input.isCod,
        orderTotal: input.totalAmount,
        currency: input.currency,
        shippingProvince: input.shippingProvince,
        shippingCity: input.shippingCity,
        customerTags: input.customerTags,
        alreadyAppliedAt: input.alreadyAppliedAt,
      });

      await this.orders.createEvent({
        codOrderId: input.codOrderId,
        type:
          result.status === 'applied'
            ? 'COD_FEE_APPLIED'
            : result.status === 'already-applied'
              ? 'COD_FEE_ALREADY_APPLIED'
              : 'COD_FEE_SKIPPED',
        message:
          result.status === 'skipped'
            ? result.reason
            : result.status === 'applied'
              ? 'COD fee was added to the Shopify order.'
              : 'COD fee was already present on the Shopify order.',
        metadataJson:
          result.status === 'skipped'
            ? undefined
            : ({
                amount: result.amount,
                currency: input.currency,
              } as Prisma.InputJsonValue),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      this.logger.warn(
        `Could not apply COD fee to ${input.shopifyOrderGid}: ${message}`,
      );
      await this.codFees.markFailed(input.codOrderId, message);
      await this.orders.createEvent({
        codOrderId: input.codOrderId,
        type: 'COD_FEE_FAILED',
        message,
      });
    }
  }

  private async syncShopifyTags(input: {
    shopDomain: string;
    shopifyOrderGid: string;
    codOrderId: number;
    tags: string[];
  }) {
    if (!input.tags.length) {
      return;
    }

    try {
      const response = await this.shopify.graphql(
        input.shopDomain,
        ADD_SHOPIFY_TAGS,
        {
          id: input.shopifyOrderGid,
          tags: input.tags,
        },
      );

      const userErrors = this.getGraphqlUserErrors(response);

      if (userErrors.length) {
        await this.orders.createEvent({
          codOrderId: input.codOrderId,
          type: 'SHOPIFY_TAG_SYNC_FAILED',
          message: userErrors.map((error) => error.message).join('; '),
          metadataJson: {
            tags: input.tags,
            userErrors,
          } as Prisma.InputJsonValue,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      this.logger.warn(`Could not sync Shopify COD tags: ${message}`);

      await this.orders.createEvent({
        codOrderId: input.codOrderId,
        type: 'SHOPIFY_TAG_SYNC_FAILED',
        message,
        metadataJson: { tags: input.tags } as Prisma.InputJsonValue,
      });
    }
  }

  private getLineItems(payload: ShopifyOrderPayload) {
    const lineItems = payload.line_items;

    if (!Array.isArray(lineItems)) {
      return [];
    }

    return lineItems.map((item) => {
      const lineItem =
        item && typeof item === 'object'
          ? (item as Record<string, unknown>)
          : {};

      return {
        title: this.getString(lineItem, 'title'),
        variantTitle: this.getString(lineItem, 'variant_title'),
        sku: this.getString(lineItem, 'sku'),
        quantity: this.getNumber(lineItem, 'quantity') || 1,
        price: this.getString(lineItem, 'price'),
      };
    });
  }

  private getPaymentNames(payload: ShopifyOrderPayload) {
    const gatewayNames = this.getStringArray(payload, 'payment_gateway_names');
    const fallbackNames = [
      this.getString(payload, 'gateway'),
      this.getString(payload, 'processing_method'),
    ].filter(Boolean) as string[];

    return [...gatewayNames, ...fallbackNames]
      .map((name) => name.trim())
      .filter(Boolean);
  }

  private isCodPayment(paymentNames: string[], setting: CodShopSetting) {
    const configuredNames = this.getConfiguredCodPaymentNames(setting);
    const codNames = configuredNames.length
      ? configuredNames
      : COD_DEFAULT_PAYMENT_NAMES;
    const normalizedCodNames = codNames.map((name) => this.normalizeText(name));

    return paymentNames.some((name) =>
      normalizedCodNames.some((codName) =>
        this.normalizeText(name).includes(codName),
      ),
    );
  }

  private getConfiguredCodPaymentNames(setting: CodShopSetting) {
    if (!Array.isArray(setting.codPaymentNamesJson)) {
      return [];
    }

    return setting.codPaymentNamesJson.filter(
      (name): name is string =>
        typeof name === 'string' && Boolean(name.trim()),
    );
  }

  private getInitialStatus(isCod: boolean, risk: RiskResult) {
    if (!isCod) {
      return CodOrderStatus.SKIPPED;
    }

    return risk.score >= COD_RISK_REVIEW_THRESHOLD
      ? CodOrderStatus.NEEDS_REVIEW
      : CodOrderStatus.PENDING;
  }

  private getTagsForOrder(
    setting: CodShopSetting,
    isCod: boolean,
    risk: RiskResult,
  ) {
    if (!isCod) {
      return [];
    }

    const tags = [setting.pendingTag || COD_DEFAULT_TAGS.pending];

    if (risk.score >= COD_RISK_REVIEW_THRESHOLD) {
      tags.push(setting.riskTag || COD_DEFAULT_TAGS.risky);
    }

    return tags;
  }

  private getShopifyOrderGid(
    payload: ShopifyOrderPayload,
    event: WebhookEvent,
  ) {
    if (event.shopifyOrderGid) {
      return event.shopifyOrderGid;
    }

    const adminGraphqlApiId = this.getString(payload, 'admin_graphql_api_id');

    if (adminGraphqlApiId) {
      return adminGraphqlApiId;
    }

    const id = this.getString(payload, 'id') || this.getNumber(payload, 'id');

    return id ? `gid://shopify/Order/${id}` : null;
  }

  private getOrderAmount(payload: ShopifyOrderPayload) {
    const amount = this.firstString(
      this.getString(payload, 'current_total_price'),
      this.getString(payload, 'total_price'),
      this.getString(payload, 'subtotal_price'),
    );

    return amount ? new Prisma.Decimal(amount) : null;
  }

  private getOrderNumber(payload: ShopifyOrderPayload) {
    const number = this.getNumber(payload, 'order_number');

    return number ? String(number) : this.getString(payload, 'order_number');
  }

  private getCustomerName(
    customer: Record<string, unknown> | null,
    shippingAddress: Record<string, unknown> | null,
  ) {
    const shippingName = this.getString(shippingAddress, 'name');

    if (shippingName) {
      return shippingName;
    }

    return (
      [
        this.getString(customer, 'first_name'),
        this.getString(customer, 'last_name'),
      ]
        .filter(Boolean)
        .join(' ')
        .trim() || null
    );
  }

  private getGraphqlUserErrors(response: unknown): Array<{ message: string }> {
    const body = response as {
      data?: { tagsAdd?: { userErrors?: Array<{ message?: string }> } };
    };

    return (body.data?.tagsAdd?.userErrors || [])
      .filter((error) => error.message)
      .map((error) => ({ message: error.message || '' }));
  }

  private addMinutes(date: Date, minutes: number) {
    return new Date(date.getTime() + minutes * 60 * 1000);
  }

  private getObject(source: Record<string, unknown>, key: string) {
    const value = source[key];

    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  }

  private getString(source: Record<string, unknown> | null, key: string) {
    const value = source?.[key];

    return typeof value === 'string' && value.trim() ? value : null;
  }

  private getNumber(source: Record<string, unknown>, key: string) {
    const value = source[key];

    return typeof value === 'number' ? value : null;
  }

  private getStringArray(source: Record<string, unknown>, key: string) {
    const value = source[key];

    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === 'string')
      : [];
  }

  private getTags(source: Record<string, unknown> | null) {
    const value = source?.tags;

    if (Array.isArray(value)) {
      return value.filter(
        (item): item is string =>
          typeof item === 'string' && Boolean(item.trim()),
      );
    }

    return typeof value === 'string'
      ? value
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean)
      : [];
  }

  private firstString(...values: Array<string | null | undefined>) {
    return values.find((value) => value && value.trim()) || null;
  }

  private normalizeText(value: string) {
    return value
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }
}
