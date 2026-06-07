import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ShopifyGuard, AuthenticatedRequest } from '../shopify/shopify.guard';

@Controller('api/shop')
@UseGuards(ShopifyGuard)
export class ShopController {
  @Get('me')
  me(@Req() req: AuthenticatedRequest) {
    const { accessToken, ...shop } = req.shop;

    return shop;
  }
}
