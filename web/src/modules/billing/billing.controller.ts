import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { BillingPlanKey } from '@prisma/client';
import { Response } from 'express';
import { ShopService } from '../shop/shop.service';
import { AuthenticatedRequest, ShopifyGuard } from '../shopify/shopify.guard';
import { BillingService } from './billing.service';

@Controller('api/billing')
export class BillingController {
  constructor(
    private readonly billing: BillingService,
    private readonly shops: ShopService,
  ) {}

  @Get('plans')
  @UseGuards(ShopifyGuard)
  plans() {
    return this.billing.getPlans();
  }

  @Get('summary')
  @UseGuards(ShopifyGuard)
  summary(@Req() request: AuthenticatedRequest) {
    return this.billing.getSummary(request.shop);
  }

  @Post('subscribe')
  @UseGuards(ShopifyGuard)
  subscribe(
    @Req() request: AuthenticatedRequest,
    @Body() body: { planKey: BillingPlanKey },
  ) {
    return this.billing.createSubscription(request.shop, body.planKey);
  }

  @Post('select-free')
  @UseGuards(ShopifyGuard)
  selectFree(@Req() request: AuthenticatedRequest) {
    return this.billing.selectFreePlan(request.shop);
  }

  @Post('sync')
  @UseGuards(ShopifyGuard)
  sync(@Req() request: AuthenticatedRequest) {
    return this.billing.syncFromShopify(request.shop);
  }

  @Get('callback')
  async callback(@Query('shop') shopDomain: string, @Res() response: Response) {
    if (shopDomain) {
      const shop = await this.shops.findByDomain(shopDomain);

      if (shop) {
        await this.billing.syncFromShopify(shop);
      }
    }

    return response.redirect('/?shop=' + encodeURIComponent(shopDomain || ''));
  }
}
