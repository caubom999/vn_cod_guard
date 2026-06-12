import { Injectable, Logger } from '@nestjs/common';
import { BlacklistEntryType, Prisma, Shop } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { normalizeVietnamPhone } from '../cod/utils/phone-normalizer';
import { ShopifySessionRepository } from '../shopify/shopify.repository';

type PrivacyWebhookPayload = Record<string, unknown>;

type CustomerIdentifiers = {
  email?: string;
  phone?: string;
  normalizedPhone?: string;
  orderGids: string[];
};

@Injectable()
export class ComplianceService {
  private readonly logger = new Logger(ComplianceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly shopifySessions: ShopifySessionRepository,
  ) {}

  async handleCustomersDataRequest(shop: Shop, payload: PrivacyWebhookPayload) {
    const identifiers = this.extractCustomerIdentifiers(payload);
    const matchingOrderCount = await this.prisma.codOrder.count({
      where: this.buildCustomerOrderWhere(shop.id, identifiers),
    });

    this.logger.log(
      'Accepted customers/data_request for shop ' +
        shop.domain +
        '; matchingOrders=' +
        matchingOrderCount,
    );

    return { matchingOrderCount };
  }

  async handleCustomersRedact(shop: Shop, payload: PrivacyWebhookPayload) {
    const identifiers = this.extractCustomerIdentifiers(payload);
    const orderWhere = this.buildCustomerOrderWhere(shop.id, identifiers);

    return this.prisma.$transaction(async (tx) => {
      const orders = await tx.codOrder.findMany({
        where: orderWhere,
        select: { id: true },
      });
      const codOrderIds = orders.map((order) => order.id);

      const orderResult = codOrderIds.length
        ? await tx.codOrder.updateMany({
            where: { id: { in: codOrderIds } },
            data: {
              customerName: null,
              customerEmail: null,
              customerPhone: null,
              normalizedPhone: null,
              shippingProvince: null,
              shippingCity: null,
              shippingDistrict: null,
              shippingAddressJson: Prisma.JsonNull,
            },
          })
        : { count: 0 };

      const sessionResult = codOrderIds.length
        ? await tx.verificationSession.updateMany({
            where: { codOrderId: { in: codOrderIds } },
            data: {
              ipAddress: null,
              userAgent: null,
            },
          })
        : { count: 0 };

      const deliveryResult = codOrderIds.length
        ? await tx.codMessageDelivery.updateMany({
            where: {
              session: {
                codOrderId: { in: codOrderIds },
              },
            },
            data: {
              recipient: 'redacted',
              subject: null,
              body: null,
              error: null,
              providerMessageId: null,
            },
          })
        : { count: 0 };

      const eventResult = codOrderIds.length
        ? await tx.codVerificationEvent.updateMany({
            where: { codOrderId: { in: codOrderIds } },
            data: {
              metadataJson: Prisma.JsonNull,
            },
          })
        : { count: 0 };

      const blacklistWhere = this.buildBlacklistWhere(shop.id, identifiers);
      const blacklistResult = blacklistWhere
        ? await tx.codBlacklistEntry.deleteMany({ where: blacklistWhere })
        : { count: 0 };

      this.logger.log(
        'Processed customers/redact for shop ' +
          shop.domain +
          '; redactedOrders=' +
          orderResult.count +
          '; redactedDeliveries=' +
          deliveryResult.count +
          '; deletedBlacklistEntries=' +
          blacklistResult.count,
      );

      return {
        redactedOrders: orderResult.count,
        redactedVerificationSessions: sessionResult.count,
        redactedMessageDeliveries: deliveryResult.count,
        redactedEvents: eventResult.count,
        deletedBlacklistEntries: blacklistResult.count,
      };
    });
  }

  async cleanupShopData(
    shopDomain: string,
    reason: 'app_uninstalled' | 'shop_redact',
  ) {
    const redisSessions =
      await this.shopifySessions.deleteRedisSessionsByShop(shopDomain);
    const result = await this.prisma.$transaction(async (tx) => {
      const sessions = await tx.shopifySession.deleteMany({
        where: { shop: shopDomain },
      });
      const shops = await tx.shop.deleteMany({
        where: { domain: shopDomain },
      });

      return {
        deletedSessions: sessions.count,
        deletedRedisSessions: redisSessions.deletedRedisSessions,
        deletedShops: shops.count,
      };
    });

    this.logger.log(
      'Cleaned shop data for ' +
        shopDomain +
        '; reason=' +
        reason +
        '; deletedShops=' +
        result.deletedShops +
        '; deletedSessions=' +
        result.deletedSessions +
        '; deletedRedisSessions=' +
        result.deletedRedisSessions,
    );

    return result;
  }

  private extractCustomerIdentifiers(
    payload: PrivacyWebhookPayload,
  ): CustomerIdentifiers {
    const customer = this.getObject(payload, 'customer');
    const email = this.firstString(
      this.getString(customer, 'email'),
      this.getString(payload, 'customer_email'),
      this.getString(payload, 'email'),
    )?.trim();
    const phone = this.firstString(
      this.getString(customer, 'phone'),
      this.getString(payload, 'customer_phone'),
      this.getString(payload, 'phone'),
    )?.trim();
    const normalizedPhone = normalizeVietnamPhone(phone);
    const orderGids = [
      ...this.getOrderGids(payload, 'orders_to_redact'),
      ...this.getOrderGids(payload, 'orders_requested'),
    ];

    return {
      email: email ? email.toLowerCase() : undefined,
      phone,
      normalizedPhone: normalizedPhone || undefined,
      orderGids: [...new Set(orderGids)],
    };
  }

  private buildCustomerOrderWhere(
    shopId: number,
    identifiers: CustomerIdentifiers,
  ): Prisma.CodOrderWhereInput {
    const conditions: Prisma.CodOrderWhereInput[] = [];

    if (identifiers.email) {
      conditions.push({ customerEmail: identifiers.email });
    }

    if (identifiers.phone) {
      conditions.push({ customerPhone: identifiers.phone });
    }

    if (identifiers.normalizedPhone) {
      conditions.push({ normalizedPhone: identifiers.normalizedPhone });
    }

    if (identifiers.orderGids.length) {
      conditions.push({ shopifyOrderGid: { in: identifiers.orderGids } });
    }

    if (!conditions.length) {
      return { shopId, id: -1 };
    }

    return {
      shopId,
      OR: conditions,
    };
  }

  private buildBlacklistWhere(
    shopId: number,
    identifiers: CustomerIdentifiers,
  ): Prisma.CodBlacklistEntryWhereInput | null {
    const conditions: Prisma.CodBlacklistEntryWhereInput[] = [];

    if (identifiers.email) {
      conditions.push({
        type: BlacklistEntryType.EMAIL,
        normalizedValue: identifiers.email,
      });
    }

    if (identifiers.normalizedPhone) {
      conditions.push({
        type: BlacklistEntryType.PHONE,
        normalizedValue: identifiers.normalizedPhone,
      });
    }

    if (!conditions.length) {
      return null;
    }

    return {
      shopId,
      OR: conditions,
    };
  }

  private getOrderGids(payload: PrivacyWebhookPayload, key: string) {
    const value = payload[key];

    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((item) => {
        if (typeof item === 'number' || typeof item === 'bigint') {
          return 'gid://shopify/Order/' + String(item);
        }

        if (typeof item !== 'string') {
          return null;
        }

        return item.startsWith('gid://') ? item : 'gid://shopify/Order/' + item;
      })
      .filter((item): item is string => Boolean(item));
  }

  private firstString(...values: Array<string | null | undefined>) {
    return values.find((value) => Boolean(value));
  }

  private getString(object: Record<string, unknown> | null, key: string) {
    const value = object?.[key];

    if (typeof value === 'string') {
      return value;
    }

    if (typeof value === 'number' || typeof value === 'bigint') {
      return String(value);
    }

    return null;
  }

  private getObject(object: Record<string, unknown>, key: string) {
    const value = object[key];

    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }

    return value as Record<string, unknown>;
  }
}
