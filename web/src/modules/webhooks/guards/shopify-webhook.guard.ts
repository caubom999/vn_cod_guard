import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import { ShopifyWebhookRequest } from '../webhooks.types';

@Injectable()
export class ShopifyWebhookGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<ShopifyWebhookRequest>();

    this.verifyHmac(request);

    return true;
  }

  private verifyHmac(request: ShopifyWebhookRequest) {
    const rawBody = request.rawBody;
    const receivedHmac = this.getHeader(request, 'x-shopify-hmac-sha256');

    if (!rawBody?.length) {
      throw new BadRequestException('Missing raw webhook body');
    }

    if (!receivedHmac) {
      throw new UnauthorizedException('Missing Shopify webhook HMAC');
    }

    const secret = this.config.getOrThrow<string>('shopify.apiSecret');
    const expectedHmac = createHmac('sha256', secret)
      .update(rawBody)
      .digest('base64');

    if (!this.safeEqual(receivedHmac, expectedHmac)) {
      throw new UnauthorizedException('Invalid Shopify webhook HMAC');
    }
  }

  private safeEqual(received: string, expected: string) {
    const receivedBuffer = Buffer.from(received, 'base64');
    const expectedBuffer = Buffer.from(expected, 'base64');

    return (
      receivedBuffer.length === expectedBuffer.length &&
      timingSafeEqual(receivedBuffer, expectedBuffer)
    );
  }

  private getHeader(request: ShopifyWebhookRequest, name: string) {
    const value = request.headers[name.toLowerCase()];

    if (Array.isArray(value)) {
      return value[0];
    }

    return value;
  }
}
