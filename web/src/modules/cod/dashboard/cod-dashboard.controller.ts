import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CodOrderStatus } from '@prisma/client';
import {
  AuthenticatedRequest,
  ShopifyGuard,
} from '../../shopify/shopify.guard';
import { CodDashboardService } from './cod-dashboard.service';

@Controller('api/cod')
@UseGuards(ShopifyGuard)
export class CodDashboardController {
  constructor(private readonly dashboard: CodDashboardService) {}

  @Get('dashboard/overview')
  overview(@Req() request: AuthenticatedRequest) {
    return this.dashboard.getOverview(request.shop.id);
  }

  @Get('orders')
  orders(
    @Req() request: AuthenticatedRequest,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
  ) {
    return this.dashboard.listOrders(request.shop.id, {
      status: this.parseStatus(status),
      search,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('orders/:id')
  order(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.dashboard.getOrderDetail(request.shop.id, id);
  }

  private parseStatus(status?: string) {
    if (!status) {
      return undefined;
    }

    if (status === 'RISKY') {
      return status;
    }

    if (Object.values(CodOrderStatus).includes(status as CodOrderStatus)) {
      return status as CodOrderStatus;
    }

    return undefined;
  }
}
