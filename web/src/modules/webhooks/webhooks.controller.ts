import { Controller, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { ORDERS_CREATE_WEBHOOK_PATH } from './webhooks.constants';
import { ShopifyWebhookRequest, WebhooksService } from './webhooks.service';

@Controller('api/webhooks')
export class WebhooksController {
  constructor(private readonly webhooks: WebhooksService) {}

  @Post(ORDERS_CREATE_WEBHOOK_PATH)
  @HttpCode(HttpStatus.OK)
  ordersCreate(@Req() request: ShopifyWebhookRequest) {
    return this.webhooks.receiveOrdersCreate(request);
  }
}
