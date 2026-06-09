import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { createHash, createHmac, timingSafeEqual } from 'crypto';
import { Request } from 'express';
import { ShopService } from '../shop/shop.service';
import { ORDERS_CREATE_WEBHOOK_TOPIC } from './webhooks.constants';
import { WebhooksRepository } from './webhooks.repository';

export type ShopifyWebhookRequest = Request & {
  rawBody?: Buffer;
};

export type WebhookReceipt =
  | { status: 'accepted'; eventId: number }
  | { status: 'duplicate'; eventId: number }
  | { status: 'ignored'; reason: 'shop_not_found' };

@Injectable()
export class WebhooksService {
  constructor(
    private readonly config: ConfigService,
    private readonly shops: ShopService,
    private readonly webhooks: WebhooksRepository,
  ) {}

  async receiveOrdersCreate(
    request: ShopifyWebhookRequest,
  ): Promise<WebhookReceipt> {
    this.verifyShopifyHmac(request);

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
      payloadJson: payload as Prisma.InputJsonValue,
    });

    return { status: 'accepted', eventId: event.id };
  }

  private verifyShopifyHmac(request: ShopifyWebhookRequest) {
    const rawBody = request.rawBody;
    const receivedHmac = this.getHeader(request, 'x-shopify-hmac-sha256');

    if (!rawBody?.length) {
      throw new BadRequestException('Missing raw webhook body');
    }

    if (!receivedHmac) {
      throw new UnauthorizedException('Missing Shopify webhook HMAC');
    }

    const secret = this.config.getOrThrow<string>('shopify.apiSecret');
    const expectedHmac = createHmac('sha256', secret)
      .update(rawBody)
      .digest('base64');

    if (!this.safeEqual(receivedHmac, expectedHmac)) {
      throw new UnauthorizedException('Invalid Shopify webhook HMAC');
    }
  }

  private safeEqual(received: string, expected: string) {
    const receivedBuffer = Buffer.from(received, 'base64');
    const expectedBuffer = Buffer.from(expected, 'base64');

    return (
      receivedBuffer.length === expectedBuffer.length &&
      timingSafeEqual(receivedBuffer, expectedBuffer)
    );
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
