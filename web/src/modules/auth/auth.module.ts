import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { BillingModule } from '../billing/billing.module';
import { ShopModule } from '../shop/shop.module';
import { ShopifyModule } from '../shopify/shopify.module';

@Module({
  imports: [ShopifyModule, ShopModule, BillingModule],
  controllers: [AuthController],
})
export class AuthModule {}
