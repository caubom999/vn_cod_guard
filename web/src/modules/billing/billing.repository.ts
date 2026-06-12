import { Injectable } from '@nestjs/common';
import {
  BillingEventType,
  BillingPlanKey,
  BillingSubscriptionStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BillingRepository {
  constructor(private readonly prisma: PrismaService) {}

  getSubscription(shopId: number) {
    return this.prisma.shopBillingSubscription.findUnique({
      where: { shopId },
    });
  }

  ensureDefaultSubscription(shopId: number) {
    return this.prisma.shopBillingSubscription.upsert({
      where: { shopId },
      update: {},
      create: {
        shopId,
        planKey: BillingPlanKey.FREE,
        status: BillingSubscriptionStatus.ACTIVE,
      },
    });
  }

  upsertSubscription(data: Prisma.ShopBillingSubscriptionUncheckedCreateInput) {
    return this.prisma.shopBillingSubscription.upsert({
      where: { shopId: data.shopId },
      create: data,
      update: {
        planKey: data.planKey,
        status: data.status,
        shopifySubscriptionGid: data.shopifySubscriptionGid,
        confirmationUrl: data.confirmationUrl,
        trialEndsAt: data.trialEndsAt,
        currentPeriodStartedAt: data.currentPeriodStartedAt,
        currentPeriodEndsAt: data.currentPeriodEndsAt,
        cancelledAt: data.cancelledAt,
      },
    });
  }

  updateSubscription(
    shopId: number,
    data: Prisma.ShopBillingSubscriptionUncheckedUpdateInput,
  ) {
    return this.prisma.shopBillingSubscription.update({
      where: { shopId },
      data,
    });
  }

  countCodOrders(input: {
    shopId: number;
    periodStart: Date;
    periodEnd: Date;
    excludeShopifyOrderGid?: string;
  }) {
    return this.prisma.codOrder.count({
      where: {
        shopId: input.shopId,
        isCod: true,
        createdAt: {
          gte: input.periodStart,
          lt: input.periodEnd,
        },
        ...(input.excludeShopifyOrderGid
          ? { NOT: { shopifyOrderGid: input.excludeShopifyOrderGid } }
          : {}),
      },
    });
  }

  createEvent(input: {
    shopId: number;
    type: BillingEventType;
    message?: string;
    metadataJson?: Prisma.InputJsonValue;
  }) {
    return this.prisma.shopBillingEvent.create({
      data: input,
    });
  }
}
