import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  CodOrder,
  CodOrderStatus,
  CodShopSetting,
  Shop,
  VerificationChannel,
  VerificationSession,
  VerificationSessionStatus,
} from '@prisma/client';
import { createHash, randomBytes } from 'crypto';
import {
  ADD_SHOPIFY_TAGS,
  REMOVE_SHOPIFY_TAGS,
  UPDATE_SHOPIFY_ORDER_NOTE,
} from '../../graphql/mutation/order.mutation';
import { GET_SHOPIFY_ORDER_NOTE } from '../../graphql/query/order.query';
import { ShopifyService } from '../../shopify/shopify.service';
import { COD_DEFAULT_TAGS } from '../cod.constants';
import { MessagingService } from '../messaging/messaging.service';
import { VerificationRepository } from './verification.repository';

type SessionWithOrder = VerificationSession & {
  codOrder: CodOrder & {
    shop: Shop & {
      codSetting: CodShopSetting | null;
    };
  };
};

export type VerificationView = {
  session: VerificationSession;
  order: CodOrder;
  shop: Shop;
  isExpired: boolean;
};

@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);

  constructor(
    private readonly verifications: VerificationRepository,
    private readonly shopify: ShopifyService,
    private readonly messaging: MessagingService,
  ) {}

  async createSessionForOrder(input: {
    codOrderId: number;
    expiresAt: Date;
    channel?: VerificationChannel;
  }) {
    const token = this.generateToken();

    await this.verifications.revokeActiveSessions(input.codOrderId);

    const session = await this.verifications.createSession({
      codOrderId: input.codOrderId,
      channel: input.channel || VerificationChannel.EMAIL,
      tokenHash: this.hashToken(token),
      expiresAt: input.expiresAt,
    });

    await this.verifications.createEvent({
      codOrderId: input.codOrderId,
      verificationSessionId: session.id,
      type: 'VERIFICATION_SESSION_CREATED',
      message: 'Verification session created with hashed token.',
    });

    try {
      await this.messaging.sendVerificationMessage({
        verificationSessionId: session.id,
        token,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      this.logger.warn(`Could not dispatch verification message: ${message}`);

      await this.verifications.createEvent({
        codOrderId: input.codOrderId,
        verificationSessionId: session.id,
        type: 'VERIFICATION_MESSAGE_DISPATCH_FAILED',
        message,
      });
    }

    return { session, token };
  }

  async getViewByToken(token: string): Promise<VerificationView> {
    const session = await this.getSessionByToken(token);
    const isExpired = this.isExpired(session);

    if (isExpired && session.status === VerificationSessionStatus.ACTIVE) {
      await this.markExpired(session);
    }

    return {
      session,
      order: session.codOrder,
      shop: session.codOrder.shop,
      isExpired,
    };
  }

  async confirm(
    token: string,
    metadata: { ipAddress?: string; userAgent?: string },
  ) {
    const session = await this.getUsableSession(token);
    const now = new Date();

    await this.verifications.updateSessionStatus(
      session.id,
      VerificationSessionStatus.CONFIRMED,
      {
        confirmedAt: now,
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
      },
    );

    await this.verifications.updateOrderStatus(
      session.codOrder.id,
      CodOrderStatus.CONFIRMED,
      {
        verifiedAt: now,
      },
    );

    await this.verifications.createEvent({
      codOrderId: session.codOrder.id,
      verificationSessionId: session.id,
      type: 'CUSTOMER_CONFIRMED',
      message: 'Customer confirmed COD order from public verification link.',
      metadataJson: metadata,
    });

    await this.syncShopifyAfterDecision(session, 'confirm');

    return this.getViewByToken(token);
  }

  async cancel(
    token: string,
    metadata: { ipAddress?: string; userAgent?: string },
  ) {
    const session = await this.getUsableSession(token);
    const now = new Date();

    await this.verifications.updateSessionStatus(
      session.id,
      VerificationSessionStatus.CANCELLED,
      {
        cancelledAt: now,
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
      },
    );

    await this.verifications.updateOrderStatus(
      session.codOrder.id,
      CodOrderStatus.CANCELLED_BY_CUSTOMER,
      {
        cancelledAt: now,
      },
    );

    await this.verifications.createEvent({
      codOrderId: session.codOrder.id,
      verificationSessionId: session.id,
      type: 'CUSTOMER_CANCELLED',
      message: 'Customer cancelled COD order from public verification link.',
      metadataJson: metadata,
    });

    await this.syncShopifyAfterDecision(session, 'cancel');

    return this.getViewByToken(token);
  }

  private async getUsableSession(token: string) {
    const session = await this.getSessionByToken(token);

    if (session.status !== VerificationSessionStatus.ACTIVE) {
      return session;
    }

    if (this.isExpired(session)) {
      await this.markExpired(session);
      throw new NotFoundException('Verification link expired');
    }

    return session;
  }

  private async getSessionByToken(token: string): Promise<SessionWithOrder> {
    const session = await this.verifications.findByTokenHash(
      this.hashToken(token),
    );

    if (!session) {
      throw new NotFoundException('Verification link not found');
    }

    return session;
  }

  private async markExpired(session: SessionWithOrder) {
    await this.verifications.updateSessionStatus(
      session.id,
      VerificationSessionStatus.EXPIRED,
    );

    await this.verifications.updateOrderStatus(
      session.codOrder.id,
      CodOrderStatus.EXPIRED,
    );

    await this.verifications.createEvent({
      codOrderId: session.codOrder.id,
      verificationSessionId: session.id,
      type: 'VERIFICATION_EXPIRED',
      message: 'Verification link expired before customer decision.',
    });
  }

  private async syncShopifyAfterDecision(
    session: SessionWithOrder,
    decision: 'confirm' | 'cancel',
  ) {
    const order = session.codOrder;
    const shop = order.shop;
    const setting = shop.codSetting;
    const pendingTag = setting?.pendingTag || COD_DEFAULT_TAGS.pending;
    const riskTag = setting?.riskTag || COD_DEFAULT_TAGS.risky;
    const decisionTag =
      decision === 'confirm'
        ? setting?.confirmedTag || COD_DEFAULT_TAGS.confirmed
        : setting?.cancelledTag || COD_DEFAULT_TAGS.cancelled;
    const noteLine = `[VN-Cod-Guard] COD ${decision === 'confirm' ? 'confirmed' : 'cancelled'} by customer at ${new Date().toISOString()}.`;

    try {
      await this.shopify.graphql(shop.domain, REMOVE_SHOPIFY_TAGS, {
        id: order.shopifyOrderGid,
        tags: [pendingTag, riskTag],
      });

      await this.shopify.graphql(shop.domain, ADD_SHOPIFY_TAGS, {
        id: order.shopifyOrderGid,
        tags: [decisionTag],
      });

      await this.appendShopifyOrderNote(
        shop.domain,
        order.shopifyOrderGid,
        noteLine,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      this.logger.warn(
        `Could not sync Shopify verification result: ${message}`,
      );

      await this.verifications.createEvent({
        codOrderId: order.id,
        verificationSessionId: session.id,
        type: 'SHOPIFY_VERIFICATION_SYNC_FAILED',
        message,
        metadataJson: { decision, decisionTag },
      });
    }
  }

  private async appendShopifyOrderNote(
    shopDomain: string,
    shopifyOrderGid: string,
    noteLine: string,
  ) {
    const response = (await this.shopify.graphql(
      shopDomain,
      GET_SHOPIFY_ORDER_NOTE,
      { id: shopifyOrderGid },
    )) as { data?: { order?: { note?: string | null } } };

    const currentNote = response.data?.order?.note?.trim();
    const nextNote = currentNote ? `${currentNote}\n${noteLine}` : noteLine;

    await this.shopify.graphql(shopDomain, UPDATE_SHOPIFY_ORDER_NOTE, {
      input: {
        id: shopifyOrderGid,
        note: nextNote,
      },
    });
  }

  private isExpired(session: VerificationSession) {
    return session.expiresAt.getTime() <= Date.now();
  }

  private generateToken() {
    return randomBytes(32).toString('base64url');
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }
}
