import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ShopifyService } from '../shopify/shopify.service';

const SHOP_ID = `#graphql
  query SmsBillingShopId {
    shop { id }
  }
`;

@Injectable()
export class AppEventsBillingService {
  private readonly logger = new Logger(AppEventsBillingService.name);
  private accessToken: { value: string; expiresAt: number } | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly shopify: ShopifyService,
  ) {}

  async reportSmsSent(input: {
    shopDomain: string;
    deliveryId: number;
    segments: number;
    sentAt: Date;
  }) {
    if (process.env.SHOPIFY_SMS_USAGE_BILLING_ENABLED !== 'true') {
      return { reported: false, reason: 'disabled' };
    }

    const shopResponse = await this.shopify.graphql(input.shopDomain, SHOP_ID);
    const shopId = (shopResponse as { data?: { shop?: { id?: string } } }).data
      ?.shop?.id;

    if (!shopId) {
      throw new Error('Shopify shop ID is required for SMS usage billing');
    }

    const response = await fetch(
      'https://api.shopify.com/app/unstable/events',
      {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + (await this.getAccessToken()),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shop_id: shopId,
          event_handle: process.env.SMS_USAGE_EVENT_HANDLE || 'sms_sent',
          timestamp: input.sentAt.toISOString(),
          idempotency_key: `sms_delivery_${input.deliveryId}`,
          attributes: { value: input.segments },
        }),
      },
    );

    if (response.status !== 202) {
      throw new Error(
        `Shopify SMS billing event failed (${response.status}): ${await response.text()}`,
      );
    }

    this.logger.log(
      `Submitted ${input.segments} SMS segment(s) for delivery ${input.deliveryId}`,
    );

    return { reported: true };
  }

  private async getAccessToken() {
    if (this.accessToken && this.accessToken.expiresAt > Date.now() + 60_000) {
      return this.accessToken.value;
    }

    const response = await fetch('https://api.shopify.com/auth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: this.config.getOrThrow<string>('shopify.apiKey'),
        client_secret: this.config.getOrThrow<string>('shopify.apiSecret'),
        grant_type: 'client_credentials',
      }),
    });
    const responseText = await response.text();

    if (!response.ok) {
      throw new Error(
        'Could not authenticate Shopify App Events: ' + responseText,
      );
    }

    const payload = this.parseJson(responseText) as {
      access_token?: string;
      expires_in?: number;
    };

    if (!payload.access_token) {
      throw new Error('Shopify App Events access token was not returned');
    }

    this.accessToken = {
      value: payload.access_token,
      expiresAt: Date.now() + (payload.expires_in || 3600) * 1000,
    };

    return this.accessToken.value;
  }

  private parseJson(value: string) {
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }
}
