import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  LATEST_API_VERSION,
  Session,
  Shopify,
  shopifyApi,
} from '@shopify/shopify-api';
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
      apiVersion: LATEST_API_VERSION,
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
    const session = await this.sessions.findById(sessionId);

    if (!session) {
      return null;
    }

    return new Session({
      id: session.id,
      shop: session.shop,
      state: session.state,
      isOnline: session.isOnline,
      scope: session.scope || undefined,
      expires: session.expires || undefined,
      accessToken: session.accessToken,
    });
  }

  async graphql(shop: string, query: string, variables?: Record<string, unknown>) {
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
