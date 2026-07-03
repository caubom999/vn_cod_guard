import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  AuthenticatedRequest,
  ShopifyGuard,
} from '../../shopify/shopify.guard';
import {
  CodPaymentRuleService,
  UpdateCodPaymentRuleDto,
} from './cod-payment-rule.service';

@Controller('api/cod/payment-rule')
@UseGuards(ShopifyGuard)
export class CodPaymentRuleController {
  constructor(private readonly paymentRule: CodPaymentRuleService) {}

  @Get()
  get(@Req() request: AuthenticatedRequest) {
    return this.paymentRule.get(request.shop.id);
  }

  @Get('methods')
  getPaymentMethods(@Req() request: AuthenticatedRequest) {
    return this.paymentRule.getPaymentMethods(request.shop);
  }

  @Post('products')
  getProducts(
    @Req() request: AuthenticatedRequest,
    @Body() body: { ids?: string[] },
  ) {
    return this.paymentRule.getProducts(request.shop, body.ids);
  }

  @Post('collections')
  getCollections(
    @Req() request: AuthenticatedRequest,
    @Body() body: { ids?: string[] },
  ) {
    return this.paymentRule.getCollections(request.shop, body.ids);
  }

  @Put()
  update(
    @Req() request: AuthenticatedRequest,
    @Body() body: UpdateCodPaymentRuleDto,
  ) {
    return this.paymentRule.update(request.shop, body);
  }
}
