import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BillingEventType,
  BillingPlanKey,
  BillingSubscriptionStatus,
  Prisma,
  Shop,
} from '@prisma/client';
import {
  CANCEL_APP_SUBSCRIPTION,
  CREATE_APP_SUBSCRIPTION,
} from '../graphql/mutation/billing.mutation';
import { CURRENT_APP_SUBSCRIPTIONS } from '../graphql/query/billing.query';
import { ShopifyService } from '../shopify/shopify.service';
import { BillingRepository } from './billing.repository';
import {
  BILLING_LIMIT_WARNING_RATIO,
  BILLING_PLANS,
} from './billing.constants';

type ShopifyBillingUserError = {
  field?: string[];
  message: string;
};

type ShopifyAppSubscription = {
  id?: string;
  name?: string;
  status?: string;
  trialDays?: number;
  createdAt?: string;
  currentPeriodEnd?: string;
};

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly billing: BillingRepository,
    private readonly shopify: ShopifyService,
    private readonly config: ConfigService,
  ) {}

  getPlans() {
    return Object.values(BILLING_PLANS);
  }

  ensureDefaultSubscription(shopId: number) {
    return this.billing.ensureDefaultSubscription(shopId);
  }

  async getSummary(shop: Shop) {
    const subscription = await this.billing.ensureDefaultSubscription(shop.id);
    const plan = BILLING_PLANS[subscription.planKey];
    const period = this.getCurrentUsagePeriod();
    const usageCount = await this.billing.countCodOrders({
      shopId: shop.id,
      periodStart: period.start,
      periodEnd: period.end,
    });

    return {
      plans: this.getPlans(),
      subscription,
      currentPlan: plan,
      usage: this.buildUsage(plan.monthlyCodOrderLimit, usageCount, period),
      billingTest: this.isBillingTestMode(),
    };
  }

  async getEntitlement(input: {
    shopId: number;
    excludeShopifyOrderGid?: string;
  }) {
    const subscription = await this.billing.ensureDefaultSubscription(
      input.shopId,
    );
    const plan = BILLING_PLANS[subscription.planKey];
    const period = this.getCurrentUsagePeriod();
    const usageCount = await this.billing.countCodOrders({
      shopId: input.shopId,
      periodStart: period.start,
      periodEnd: period.end,
      excludeShopifyOrderGid: input.excludeShopifyOrderGid,
    });
    const usage = this.buildUsage(
      plan.monthlyCodOrderLimit,
      usageCount,
      period,
    );

    return {
      subscription,
      plan,
      usage,
      canProcessNextOrder: usageCount < plan.monthlyCodOrderLimit,
    };
  }

  async createSubscription(shop: Shop, planKey: BillingPlanKey) {
    if (planKey === BillingPlanKey.FREE) {
      throw new BadRequestException('Use select-free for the Free plan');
    }

    const plan = BILLING_PLANS[planKey];

    if (!plan) {
      throw new BadRequestException('Unknown billing plan');
    }

    const returnUrl = this.buildReturnUrl(shop.domain);
    const billingTest = this.isBillingTestMode();

    let response: unknown;

    try {
      response = await this.shopify.graphql(
        shop.domain,
        CREATE_APP_SUBSCRIPTION,
        {
          name: plan.name,
          returnUrl,
          trialDays: plan.trialDays,
          test: billingTest,
          lineItems: [
            {
              plan: {
                appRecurringPricingDetails: {
                  price: {
                    amount: plan.priceUsd,
                    currencyCode: 'USD',
                  },
                  interval: 'EVERY_30_DAYS',
                },
              },
            },
          ],
        },
      );
    } catch (error) {
      const message = this.errorMessage(error);

      this.logger.warn(
        'Shopify billing request failed for ' +
          shop.domain +
          ' plan ' +
          planKey +
          ': ' +
          message,
      );

      throw new BadRequestException(
        'Could not create Shopify billing subscription: ' + message,
      );
    }

    const payload = (response as any)?.data?.appSubscriptionCreate;
    const userErrors = (payload?.userErrors || []) as ShopifyBillingUserError[];

    if (userErrors.length) {
      const message = userErrors.map((error) => error.message).join('; ');

      this.logger.warn(
        'Shopify billing user error for ' +
          shop.domain +
          ' plan ' +
          planKey +
          ': ' +
          message,
      );

      throw new BadRequestException(message);
    }

    const appSubscription = payload?.appSubscription as
      | ShopifyAppSubscription
      | undefined;
    const confirmationUrl = payload?.confirmationUrl as string | undefined;

    if (!confirmationUrl || !appSubscription?.id) {
      throw new BadRequestException(
        'Shopify did not return a billing confirmation URL',
      );
    }

    const subscription = await this.billing.upsertSubscription({
      shopId: shop.id,
      planKey,
      status: BillingSubscriptionStatus.PENDING,
      shopifySubscriptionGid: appSubscription.id,
      confirmationUrl,
      trialEndsAt: this.addDays(new Date(), plan.trialDays),
      currentPeriodStartedAt: new Date(),
      currentPeriodEndsAt: this.toDate(appSubscription.currentPeriodEnd),
      cancelledAt: null,
    });

    await this.billing.createEvent({
      shopId: shop.id,
      type: BillingEventType.SUBSCRIPTION_CREATED,
      message:
        'Shopify billing confirmation URL created for ' +
        plan.displayName +
        '.',
      metadataJson: {
        planKey,
        shopifySubscriptionGid: appSubscription.id,
        billingTest,
      } as Prisma.InputJsonValue,
    });

    return {
      confirmationUrl,
      subscription,
    };
  }

  async selectFreePlan(shop: Shop) {
    const current = await this.billing.ensureDefaultSubscription(shop.id);

    if (
      current.shopifySubscriptionGid &&
      current.status === BillingSubscriptionStatus.ACTIVE
    ) {
      await this.cancelShopifySubscription(
        shop.domain,
        current.shopifySubscriptionGid,
      );
    }

    const subscription = await this.billing.upsertSubscription({
      shopId: shop.id,
      planKey: BillingPlanKey.FREE,
      status: BillingSubscriptionStatus.ACTIVE,
      shopifySubscriptionGid: null,
      confirmationUrl: null,
      trialEndsAt: null,
      currentPeriodStartedAt: null,
      currentPeriodEndsAt: null,
      cancelledAt: null,
    });

    await this.billing.createEvent({
      shopId: shop.id,
      type: BillingEventType.PLAN_CHANGED,
      message: 'Billing plan changed to Free.',
      metadataJson: { planKey: BillingPlanKey.FREE } as Prisma.InputJsonValue,
    });

    return subscription;
  }

  async syncFromShopify(shop: Shop) {
    const response = await this.shopify.graphql(
      shop.domain,
      CURRENT_APP_SUBSCRIPTIONS,
    );
    const subscriptions = ((response as any)?.data?.currentAppInstallation
      ?.activeSubscriptions || []) as ShopifyAppSubscription[];
    const active = subscriptions.find((subscription) =>
      this.planKeyFromSubscriptionName(subscription.name),
    );

    if (!active) {
      return this.billing.ensureDefaultSubscription(shop.id);
    }

    const planKey = this.planKeyFromSubscriptionName(active.name);

    if (!planKey) {
      return this.billing.ensureDefaultSubscription(shop.id);
    }

    const subscription = await this.billing.upsertSubscription({
      shopId: shop.id,
      planKey,
      status: this.mapSubscriptionStatus(active.status),
      shopifySubscriptionGid: active.id,
      confirmationUrl: null,
      trialEndsAt: active.trialDays
        ? this.addDays(
            this.toDate(active.createdAt) || new Date(),
            active.trialDays,
          )
        : null,
      currentPeriodStartedAt: this.toDate(active.createdAt),
      currentPeriodEndsAt: this.toDate(active.currentPeriodEnd),
      cancelledAt: null,
    });

    await this.billing.createEvent({
      shopId: shop.id,
      type: BillingEventType.SYNCED_FROM_SHOPIFY,
      message: 'Billing subscription synced from Shopify.',
      metadataJson: {
        planKey,
        shopifySubscriptionGid: active.id,
        status: active.status,
      } as Prisma.InputJsonValue,
    });

    return subscription;
  }

  async handleAppSubscriptionUpdate(
    shop: Shop,
    payload: Record<string, unknown>,
  ) {
    const subscriptionPayload = this.getSubscriptionPayload(payload);
    const subscriptionGid = this.firstString(
      subscriptionPayload.admin_graphql_api_id,
      subscriptionPayload.adminGraphqlApiId,
      subscriptionPayload.id,
    );
    const planKey = this.planKeyFromSubscriptionName(
      this.firstString(subscriptionPayload.name, subscriptionPayload.plan_name),
    );
    const status = this.mapSubscriptionStatus(
      this.firstString(subscriptionPayload.status),
    );

    if (!planKey) {
      this.logger.warn(
        'Could not map Shopify subscription webhook to a local plan.',
      );
      return null;
    }

    const subscription = await this.billing.upsertSubscription({
      shopId: shop.id,
      planKey,
      status,
      shopifySubscriptionGid: subscriptionGid,
      confirmationUrl: null,
      trialEndsAt: this.toDate(
        this.firstString(subscriptionPayload.trial_ends_on),
      ),
      currentPeriodStartedAt: this.toDate(
        this.firstString(subscriptionPayload.created_at),
      ),
      currentPeriodEndsAt: this.toDate(
        this.firstString(subscriptionPayload.current_period_end),
      ),
      cancelledAt:
        status === BillingSubscriptionStatus.CANCELLED ? new Date() : null,
    });

    await this.billing.createEvent({
      shopId: shop.id,
      type:
        status === BillingSubscriptionStatus.CANCELLED
          ? BillingEventType.SUBSCRIPTION_CANCELLED
          : BillingEventType.SUBSCRIPTION_ACTIVATED,
      message: 'Billing subscription updated from Shopify webhook.',
      metadataJson: {
        planKey,
        status,
        shopifySubscriptionGid: subscriptionGid,
      } as Prisma.InputJsonValue,
    });

    return subscription;
  }

  async recordLimitReached(input: {
    shopId: number;
    planKey: BillingPlanKey;
    usageCount: number;
    monthlyLimit: number;
    shopifyOrderGid: string;
  }) {
    await this.billing.createEvent({
      shopId: input.shopId,
      type: BillingEventType.USAGE_LIMIT_REACHED,
      message:
        'Monthly COD order limit reached for plan ' + input.planKey + '.',
      metadataJson: input as unknown as Prisma.InputJsonValue,
    });
  }

  private async cancelShopifySubscription(
    shopDomain: string,
    subscriptionGid: string,
  ) {
    try {
      await this.shopify.graphql(shopDomain, CANCEL_APP_SUBSCRIPTION, {
        id: subscriptionGid,
      });
    } catch (error) {
      this.logger.warn(
        'Could not cancel Shopify subscription: ' + this.errorMessage(error),
      );
    }
  }

  private buildUsage(
    limit: number,
    usageCount: number,
    period: { start: Date; end: Date },
  ) {
    const remaining = Math.max(limit - usageCount, 0);
    const ratio = limit > 0 ? usageCount / limit : 0;

    return {
      periodStart: period.start,
      periodEnd: period.end,
      codOrdersUsed: usageCount,
      monthlyCodOrderLimit: limit,
      remainingCodOrders: remaining,
      limitReached: usageCount >= limit,
      warning: ratio >= BILLING_LIMIT_WARNING_RATIO && usageCount < limit,
    };
  }

  private getCurrentUsagePeriod() {
    const now = new Date();
    const start = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    );
    const end = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
    );

    return { start, end };
  }

  private buildReturnUrl(shopDomain: string) {
    const host = this.config.get<string>('app.host') || process.env.HOST || '';
    const normalizedHost = host.replace(/\/$/, '');

    if (!normalizedHost) {
      throw new BadRequestException(
        'HOST is required to create a Shopify billing subscription',
      );
    }

    return (
      normalizedHost +
      '/api/billing/callback?' +
      new URLSearchParams({ shop: shopDomain }).toString()
    );
  }

  private isBillingTestMode() {
    return process.env.SHOPIFY_BILLING_TEST !== 'false';
  }

  private planKeyFromSubscriptionName(name?: string | null) {
    if (!name) {
      return null;
    }

    const normalized = name.toLowerCase();

    return (
      Object.values(BILLING_PLANS).find((plan) =>
        normalized.includes(plan.displayName.toLowerCase()),
      )?.key || null
    );
  }

  private mapSubscriptionStatus(status?: string | null) {
    const normalized = (status || '').toUpperCase();

    if (normalized in BillingSubscriptionStatus) {
      return normalized as BillingSubscriptionStatus;
    }

    return BillingSubscriptionStatus.PENDING;
  }

  private getSubscriptionPayload(payload: Record<string, unknown>) {
    const nested = payload.app_subscription || payload.appSubscription;

    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
      return nested as Record<string, unknown>;
    }

    return payload;
  }

  private firstString(...values: unknown[]) {
    for (const value of values) {
      if (typeof value === 'string' && value) {
        return value;
      }

      if (typeof value === 'number' || typeof value === 'bigint') {
        return String(value);
      }
    }

    return undefined;
  }

  private toDate(value?: string | Date | null) {
    if (!value) {
      return null;
    }

    const date = value instanceof Date ? value : new Date(value);

    return Number.isNaN(date.getTime()) ? null : date;
  }

  private addDays(date: Date, days: number) {
    const result = new Date(date);
    result.setUTCDate(result.getUTCDate() + days);
    return result;
  }

  private errorMessage(error: unknown) {
    return error instanceof Error ? error.message : String(error);
  }
}
