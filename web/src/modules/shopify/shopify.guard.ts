import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { Shop } from '@prisma/client';
import { ShopService } from '../shop/shop.service';
import { ShopifyService } from './shopify.service';

export type AuthenticatedRequest = ExpressRequest & {
  shop: Shop;
  shopDomain: string;
};

@Injectable()
export class ShopifyGuard implements CanActivate {
  constructor(
    private readonly shopifyService: ShopifyService,
    private readonly shopService: ShopService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = request.headers.authorization?.replace(/^Bearer\s+/i, '');

    if (!token) {
      throw new UnauthorizedException('Missing Shopify session token');
    }

    const payload = await this.shopifyService.decodeSessionToken(token);
    const shopDomain = new URL(payload.dest).hostname;
    const shop = await this.shopService.findByDomain(shopDomain);

    if (!shop) {
      throw new UnauthorizedException('Shop is not installed');
    }

    request.shop = shop;
    request.shopDomain = shopDomain;

    return true;
  }
}
