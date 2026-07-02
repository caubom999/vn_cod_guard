import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CodPaymentRuleRepository {
  constructor(private readonly prisma: PrismaService) {}

  getOrCreate(shopId: number) {
    return this.prisma.codPaymentRule.upsert({
      where: { shopId },
      update: {},
      create: { shopId },
    });
  }

  update(shopId: number, data: Prisma.CodPaymentRuleUncheckedUpdateInput) {
    return this.prisma.codPaymentRule.upsert({
      where: { shopId },
      update: data,
      create: {
        shopId,
        ...data,
      } as Prisma.CodPaymentRuleUncheckedCreateInput,
    });
  }
}
