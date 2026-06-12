import { Controller, Get, Req, Res } from '@nestjs/common';
import { readFileSync } from 'fs';
import { Request, Response } from 'express';
import { join } from 'path';
import { renderLegalPageHtml } from './legal/legal-page.renderer';
import { getLegalPage, LegalPageKey } from './legal/legal-pages';
import { ShopifyService } from './modules/shopify/shopify.service';

@Controller()
export class AppController {
  constructor(private readonly shopifyService: ShopifyService) {}

  @Get('/health')
  health() {
    return { ok: true };
  }

  @Get(['/privacy', '/privacy-policy'])
  privacy(@Res() res: Response) {
    return this.renderLegalPage(res, 'privacy');
  }

  @Get(['/terms', '/terms-of-service'])
  terms(@Res() res: Response) {
    return this.renderLegalPage(res, 'terms');
  }

  @Get('/data-retention')
  dataRetention(@Res() res: Response) {
    return this.renderLegalPage(res, 'dataRetention');
  }

  @Get()
  async index(@Req() req: Request, @Res() res: Response) {
    const shop = this.shopifyService.sanitizeShop(req.query.shop as string);

    if (!shop) {
      return res.status(400).send('Missing or invalid shop parameter');
    }

    const hasSession = await this.shopifyService.hasOfflineSession(shop);

    if (!hasSession) {
      return this.redirectToAuth(req, res, shop);
    }

    const entryFile = join(
      __dirname,
      process.env.NODE_ENV === 'production'
        ? '../frontend/dist'
        : '../frontend',
      'index.html',
    );

    const html = readFileSync(entryFile)
      .toString()
      .replace('%VITE_SHOPIFY_API_KEY%', process.env.SHOPIFY_API_KEY || '');

    return res.status(200).type('html').send(html);
  }

  private renderLegalPage(res: Response, key: LegalPageKey) {
    const page = getLegalPage(key, { supportEmail: this.supportEmail() });

    return res.status(200).type('html').send(renderLegalPageHtml(page));
  }

  private supportEmail() {
    return process.env.SUPPORT_EMAIL || 'support@vn-cod-guard.app';
  }

  private redirectToAuth(req: Request, res: Response, shop: string) {
    if (req.query.embedded === '1') {
      const host = req.query.host as string;
      const redirectUri = `https://${this.shopifyService.hostName}/api/auth?${new URLSearchParams({ shop, host }).toString()}`;
      const query = new URLSearchParams({
        ...Object.fromEntries(
          Object.entries(req.query).map(([key, value]) => [key, String(value)]),
        ),
        shop,
        redirectUri,
      }).toString();

      return res.redirect(`/exit-iframe?${query}`);
    }

    return res.redirect(
      `/api/auth?${new URLSearchParams({ shop }).toString()}`,
    );
  }
}
