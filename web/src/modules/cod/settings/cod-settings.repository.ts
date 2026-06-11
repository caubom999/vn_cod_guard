import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CodSettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  getOrCreate(shopId: number) {
    return this.prisma.codShopSetting.upsert({
      where: { shopId },
      update: {},
      create: { shopId },
    });
  }

  update(shopId: number, data: Prisma.CodShopSettingUpdateInput) {
    return this.prisma.codShopSetting.upsert({
      where: { shopId },
      update: data,
      create: {
        shopId,
        ...data,
      } as Prisma.CodShopSettingUncheckedCreateInput,
    });
  }
}
