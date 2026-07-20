import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MessageTemplateRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(shopId: number) {
    return this.prisma.codMessageTemplate.findMany({
      where: { shopId },
      orderBy: [{ channel: 'asc' }, { type: 'asc' }, { locale: 'asc' }],
    });
  }

  findById(id: number, shopId: number) {
    return this.prisma.codMessageTemplate.findFirst({
      where: { id, shopId },
    });
  }

  update(
    id: number,
    shopId: number,
    data: Prisma.CodMessageTemplateUpdateInput,
  ) {
    return this.prisma.codMessageTemplate.update({
      where: { id, shopId },
      data,
    });
  }
}
