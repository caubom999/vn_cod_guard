import {
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  APP_UNINSTALLED_WEBHOOK_PATH,
  CUSTOMERS_DATA_REQUEST_WEBHOOK_PATH,
  CUSTOMERS_REDACT_WEBHOOK_PATH,
  ORDERS_CREATE_WEBHOOK_PATH,
  SHOP_REDACT_WEBHOOK_PATH,
} from './webhooks.constants';
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

  @Post('privacy')
  @UseGuards(ShopifyWebhookGuard)
  @HttpCode(HttpStatus.OK)
  privacy(@Req() request: ShopifyWebhookRequest) {
    return this.webhooks.receivePrivacyWebhook(request);
  }

  @Post(CUSTOMERS_DATA_REQUEST_WEBHOOK_PATH)
  @UseGuards(ShopifyWebhookGuard)
  @HttpCode(HttpStatus.OK)
  customersDataRequest(@Req() request: ShopifyWebhookRequest) {
    return this.webhooks.receiveCustomersDataRequest(request);
  }

  @Post(CUSTOMERS_REDACT_WEBHOOK_PATH)
  @UseGuards(ShopifyWebhookGuard)
  @HttpCode(HttpStatus.OK)
  customersRedact(@Req() request: ShopifyWebhookRequest) {
    return this.webhooks.receiveCustomersRedact(request);
  }

  @Post(SHOP_REDACT_WEBHOOK_PATH)
  @UseGuards(ShopifyWebhookGuard)
  @HttpCode(HttpStatus.OK)
  shopRedact(@Req() request: ShopifyWebhookRequest) {
    return this.webhooks.receiveShopRedact(request);
  }

  @Post(APP_UNINSTALLED_WEBHOOK_PATH)
  @UseGuards(ShopifyWebhookGuard)
  @HttpCode(HttpStatus.OK)
  appUninstalled(@Req() request: ShopifyWebhookRequest) {
    return this.webhooks.receiveAppUninstalled(request);
  }
}
