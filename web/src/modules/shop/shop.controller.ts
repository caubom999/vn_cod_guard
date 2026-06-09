import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ShopifyGuard, AuthenticatedRequest } from '../shopify/shopify.guard';

@Controller('api/shop')
@UseGuards(ShopifyGuard)
export class ShopController {
  @Get('me')
  me(@Req() req: AuthenticatedRequest) {
    return {
      id: req.shop.id,
      domain: req.shop.domain,
      name: req.shop.name,
      email: req.shop.email,
      scopes: req.shop.scopes,
      installedAt: req.shop.installedAt,
      updatedAt: req.shop.updatedAt,
    };
  }
}
