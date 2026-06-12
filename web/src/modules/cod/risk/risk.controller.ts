import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  AuthenticatedRequest,
  ShopifyGuard,
} from '../../shopify/shopify.guard';
import { RiskService } from './risk.service';

@Controller('api/cod/risk')
@UseGuards(ShopifyGuard)
export class RiskController {
  constructor(private readonly risks: RiskService) {}

  @Get('rules')
  listRules(@Req() request: AuthenticatedRequest) {
    return this.risks.listRules(request.shop.id);
  }

  @Post('rules')
  createRule(
    @Req() request: AuthenticatedRequest,
    @Body() body: Record<string, unknown>,
  ) {
    return this.risks.createRule(request.shop.id, body);
  }

  @Put('rules/:id')
  updateRule(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: Record<string, unknown>,
  ) {
    return this.risks.updateRule(id, request.shop.id, body);
  }

  @Delete('rules/:id')
  deleteRule(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.risks.deleteRule(id, request.shop.id);
  }

  @Get('blacklist')
  listBlacklist(@Req() request: AuthenticatedRequest) {
    return this.risks.listBlacklist(request.shop.id);
  }

  @Post('blacklist')
  createBlacklistEntry(
    @Req() request: AuthenticatedRequest,
    @Body() body: Record<string, unknown>,
  ) {
    return this.risks.createBlacklistEntry(request.shop.id, body);
  }

  @Delete('blacklist/:id')
  deleteBlacklistEntry(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.risks.deleteBlacklistEntry(id, request.shop.id);
  }
}
