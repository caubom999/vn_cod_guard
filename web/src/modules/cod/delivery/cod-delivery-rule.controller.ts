import { Body, Controller, Get, Put, Req, UseGuards } from '@nestjs/common';
import {
  AuthenticatedRequest,
  ShopifyGuard,
} from '../../shopify/shopify.guard';
import {
  CodDeliveryRuleService,
  UpdateCodDeliveryRuleDto,
} from './cod-delivery-rule.service';

@Controller('api/cod/delivery-rule')
@UseGuards(ShopifyGuard)
export class CodDeliveryRuleController {
  constructor(private readonly deliveryRule: CodDeliveryRuleService) {}

  @Get()
  get(@Req() request: AuthenticatedRequest) {
    return this.deliveryRule.get(request.shop.id);
  }

  @Get('methods')
  getShippingMethods(@Req() request: AuthenticatedRequest) {
    return this.deliveryRule.getShippingMethods(request.shop);
  }

  @Put()
  update(
    @Req() request: AuthenticatedRequest,
    @Body() body: UpdateCodDeliveryRuleDto,
  ) {
    return this.deliveryRule.update(request.shop, body);
  }
}
