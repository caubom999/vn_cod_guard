import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  AuthenticatedRequest,
  ShopifyGuard,
} from '../../shopify/shopify.guard';
import {
  MessageTemplateService,
  UpdateMessageTemplateDto,
} from './message-template.service';

@Controller('api/cod/message-templates')
@UseGuards(ShopifyGuard)
export class MessageTemplateController {
  constructor(private readonly templates: MessageTemplateService) {}

  @Get()
  list(@Req() request: AuthenticatedRequest) {
    return this.templates.list(request.shop.id);
  }

  @Put(':id')
  update(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateMessageTemplateDto,
  ) {
    return this.templates.update(id, request.shop.id, body);
  }
}
