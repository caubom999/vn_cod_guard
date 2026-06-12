import { Injectable, NotFoundException } from '@nestjs/common';
import { CodOrderStatus } from '@prisma/client';
import {
  CodDashboardRepository,
  OrderListFilters,
} from './cod-dashboard.repository';

@Injectable()
export class CodDashboardService {
  constructor(private readonly dashboard: CodDashboardRepository) {}

  async getOverview(shopId: number) {
    const [
      totalCodOrders,
      pending,
      confirmed,
      cancelled,
      expired,
      risky,
      riskOrdersPrevented,
    ] = await Promise.all([
      this.dashboard.countAllCodOrders(shopId),
      this.dashboard.countByStatus(shopId, CodOrderStatus.PENDING),
      this.dashboard.countByStatus(shopId, CodOrderStatus.CONFIRMED),
      this.dashboard.countByStatus(
        shopId,
        CodOrderStatus.CANCELLED_BY_CUSTOMER,
      ),
      this.dashboard.countByStatus(shopId, CodOrderStatus.EXPIRED),
      this.dashboard.countRisky(shopId),
      this.dashboard.countRiskOrdersPrevented(shopId),
    ]);
    const actionable = pending + confirmed + cancelled + expired + risky;
    const averageShippingCost = Number(
      process.env.COD_AVERAGE_SHIPPING_COST || 30000,
    );

    return {
      counts: {
        totalCodOrders,
        pending,
        confirmed,
        cancelled,
        expired,
        risky,
      },
      metrics: {
        confirmationRate: this.percent(confirmed, totalCodOrders),
        noResponseRate: this.percent(expired, totalCodOrders),
        cancelledByCustomer: cancelled,
        estimatedShippingCostSaved: (cancelled + expired) * averageShippingCost,
        riskOrdersPrevented,
        actionableOrders: actionable,
      },
    };
  }

  listOrders(shopId: number, filters: OrderListFilters) {
    return this.dashboard.listOrders(shopId, filters);
  }

  async getOrderDetail(shopId: number, id: number) {
    const order = await this.dashboard.findOrderDetail(shopId, id);

    if (!order) {
      throw new NotFoundException('COD order not found');
    }

    return order;
  }

  private percent(value: number, total: number) {
    if (!total) {
      return 0;
    }

    return Math.round((value / total) * 1000) / 10;
  }
}
