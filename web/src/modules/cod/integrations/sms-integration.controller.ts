import {
  Body,
  Controller,
  Delete,
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
  SmsIntegrationService,
  UpdateSmsIntegrationDto,
} from './sms-integration.service';

@Controller('api/cod/integrations/sms')
@UseGuards(ShopifyGuard)
export class SmsIntegrationController {
  constructor(private readonly integrations: SmsIntegrationService) {}

  @Get()
  get(@Req() request: AuthenticatedRequest) {
    return this.integrations.get(request.shop.id);
  }

  @Put()
  update(
    @Req() request: AuthenticatedRequest,
    @Body() body: UpdateSmsIntegrationDto,
  ) {
    return this.integrations.update(request.shop.id, body);
  }

  @Post('test')
  test(@Req() request: AuthenticatedRequest) {
    return this.integrations.test(request.shop.id);
  }

  @Delete()
  disconnect(@Req() request: AuthenticatedRequest) {
    return this.integrations.disconnect(request.shop.id);
  }
}
