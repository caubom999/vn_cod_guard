import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CodDeliveryRuleRepository {
  constructor(private readonly prisma: PrismaService) {}

  getOrCreate(shopId: number) {
    return this.prisma.codDeliveryRule.upsert({
      where: { shopId },
      update: {},
      create: { shopId },
    });
  }

  update(shopId: number, data: Prisma.CodDeliveryRuleUncheckedUpdateInput) {
    return this.prisma.codDeliveryRule.upsert({
      where: { shopId },
      update: data,
      create: {
        shopId,
        ...data,
      } as Prisma.CodDeliveryRuleUncheckedCreateInput,
    });
  }
}
