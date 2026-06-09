import { Injectable } from '@nestjs/common';
import { Prisma, WebhookEvent } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WebhooksRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByShopifyWebhookId(
    shopifyWebhookId: string,
  ): Promise<WebhookEvent | null> {
    return this.prisma.webhookEvent.findUnique({
      where: { shopifyWebhookId },
    });
  }

  create(data: Prisma.WebhookEventUncheckedCreateInput): Promise<WebhookEvent> {
    return this.prisma.webhookEvent.create({ data });
  }
}
