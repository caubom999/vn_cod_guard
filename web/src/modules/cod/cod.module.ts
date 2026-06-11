import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ShopModule } from '../shop/shop.module';
import { ShopifyModule } from '../shopify/shopify.module';
import { CodOrderProcessorService } from './orders/cod-order-processor.service';
import { CodSettingsController } from './settings/cod-settings.controller';
import { CodSettingsRepository } from './settings/cod-settings.repository';
import { CodSettingsService } from './settings/cod-settings.service';
import { CodOrderRepository } from './orders/cod-order.repository';
import { VerificationController } from './verification/verification.controller';
import { VerificationRepository } from './verification/verification.repository';
import { VerificationService } from './verification/verification.service';

@Module({
  imports: [PrismaModule, ShopModule, ShopifyModule],
  controllers: [VerificationController, CodSettingsController],
  providers: [
    CodOrderProcessorService,
    CodOrderRepository,
    CodSettingsService,
    CodSettingsRepository,
    VerificationService,
    VerificationRepository,
  ],
  exports: [CodOrderProcessorService, VerificationService],
})
export class CodModule {}
