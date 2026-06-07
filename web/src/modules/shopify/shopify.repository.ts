import { Injectable } from '@nestjs/common';
import { Session } from '@shopify/shopify-api';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ShopifySessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(session: Session) {
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
    return this.prisma.shopifySession.findUnique({
      where: { id },
    });
  }

  async hasOfflineSession(shop: string) {
    const count = await this.prisma.shopifySession.count({
      where: {
        shop,
        isOnline: false,
      },
    });

    return count > 0;
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
}
