import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiVersion,
  HttpResponseError,
  Session,
  Shopify,
  shopifyApi,
} from '@shopify/shopify-api';
import { ShopifySessionRepository } from './shopify.repository';

@Injectable()
export class ShopifyService {
  private readonly logger = new Logger(ShopifyService.name);
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
      throw new UnauthorizedException(
        'Shopify authorization is missing. Reopen the app to reconnect.',
      );
    }

    const client = new this.shopify.clients.Graphql({ session });

    try {
      return await client.request(query, { variables });
    } catch (error) {
      if (!this.isUnauthorizedResponse(error)) {
        throw error;
      }

      await this.sessions.deleteSessionsByShop(shop);
      this.logger.warn(
        `Removed invalid Shopify sessions for ${shop} after Admin API returned 401`,
      );
      throw new UnauthorizedException(
        'Shopify authorization expired. Reopen the app to reconnect.',
      );
    }
  }

  async decodeSessionToken(token: string) {
    return (this.shopify.session as any).decodeSessionToken(token);
  }

  private isUnauthorizedResponse(error: unknown) {
    if (error instanceof HttpResponseError) {
      return error.response.code === 401;
    }

    if (!error || typeof error !== 'object') {
      return false;
    }

    const candidate = error as {
      networkStatusCode?: number;
      response?: { code?: number; status?: number };
    };

    return (
      candidate.networkStatusCode === 401 ||
      candidate.response?.code === 401 ||
      candidate.response?.status === 401
    );
  }
}
