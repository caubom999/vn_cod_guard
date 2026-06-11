import { BadRequestException, Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { CodOrderProcessorService } from '../cod/orders/cod-order-processor.service';
import { ShopService } from '../shop/shop.service';
import { ORDERS_CREATE_WEBHOOK_TOPIC } from './webhooks.constants';
import { WebhooksRepository } from './webhooks.repository';
import { ShopifyWebhookRequest } from './webhooks.types';

export type WebhookReceipt =
  | { status: 'accepted'; eventId: number }
  | { status: 'duplicate'; eventId: number }
  | { status: 'ignored'; reason: 'shop_not_found' };

@Injectable()
export class WebhooksService {
  constructor(
    private readonly shops: ShopService,
    private readonly webhooks: WebhooksRepository,
    private readonly codOrderProcessor: CodOrderProcessorService,
  ) {}

  async receiveOrdersCreate(
    request: ShopifyWebhookRequest,
  ): Promise<WebhookReceipt> {
    const shopDomain = this.getRequiredHeader(request, 'x-shopify-shop-domain');
    const topic =
      this.getHeader(request, 'x-shopify-topic') || ORDERS_CREATE_WEBHOOK_TOPIC;
    const webhookId = this.getHeader(request, 'x-shopify-webhook-id');
    const payload = this.getPayload(request);

    if (webhookId) {
      const existing = await this.webhooks.findByShopifyWebhookId(webhookId);

      if (existing) {
        return { status: 'duplicate', eventId: existing.id };
      }
    }

    const shop = await this.shops.findByDomain(shopDomain);

    if (!shop) {
      return { status: 'ignored', reason: 'shop_not_found' };
    }

    const event = await this.webhooks.create({
      shopId: shop.id,
      topic,
      shopifyWebhookId: webhookId,
      shopifyOrderGid: this.getShopifyOrderGid(payload),
      payloadHash: this.hashPayload(request.rawBody),
    });

    try {
      await this.codOrderProcessor.processOrdersCreate({
        shop,
        event,
        payload,
      });
      await this.webhooks.markProcessed(event.id);
    } catch (error) {
      await this.webhooks.markFailed(event.id, this.getErrorMessage(error));
    }

    return { status: 'accepted', eventId: event.id };
  }

  private getPayload(request: ShopifyWebhookRequest) {
    if (!request.body || typeof request.body !== 'object') {
      throw new BadRequestException('Missing webhook payload');
    }

    return request.body as Record<string, unknown>;
  }

  private hashPayload(rawBody?: Buffer) {
    return createHash('sha256')
      .update(rawBody || '')
      .digest('hex');
  }

  private getShopifyOrderGid(payload: Record<string, unknown>) {
    if (typeof payload.admin_graphql_api_id === 'string') {
      return payload.admin_graphql_api_id;
    }

    if (typeof payload.id === 'number' || typeof payload.id === 'string') {
      return `gid://shopify/Order/${payload.id}`;
    }

    return undefined;
  }

  private getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : String(error);
  }

  private getRequiredHeader(request: ShopifyWebhookRequest, name: string) {
    const value = this.getHeader(request, name);

    if (!value) {
      throw new BadRequestException(`Missing ${name} header`);
    }

    return value;
  }

  private getHeader(request: ShopifyWebhookRequest, name: string) {
    const value = request.headers[name.toLowerCase()];

    if (Array.isArray(value)) {
      return value[0];
    }

    return value;
  }
}
