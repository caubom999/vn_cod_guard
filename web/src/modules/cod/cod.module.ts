import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ShopifyModule } from '../shopify/shopify.module';
import { CodOrderProcessorService } from './orders/cod-order-processor.service';
import { CodOrderRepository } from './orders/cod-order.repository';
import { VerificationController } from './verification/verification.controller';
import { VerificationRepository } from './verification/verification.repository';
import { VerificationService } from './verification/verification.service';

@Module({
  imports: [PrismaModule, ShopifyModule],
  controllers: [VerificationController],
  providers: [
    CodOrderProcessorService,
    CodOrderRepository,
    VerificationService,
    VerificationRepository,
  ],
  exports: [CodOrderProcessorService, VerificationService],
})
export class CodModule {}
