import { Injectable } from '@nestjs/common';
import { CodShopSetting, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CodOrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  getOrCreateShopSetting(shopId: number): Promise<CodShopSetting> {
    return this.prisma.codShopSetting.upsert({
      where: { shopId },
      update: {},
      create: { shopId },
    });
  }

  upsertOrder(data: Prisma.CodOrderUncheckedCreateInput) {
    return this.prisma.codOrder.upsert({
      where: {
        shopId_shopifyOrderGid: {
          shopId: data.shopId,
          shopifyOrderGid: data.shopifyOrderGid,
        },
      },
      update: {
        orderName: data.orderName,
        orderNumber: data.orderNumber,
        currency: data.currency,
        totalAmount: data.totalAmount,
        paymentMethod: data.paymentMethod,
        financialStatus: data.financialStatus,
        fulfillmentStatus: data.fulfillmentStatus,
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        customerPhone: data.customerPhone,
        normalizedPhone: data.normalizedPhone,
        shippingProvince: data.shippingProvince,
        shippingCity: data.shippingCity,
        shippingDistrict: data.shippingDistrict,
        shippingAddressJson: data.shippingAddressJson,
        isCod: data.isCod,
        status: data.status,
        riskScore: data.riskScore,
        riskReasonJson: data.riskReasonJson,
        expiresAt: data.expiresAt,
        lastSyncedAt: data.lastSyncedAt,
      },
      create: data,
    });
  }

  createEvent(data: Prisma.CodVerificationEventUncheckedCreateInput) {
    return this.prisma.codVerificationEvent.create({ data });
  }
}
