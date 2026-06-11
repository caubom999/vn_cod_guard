import { Module } from '@nestjs/common';
import { CodModule } from '../cod/cod.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ShopModule } from '../shop/shop.module';
import { ShopifyWebhookGuard } from './guards/shopify-webhook.guard';
import { WebhooksController } from './webhooks.controller';
import { WebhooksRepository } from './webhooks.repository';
import { WebhooksService } from './webhooks.service';

@Module({
  imports: [PrismaModule, ShopModule, CodModule],
  controllers: [WebhooksController],
  providers: [WebhooksService, WebhooksRepository, ShopifyWebhookGuard],
})
export class WebhooksModule {}
