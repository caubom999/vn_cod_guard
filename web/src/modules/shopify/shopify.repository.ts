import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ShopifySession } from '@prisma/client';
import { Session } from '@shopify/shopify-api';
import { RedisSessionStorage } from '@shopify/shopify-app-session-storage-redis';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ShopifySessionRepository implements OnModuleDestroy {
  private readonly logger = new Logger(ShopifySessionRepository.name);
  private readonly redis: RedisSessionStorage | null;
  private redisReady = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.redis = this.createRedisStorage();
  }

  async onModuleDestroy() {
    if (!this.redis) {
      return;
    }

    try {
      await this.redis.disconnect();
    } catch (error) {
      this.logger.warn(
        'Could not disconnect Redis session storage: ' +
          this.getErrorMessage(error),
      );
    }
  }

  async save(session: Session) {
    await this.storeInRedis(session);

    return this.prisma.shopifySession.upsert({
      where: { id: session.id },
      update: this.toPersistence(session),
      create: {
        id: session.id,
        ...this.toPersistence(session),
      },
    });
  }

  async findById(id: string) {
    const redisSession = await this.loadFromRedis(id);

    if (redisSession) {
      return redisSession;
    }

    const persistedSession = await this.prisma.shopifySession.findUnique({
      where: { id },
    });

    if (!persistedSession) {
      return null;
    }

    const session = this.toSession(persistedSession);

    await this.storeInRedis(session);

    return session;
  }

  async hasOfflineSession(shop: string) {
    const redisSessions = await this.findRedisSessionsByShop(shop);

    if (redisSessions.some((session) => !session.isOnline)) {
      return true;
    }

    const count = await this.prisma.shopifySession.count({
      where: {
        shop,
        isOnline: false,
      },
    });

    return count > 0;
  }

  async deleteRedisSessionsByShop(shop: string) {
    const sessions = await this.findRedisSessionsByShop(shop);
    const ids = sessions.map((session) => session.id);

    if (!this.redis || !ids.length) {
      return { deletedRedisSessions: 0 };
    }

    try {
      await this.redis.deleteSessions(ids);
      return { deletedRedisSessions: ids.length };
    } catch (error) {
      this.logger.warn(
        'Could not delete Redis sessions for ' +
          shop +
          ': ' +
          this.getErrorMessage(error),
      );
      return { deletedRedisSessions: 0 };
    }
  }

  async deleteSessionsByShop(shop: string) {
    const { deletedRedisSessions } = await this.deleteRedisSessionsByShop(shop);
    const { count: deletedPersistedSessions } =
      await this.prisma.shopifySession.deleteMany({
        where: { shop },
      });

    return {
      deletedRedisSessions,
      deletedPersistedSessions,
    };
  }

  private createRedisStorage() {
    if (this.getSessionStorageMode() !== 'redis') {
      return null;
    }

    const storage = new RedisSessionStorage(this.getRedisUrl(), {
      sessionKeyPrefix:
        this.config.get<string>('SHOPIFY_SESSION_REDIS_KEY_PREFIX') ||
        'shopify_sessions',
    });

    void storage.ready
      .then(() => {
        this.redisReady = true;
      })
      .catch((error) => {
        this.redisReady = false;
        this.logger.warn(
          'Redis session storage is not ready; continuing with Prisma session storage: ' +
            this.getErrorMessage(error),
        );
      });

    return storage;
  }

  private getSessionStorageMode() {
    return (
      this.config.get<string>('SHOPIFY_SESSION_STORAGE') || 'prisma'
    ).toLowerCase();
  }

  private async storeInRedis(session: Session) {
    if (!this.isRedisAvailable()) {
      return;
    }

    try {
      await this.redis.storeSession(session);
    } catch (error) {
      this.logger.warn(
        'Could not store Shopify session in Redis: ' +
          this.getErrorMessage(error),
      );
    }
  }

  private async loadFromRedis(id: string) {
    if (!this.isRedisAvailable()) {
      return null;
    }

    try {
      return (await this.redis.loadSession(id)) || null;
    } catch (error) {
      this.logger.warn(
        'Could not load Shopify session from Redis: ' +
          this.getErrorMessage(error),
      );
      return null;
    }
  }

  private async findRedisSessionsByShop(shop: string) {
    if (!this.isRedisAvailable()) {
      return [];
    }

    try {
      return await this.redis.findSessionsByShop(shop);
    } catch (error) {
      this.logger.warn(
        'Could not load Shopify sessions from Redis for ' +
          shop +
          ': ' +
          this.getErrorMessage(error),
      );
      return [];
    }
  }

  private getRedisUrl() {
    const configuredUrl = this.config.get<string>('REDIS_URL');

    if (configuredUrl) {
      return configuredUrl;
    }

    const host = this.config.get<string>('REDIS_HOST') || '127.0.0.1';
    const port = this.config.get<string>('REDIS_PORT') || '6379';
    const database = this.config.get<string>('REDIS_DATABASE') || '0';
    const username = this.config.get<string>('REDIS_USERNAME');
    const password = this.config.get<string>('REDIS_PASSWORD');
    const auth = password
      ? `${username ? encodeURIComponent(username) : ''}:${encodeURIComponent(password)}@`
      : '';

    return `redis://${auth}${host}:${port}/${database}`;
  }

  private isRedisAvailable() {
    return Boolean(this.redis && this.redisReady);
  }

  private toPersistence(session: Session) {
    return {
      shop: session.shop,
      state: session.state || '',
      isOnline: session.isOnline || false,
      scope: session.scope,
      expires: session.expires ? new Date(session.expires) : null,
      accessToken: session.accessToken || '',
      userId: session.onlineAccessInfo?.associated_user?.id
        ? BigInt(session.onlineAccessInfo.associated_user.id)
        : null,
    };
  }

  private toSession(session: ShopifySession) {
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

  private getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : String(error);
  }
}
