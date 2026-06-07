import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ShopController } from './shop.controller';
import { ShopRepository } from './shop.repository';
import { ShopService } from './shop.service';

@Module({
  imports: [PrismaModule],
  controllers: [ShopController],
  providers: [ShopService, ShopRepository],
  exports: [ShopService],
})
export class ShopModule {}
