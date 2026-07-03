import { Injectable } from '@nestjs/common';
import { BlacklistEntryType, CodOrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RiskRuleAction, RiskRuleCondition } from './risk.types';

const DEFAULT_RISK_RULES: Array<{
  name: string;
  enabled: boolean;
  priority: number;
  conditionJson: RiskRuleCondition;
  actionJson: RiskRuleAction;
}> = [
  {
    name: 'Missing phone',
    enabled: true,
    priority: 10,
    conditionJson: { type: 'missing_phone' },
    actionJson: { score: 40, reason: 'missing_phone' },
  },
  {
    name: 'Missing email',
    enabled: true,
    priority: 20,
    conditionJson: { type: 'missing_email' },
    actionJson: { score: 5, reason: 'missing_email' },
  },
  {
    name: 'High order amount',
    enabled: true,
    priority: 30,
    conditionJson: { type: 'amount_gte', amount: 2000000 },
    actionJson: { score: 20, reason: 'high_order_amount' },
  },
  {
    name: 'Phone cancelled multiple times',
    enabled: true,
    priority: 40,
    conditionJson: { type: 'phone_cancel_count_gte', count: 2 },
    actionJson: { score: 50, reason: 'phone_cancelled_many_times' },
  },
  {
    name: 'Province or city watchlist',
    enabled: false,
    priority: 50,
    conditionJson: { type: 'location_in', provinces: [], cities: [] },
    actionJson: { score: 20, reason: 'risky_location' },
  },
];

@Injectable()
export class RiskRepository {
  constructor(private readonly prisma: PrismaService) {}

  async ensureDefaultRules(shopId: number) {
    const count = await this.prisma.codRiskRule.count({ where: { shopId } });

    if (count > 0) {
      return;
    }

    await this.prisma.codRiskRule.createMany({
      data: DEFAULT_RISK_RULES.map((rule) => ({
        shopId,
        name: rule.name,
        enabled: rule.enabled,
        priority: rule.priority,
        conditionJson: rule.conditionJson as Prisma.InputJsonValue,
        actionJson: rule.actionJson as Prisma.InputJsonValue,
      })),
    });
  }

  findEnabledRules(shopId: number) {
    return this.prisma.codRiskRule.findMany({
      where: { shopId, enabled: true },
      orderBy: [{ priority: 'asc' }, { id: 'asc' }],
    });
  }

  listRules(shopId: number) {
    return this.prisma.codRiskRule.findMany({
      where: { shopId },
      orderBy: [{ priority: 'asc' }, { id: 'asc' }],
    });
  }

  createRule(
    shopId: number,
    data: Omit<Prisma.CodRiskRuleUncheckedCreateInput, 'shopId'>,
  ) {
    return this.prisma.codRiskRule.create({ data: { ...data, shopId } });
  }

  updateRule(id: number, shopId: number, data: Prisma.CodRiskRuleUpdateInput) {
    return this.prisma.codRiskRule.update({
      where: { id, shopId },
      data,
    });
  }

  deleteRule(id: number, shopId: number) {
    return this.prisma.codRiskRule.delete({ where: { id, shopId } });
  }

  findBlacklistHits(
    shopId: number,
    candidates: Array<{ type: BlacklistEntryType; normalizedValue: string }>,
  ) {
    if (!candidates.length) {
      return [];
    }

    return this.prisma.codBlacklistEntry.findMany({
      where: {
        shopId,
        OR: candidates.map((candidate) => ({
          type: candidate.type,
          normalizedValue: candidate.normalizedValue,
        })),
      },
    });
  }

  markBlacklistHits(ids: number[]) {
    if (!ids.length) {
      return Promise.resolve({ count: 0 });
    }

    return this.prisma.codBlacklistEntry.updateMany({
      where: { id: { in: ids } },
      data: {
        hitCount: { increment: 1 },
        lastSeenAt: new Date(),
      },
    });
  }

  countCancelledOrdersByPhone(input: {
    shopId: number;
    normalizedPhone: string;
    excludeShopifyOrderGid: string;
  }) {
    return this.prisma.codOrder.count({
      where: {
        shopId: input.shopId,
        normalizedPhone: input.normalizedPhone,
        shopifyOrderGid: { not: input.excludeShopifyOrderGid },
        status: CodOrderStatus.CANCELLED_BY_CUSTOMER,
      },
    });
  }

  listBlacklist(shopId: number) {
    return this.prisma.codBlacklistEntry.findMany({
      where: { shopId },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
    });
  }

  getBlacklistScoring(shopId: number) {
    return this.prisma.codShopSetting.upsert({
      where: { shopId },
      update: {},
      create: { shopId },
      select: {
        blacklistPhoneEnabled: true,
        blacklistPhoneScore: true,
        blacklistEmailEnabled: true,
        blacklistEmailScore: true,
        blacklistAddressEnabled: true,
        blacklistAddressScore: true,
      },
    });
  }

  updateBlacklistScoring(
    shopId: number,
    data: {
      blacklistPhoneEnabled?: boolean;
      blacklistPhoneScore?: number;
      blacklistEmailEnabled?: boolean;
      blacklistEmailScore?: number;
      blacklistAddressEnabled?: boolean;
      blacklistAddressScore?: number;
    },
  ) {
    return this.prisma.codShopSetting.upsert({
      where: { shopId },
      update: data,
      create: { shopId, ...data },
      select: {
        blacklistPhoneEnabled: true,
        blacklistPhoneScore: true,
        blacklistEmailEnabled: true,
        blacklistEmailScore: true,
        blacklistAddressEnabled: true,
        blacklistAddressScore: true,
      },
    });
  }

  upsertBlacklistEntry(data: Prisma.CodBlacklistEntryUncheckedCreateInput) {
    return this.prisma.codBlacklistEntry.upsert({
      where: {
        shopId_type_normalizedValue: {
          shopId: data.shopId,
          type: data.type,
          normalizedValue: data.normalizedValue,
        },
      },
      update: {
        value: data.value,
        reason: data.reason,
      },
      create: data,
    });
  }

  deleteBlacklistEntry(id: number, shopId: number) {
    return this.prisma.codBlacklistEntry.delete({ where: { id, shopId } });
  }
}
