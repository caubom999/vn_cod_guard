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

  findById(id: number): Promise<WebhookEvent | null> {
    return this.prisma.webhookEvent.findUnique({
      where: { id },
    });
  }

  create(data: Prisma.WebhookEventUncheckedCreateInput): Promise<WebhookEvent> {
    return this.prisma.webhookEvent.create({ data });
  }

  markProcessed(id: number): Promise<WebhookEvent> {
    return this.prisma.webhookEvent.update({
      where: { id },
      data: {
        processed: true,
        processedAt: new Date(),
        error: null,
      },
    });
  }

  markFailed(id: number, error: string): Promise<WebhookEvent> {
    return this.prisma.webhookEvent.update({
      where: { id },
      data: {
        processed: false,
        error,
      },
    });
  }
}
