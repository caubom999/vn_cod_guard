import { Body, Controller, Get, Put, Req, UseGuards } from '@nestjs/common';
import {
  AuthenticatedRequest,
  ShopifyGuard,
} from '../../shopify/shopify.guard';
import { CodFeeService, UpdateCodFeeDto } from './cod-fee.service';

@Controller('api/cod/fee-setting')
@UseGuards(ShopifyGuard)
export class CodFeeController {
  constructor(private readonly codFee: CodFeeService) {}

  @Get()
  get(@Req() request: AuthenticatedRequest) {
    return this.codFee.get(request.shop.id);
  }

  @Put()
  update(@Req() request: AuthenticatedRequest, @Body() body: UpdateCodFeeDto) {
    return this.codFee.update(request.shop.id, body);
  }
}
