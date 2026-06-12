import { Controller, Get, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { BillingService } from '../billing/billing.service';
import { ShopService } from '../shop/shop.service';
import { SHOP_INFO } from '../graphql/query/shop.query';
import { ShopifyService } from '../shopify/shopify.service';

@Controller('api/auth')
export class AuthController {
  constructor(
    private readonly shopifyService: ShopifyService,
    private readonly shopService: ShopService,
    private readonly billingService: BillingService,
  ) {}

  @Get()
  async begin(@Req() req: Request, @Res() res: Response) {
    const shop = this.shopifyService.sanitizeShop(req.query.shop as string);

    if (!shop) {
      return res.status(400).send('Missing or invalid shop parameter');
    }

    return this.shopifyService.shopify.auth.begin({
      shop,
      callbackPath: '/api/auth/callback',
      isOnline: false,
      rawRequest: req,
      rawResponse: res,
    });
  }

  @Get('callback')
  async callback(@Req() req: Request, @Res() res: Response) {
    const { session } = await this.shopifyService.shopify.auth.callback({
      rawRequest: req,
      rawResponse: res,
    });

    await this.shopifyService.storeSession(session);

    const shopInfo = await this.shopifyService.graphql(session.shop, SHOP_INFO);
    const shop = shopInfo?.data?.shop;

    const installedShop = await this.shopService.upsert({
      domain: session.shop,
      name: shop?.name,
      email: shop?.email,
      accessToken: session.accessToken,
      scopes: session.scope,
    });

    await this.billingService.ensureDefaultSubscription(installedShop.id);

    const redirectUrl =
      await this.shopifyService.shopify.auth.getEmbeddedAppUrl({
        rawRequest: req,
        rawResponse: res,
      });

    return res.redirect(redirectUrl.replace(/\/$/, ''));
  }
}
