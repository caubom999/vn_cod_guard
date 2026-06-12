import { BadRequestException, Injectable } from '@nestjs/common';
import { Shop } from '@prisma/client';
import { createHash } from 'crypto';
import { CodOrderProcessorService } from '../cod/orders/cod-order-processor.service';
import { ShopService } from '../shop/shop.service';
import { ComplianceService } from './compliance.service';
import {
  APP_UNINSTALLED_WEBHOOK_TOPIC,
  CUSTOMERS_DATA_REQUEST_WEBHOOK_TOPIC,
  CUSTOMERS_REDACT_WEBHOOK_TOPIC,
  ORDERS_CREATE_WEBHOOK_TOPIC,
  SHOP_REDACT_WEBHOOK_TOPIC,
} from './webhooks.constants';
import { WebhooksRepository } from './webhooks.repository';
import { ShopifyWebhookRequest } from './webhooks.types';

export type WebhookReceipt =
  | { status: 'accepted'; eventId?: number }
  | { status: 'duplicate'; eventId: number }
  | { status: 'ignored'; reason: 'shop_not_found' };

type ShopifyWebhookPayload = Record<string, unknown>;

type ShopScopedHandler = (input: {
  shop: Shop;
  payload: ShopifyWebhookPayload;
  eventId: number;
}) => Promise<unknown>;

@Injectable()
export class WebhooksService {
  constructor(
    private readonly shops: ShopService,
    private readonly webhooks: WebhooksRepository,
    private readonly codOrderProcessor: CodOrderProcessorService,
    private readonly compliance: ComplianceService,
  ) {}

  async receiveOrdersCreate(
    request: ShopifyWebhookRequest,
  ): Promise<WebhookReceipt> {
    return this.receiveShopScopedWebhook(
      request,
      ORDERS_CREATE_WEBHOOK_TOPIC,
      async ({ shop, payload, eventId }) => {
        const event = await this.webhooks.findById(eventId);

        if (!event) {
          throw new Error('Webhook event not found after creation');
        }

        await this.codOrderProcessor.processOrdersCreate({
          shop,
          event,
          payload,
        });
      },
      (payload) => this.getShopifyOrderGid(payload),
    );
  }

  async receivePrivacyWebhook(
    request: ShopifyWebhookRequest,
  ): Promise<WebhookReceipt> {
    const topic = this.getHeader(request, 'x-shopify-topic');

    if (topic === CUSTOMERS_DATA_REQUEST_WEBHOOK_TOPIC) {
      return this.receiveCustomersDataRequest(request);
    }

    if (topic === CUSTOMERS_REDACT_WEBHOOK_TOPIC) {
      return this.receiveCustomersRedact(request);
    }

    if (topic === SHOP_REDACT_WEBHOOK_TOPIC) {
      return this.receiveShopRedact(request);
    }

    throw new BadRequestException('Unsupported privacy webhook topic');
  }

  async receiveCustomersDataRequest(
    request: ShopifyWebhookRequest,
  ): Promise<WebhookReceipt> {
    return this.receiveShopScopedWebhook(
      request,
      CUSTOMERS_DATA_REQUEST_WEBHOOK_TOPIC,
      ({ shop, payload }) =>
        this.compliance.handleCustomersDataRequest(shop, payload),
    );
  }

  async receiveCustomersRedact(
    request: ShopifyWebhookRequest,
  ): Promise<WebhookReceipt> {
    return this.receiveShopScopedWebhook(
      request,
      CUSTOMERS_REDACT_WEBHOOK_TOPIC,
      ({ shop, payload }) =>
        this.compliance.handleCustomersRedact(shop, payload),
    );
  }

  async receiveShopRedact(
    request: ShopifyWebhookRequest,
  ): Promise<WebhookReceipt> {
    return this.receiveShopCleanupWebhook(request, SHOP_REDACT_WEBHOOK_TOPIC);
  }

  async receiveAppUninstalled(
    request: ShopifyWebhookRequest,
  ): Promise<WebhookReceipt> {
    return this.receiveShopCleanupWebhook(
      request,
      APP_UNINSTALLED_WEBHOOK_TOPIC,
    );
  }

  private async receiveShopScopedWebhook(
    request: ShopifyWebhookRequest,
    fallbackTopic: string,
    handler: ShopScopedHandler,
    getShopifyOrderGid?: (payload: ShopifyWebhookPayload) => string | undefined,
  ): Promise<WebhookReceipt> {
    const shopDomain = this.getRequiredHeader(request, 'x-shopify-shop-domain');
    const topic = this.getHeader(request, 'x-shopify-topic') || fallbackTopic;
    const webhookId = this.getHeader(request, 'x-shopify-webhook-id');
    const payload = this.getPayload(request);

    const duplicate = await this.findDuplicate(webhookId);

    if (duplicate) {
      return duplicate;
    }

    const shop = await this.shops.findByDomain(shopDomain);

    if (!shop) {
      return { status: 'ignored', reason: 'shop_not_found' };
    }

    const event = await this.webhooks.create({
      shopId: shop.id,
      topic,
      shopifyWebhookId: webhookId,
      shopifyOrderGid: getShopifyOrderGid?.(payload),
      payloadHash: this.hashPayload(request.rawBody),
    });

    try {
      await handler({ shop, payload, eventId: event.id });
      await this.webhooks.markProcessed(event.id);
    } catch (error) {
      await this.webhooks.markFailed(event.id, this.getErrorMessage(error));
    }

    return { status: 'accepted', eventId: event.id };
  }

  private async receiveShopCleanupWebhook(
    request: ShopifyWebhookRequest,
    fallbackTopic: string,
  ): Promise<WebhookReceipt> {
    const shopDomain = this.getRequiredHeader(request, 'x-shopify-shop-domain');
    const webhookId = this.getHeader(request, 'x-shopify-webhook-id');
    const duplicate = await this.findDuplicate(webhookId);

    if (duplicate) {
      return duplicate;
    }

    const shop = await this.shops.findByDomain(shopDomain);

    if (!shop) {
      await this.compliance.cleanupShopData(
        shopDomain,
        fallbackTopic === APP_UNINSTALLED_WEBHOOK_TOPIC
          ? 'app_uninstalled'
          : 'shop_redact',
      );
      return { status: 'ignored', reason: 'shop_not_found' };
    }

    const topic = this.getHeader(request, 'x-shopify-topic') || fallbackTopic;
    const event = await this.webhooks.create({
      shopId: shop.id,
      topic,
      shopifyWebhookId: webhookId,
      payloadHash: this.hashPayload(request.rawBody),
    });

    try {
      await this.compliance.cleanupShopData(
        shopDomain,
        fallbackTopic === APP_UNINSTALLED_WEBHOOK_TOPIC
          ? 'app_uninstalled'
          : 'shop_redact',
      );
    } catch (error) {
      await this.webhooks.markFailed(event.id, this.getErrorMessage(error));
      return { status: 'accepted', eventId: event.id };
    }

    return { status: 'accepted', eventId: event.id };
  }

  private async findDuplicate(webhookId?: string) {
    if (!webhookId) {
      return null;
    }

    const existing = await this.webhooks.findByShopifyWebhookId(webhookId);

    if (!existing) {
      return null;
    }

    return { status: 'duplicate', eventId: existing.id } as const;
  }

  private getPayload(request: ShopifyWebhookRequest) {
    if (!request.body || typeof request.body !== 'object') {
      throw new BadRequestException('Missing webhook payload');
    }

    return request.body as ShopifyWebhookPayload;
  }

  private hashPayload(rawBody?: Buffer) {
    return createHash('sha256')
      .update(rawBody || '')
      .digest('hex');
  }

  private getShopifyOrderGid(payload: ShopifyWebhookPayload) {
    if (typeof payload.admin_graphql_api_id === 'string') {
      return payload.admin_graphql_api_id;
    }

    if (typeof payload.id === 'number' || typeof payload.id === 'string') {
      return 'gid://shopify/Order/' + payload.id;
    }

    return undefined;
  }

  private getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : String(error);
  }

  private getRequiredHeader(request: ShopifyWebhookRequest, name: string) {
    const value = this.getHeader(request, name);

    if (!value) {
      throw new BadRequestException('Missing ' + name + ' header');
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
