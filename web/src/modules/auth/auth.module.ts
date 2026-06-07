import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { ShopModule } from '../shop/shop.module';
import { ShopifyModule } from '../shopify/shopify.module';

@Module({
  imports: [ShopifyModule, ShopModule],
  controllers: [AuthController],
})
export class AuthModule {}
