import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiVersion, Session, Shopify, shopifyApi } from '@shopify/shopify-api';
import { ShopifySessionRepository } from './shopify.repository';

@Injectable()
export class ShopifyService {
  readonly shopify: Shopify;
  readonly hostName: string;

  constructor(
    private readonly config: ConfigService,
    private readonly sessions: ShopifySessionRepository,
  ) {
    this.hostName = this.config.getOrThrow<string>('app.hostName');

    this.shopify = shopifyApi({
      apiKey: this.config.getOrThrow<string>('shopify.apiKey'),
      apiSecretKey: this.config.getOrThrow<string>('shopify.apiSecret'),
      scopes: this.config.getOrThrow<string[]>('shopify.scopes'),
      hostName: this.hostName,
      hostScheme: this.config.get<'http' | 'https'>('app.scheme'),
      apiVersion: this.config.getOrThrow<string>(
        'shopify.apiVersion',
      ) as ApiVersion,
      isEmbeddedApp: true,
    });
  }

  sanitizeShop(shop?: string) {
    if (!shop) {
      return null;
    }

    return this.shopify.utils.sanitizeShop(shop);
  }

  async storeSession(session: Session) {
    return this.sessions.save(session);
  }

  async hasOfflineSession(shop: string) {
    return this.sessions.hasOfflineSession(shop);
  }

  async loadOfflineSession(shop: string) {
    const sessionId = this.shopify.session.getOfflineId(shop);
    return this.sessions.findById(sessionId);
  }

  async graphql(
    shop: string,
    query: string,
    variables?: Record<string, unknown>,
  ) {
    const session = await this.loadOfflineSession(shop);

    if (!session) {
      throw new Error(`Offline session not found for ${shop}`);
    }

    const client = new this.shopify.clients.Graphql({ session });

    return client.request(query, { variables });
  }

  async decodeSessionToken(token: string) {
    return (this.shopify.session as any).decodeSessionToken(token);
  }
}
