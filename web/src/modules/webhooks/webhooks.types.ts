import { Request } from 'express';

export type ShopifyWebhookRequest = Request & {
  rawBody?: Buffer;
};
