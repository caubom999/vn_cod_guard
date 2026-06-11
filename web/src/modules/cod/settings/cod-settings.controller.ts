import { Body, Controller, Get, Put, Req, UseGuards } from '@nestjs/common';
import {
  AuthenticatedRequest,
  ShopifyGuard,
} from '../../shopify/shopify.guard';
import {
  CodSettingsService,
  UpdateCodSettingsDto,
} from './cod-settings.service';

@Controller('api/cod/settings')
@UseGuards(ShopifyGuard)
export class CodSettingsController {
  constructor(private readonly settings: CodSettingsService) {}

  @Get()
  get(@Req() request: AuthenticatedRequest) {
    return this.settings.get(request.shop.id);
  }

  @Put()
  update(
    @Req() request: AuthenticatedRequest,
    @Body() body: UpdateCodSettingsDto,
  ) {
    return this.settings.update(request.shop.id, body);
  }
}
