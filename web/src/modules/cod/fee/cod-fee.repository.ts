import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const DEFAULT_DISPLAY_MESSAGE =
  'A COD fee will be added to this order.';

@Injectable()
export class CodFeeRepository {
  constructor(private readonly prisma: PrismaService) {}

  getOrCreate(shopId: number) {
    return this.prisma.codFeeSetting.upsert({
      where: { shopId },
      update: {},
      create: {
        shopId,
        displayMessage: DEFAULT_DISPLAY_MESSAGE,
      },
    });
  }

  update(shopId: number, data: Prisma.CodFeeSettingUncheckedUpdateInput) {
    return this.prisma.codFeeSetting.upsert({
      where: { shopId },
      update: data,
      create: {
        shopId,
        ...data,
      } as Prisma.CodFeeSettingUncheckedCreateInput,
    });
  }

  markApplied(codOrderId: number, amount: Prisma.Decimal) {
    return this.prisma.codOrder.update({
      where: { id: codOrderId },
      data: {
        codFeeAmount: amount,
        codFeeAppliedAt: new Date(),
        codFeeError: null,
      },
    });
  }

  markFailed(codOrderId: number, message: string) {
    return this.prisma.codOrder.update({
      where: { id: codOrderId },
      data: { codFeeError: message.slice(0, 65535) },
    });
  }
}
