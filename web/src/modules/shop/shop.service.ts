import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ShopRepository } from './shop.repository';

@Injectable()
export class ShopService {
  constructor(private readonly shops: ShopRepository) {}

  findByDomain(domain: string) {
    return this.shops.findByDomain(domain);
  }

  upsert(data: Prisma.ShopUncheckedCreateInput) {
    return this.shops.upsert(data);
  }
}
