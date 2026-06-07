import { Injectable } from '@nestjs/common';
import { Prisma, Shop } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ShopRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByDomain(domain: string): Promise<Shop | null> {
    return this.prisma.shop.findUnique({
      where: { domain },
    });
  }

  upsert(data: Prisma.ShopUncheckedCreateInput): Promise<Shop> {
    return this.prisma.shop.upsert({
      where: { domain: data.domain },
      update: data,
      create: data,
    });
  }
}
