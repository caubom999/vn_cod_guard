import { Injectable } from '@nestjs/common';
import { CodOrderStatus, Prisma } from '@prisma/client';
import { COD_RISK_REVIEW_THRESHOLD } from '../cod.constants';
import { PrismaService } from '../../prisma/prisma.service';

export type OrderListFilters = {
  status?: CodOrderStatus | 'RISKY';
  search?: string;
  limit?: number;
};

@Injectable()
export class CodDashboardRepository {
  constructor(private readonly prisma: PrismaService) {}

  countOrders(shopId: number, where: Prisma.CodOrderWhereInput = {}) {
    return this.prisma.codOrder.count({
      where: {
        shopId,
        isCod: true,
        ...where,
      },
    });
  }

  countAllCodOrders(shopId: number) {
    return this.countOrders(shopId);
  }

  countByStatus(shopId: number, status: CodOrderStatus) {
    return this.countOrders(shopId, { status });
  }

  countRisky(shopId: number) {
    return this.countOrders(shopId, {
      riskScore: { gte: COD_RISK_REVIEW_THRESHOLD },
    });
  }

  countRiskOrdersPrevented(shopId: number) {
    return this.countOrders(shopId, {
      riskScore: { gte: COD_RISK_REVIEW_THRESHOLD },
      status: {
        in: [
          CodOrderStatus.NEEDS_REVIEW,
          CodOrderStatus.CANCELLED_BY_CUSTOMER,
          CodOrderStatus.EXPIRED,
        ],
      },
    });
  }

  listOrders(shopId: number, filters: OrderListFilters) {
    const where: Prisma.CodOrderWhereInput = {
      shopId,
      isCod: true,
    };

    if (filters.status === 'RISKY') {
      where.riskScore = { gte: COD_RISK_REVIEW_THRESHOLD };
    } else if (filters.status) {
      where.status = filters.status;
    }

    if (filters.search) {
      where.OR = [
        { orderName: { contains: filters.search } },
        { customerName: { contains: filters.search } },
        { customerEmail: { contains: filters.search } },
        { customerPhone: { contains: filters.search } },
        { normalizedPhone: { contains: filters.search } },
      ];
    }

    return this.prisma.codOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: filters.limit || 50,
      select: {
        id: true,
        orderName: true,
        customerName: true,
        customerEmail: true,
        customerPhone: true,
        totalAmount: true,
        currency: true,
        status: true,
        riskScore: true,
        riskReasonJson: true,
        reminderCount: true,
        expiresAt: true,
        createdAt: true,
      },
    });
  }

  findOrderDetail(shopId: number, id: number) {
    return this.prisma.codOrder.findFirst({
      where: { shopId, id },
      include: {
        sessions: {
          orderBy: { createdAt: 'desc' },
          include: {
            deliveries: {
              orderBy: { createdAt: 'desc' },
            },
          },
        },
        events: {
          orderBy: { createdAt: 'desc' },
        },
        jobs: {
          orderBy: { runAt: 'desc' },
        },
      },
    });
  }
}
