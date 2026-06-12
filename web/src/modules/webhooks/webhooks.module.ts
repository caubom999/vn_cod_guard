import { Module } from '@nestjs/common';
import { BillingModule } from '../billing/billing.module';
import { CodModule } from '../cod/cod.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ShopModule } from '../shop/shop.module';
import { ShopifyWebhookGuard } from './guards/shopify-webhook.guard';
import { ComplianceService } from './compliance.service';
import { WebhooksController } from './webhooks.controller';
import { WebhooksRepository } from './webhooks.repository';
import { WebhooksService } from './webhooks.service';

@Module({
  imports: [PrismaModule, ShopModule, CodModule, BillingModule],
  controllers: [WebhooksController],
  providers: [
    WebhooksService,
    WebhooksRepository,
    ComplianceService,
    ShopifyWebhookGuard,
  ],
})
export class WebhooksModule {}
