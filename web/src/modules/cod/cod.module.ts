import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ShopifyModule } from '../shopify/shopify.module';
import { CodOrderProcessorService } from './orders/cod-order-processor.service';
import { CodOrderRepository } from './orders/cod-order.repository';

@Module({
  imports: [PrismaModule, ShopifyModule],
  providers: [CodOrderProcessorService, CodOrderRepository],
  exports: [CodOrderProcessorService],
})
export class CodModule {}
