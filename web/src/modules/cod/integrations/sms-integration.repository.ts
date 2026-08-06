import { Injectable } from '@nestjs/common';
import { ChannelIntegrationProvider, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SmsIntegrationRepository {
  constructor(private readonly prisma: PrismaService) {}

  getOrCreate(shopId: number) {
    return this.prisma.codChannelIntegration.upsert({
      where: {
        shopId_provider: {
          shopId,
          provider: ChannelIntegrationProvider.SMS,
        },
      },
      update: {},
      create: {
        shopId,
        provider: ChannelIntegrationProvider.SMS,
        enabled: false,
        senderName: 'COD Guard',
        configJson: {
          provider: 'twilio',
          billingMode: 'merchant-direct',
        },
      },
    });
  }

  update(shopId: number, data: Prisma.CodChannelIntegrationUpdateInput) {
    return this.prisma.codChannelIntegration.update({
      where: {
        shopId_provider: {
          shopId,
          provider: ChannelIntegrationProvider.SMS,
        },
      },
      data,
    });
  }
}
