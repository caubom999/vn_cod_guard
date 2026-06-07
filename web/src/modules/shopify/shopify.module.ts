import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { ShopifySessionRepository } from './shopify.repository';
import { ShopifyService } from './shopify.service';

@Global()
@Module({
  imports: [ConfigModule, PrismaModule],
  providers: [ShopifyService, ShopifySessionRepository],
  exports: [ShopifyService, ShopifySessionRepository],
})
export class ShopifyModule {}
