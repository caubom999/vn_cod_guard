import {
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ORDERS_CREATE_WEBHOOK_PATH } from './webhooks.constants';
import { ShopifyWebhookGuard } from './guards/shopify-webhook.guard';
import { WebhooksService } from './webhooks.service';
import { ShopifyWebhookRequest } from './webhooks.types';

@Controller('api/webhooks')
export class WebhooksController {
  constructor(private readonly webhooks: WebhooksService) {}

  @Post(ORDERS_CREATE_WEBHOOK_PATH)
  @UseGuards(ShopifyWebhookGuard)
  @HttpCode(HttpStatus.OK)
  ordersCreate(@Req() request: ShopifyWebhookRequest) {
    return this.webhooks.receiveOrdersCreate(request);
  }
}
