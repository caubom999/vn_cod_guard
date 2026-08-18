import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MessageDeliveryStatus, Prisma } from '@prisma/client';
import { createHmac, timingSafeEqual } from 'crypto';
import { MessagingRepository } from './messaging.repository';

export type EsmsCallbackQuery = Record<string, unknown>;

@Injectable()
export class EsmsCallbackService {
  constructor(
    private readonly config: ConfigService,
    private readonly messages: MessagingRepository,
  ) {}

  buildCallbackUrl(deliveryId: number) {
    const host = this.getHost();
    const url = new URL(
      '/api/cod/integrations/sms/esms/callback',
      host.endsWith('/') ? host : host + '/',
    );

    if (url.protocol !== 'https:') {
      throw new Error('Live eSMS delivery callbacks require an HTTPS HOST');
    }

    url.searchParams.set('deliveryId', String(deliveryId));
    url.searchParams.set('signature', this.sign(deliveryId));
    return url.toString();
  }

  async handle(query: EsmsCallbackQuery) {
    const deliveryId = this.readPositiveInteger(query.deliveryId);
    const signature = this.readString(query.signature);

    if (!deliveryId || !signature) {
      throw new BadRequestException('Invalid eSMS callback signature');
    }

    this.assertSignature(deliveryId, signature);

    const smsId = this.readString(query.SMSID);
    if (!smsId) {
      throw new BadRequestException('Missing eSMS SMSID');
    }

    const delivery =
      await this.messages.findDeliveryForProviderCallback(deliveryId);

    if (!delivery || delivery.provider !== 'ESMS') {
      throw new NotFoundException('eSMS delivery not found');
    }

    if (delivery.providerMessageId && delivery.providerMessageId !== smsId) {
      throw new BadRequestException('eSMS SMSID does not match delivery');
    }

    const providerStatus = this.readString(query.SendStatus);
    const sendSuccess = this.readNonNegativeInteger(query.SendSuccess) ?? 0;
    const sendFailed = this.readNonNegativeInteger(query.SendFailed) ?? 0;
    const status = this.mapDeliveryStatus(
      providerStatus,
      sendSuccess,
      sendFailed,
    );

    if (delivery.status === MessageDeliveryStatus.DELIVERED) {
      return { ok: true, status: delivery.status };
    }

    if (delivery.status === status && delivery.providerMessageId === smsId) {
      return { ok: true, status };
    }

    const now = new Date();
    const error =
      status === MessageDeliveryStatus.FAILED
        ? `eSMS delivery failed (SendStatus ${providerStatus || 'unknown'})`
        : null;

    await this.messages.updateDeliveryProviderStatus(delivery.id, {
      status,
      providerMessageId: smsId,
      error,
      sentAt: delivery.sentAt || now,
      deliveredAt:
        status === MessageDeliveryStatus.DELIVERED
          ? delivery.deliveredAt || now
          : delivery.deliveredAt,
    });

    await this.messages.createEvent({
      codOrderId: delivery.session.codOrderId,
      verificationSessionId: delivery.session.id,
      type:
        status === MessageDeliveryStatus.DELIVERED
          ? 'SMS_DELIVERY_CONFIRMED'
          : status === MessageDeliveryStatus.FAILED
            ? 'SMS_DELIVERY_FAILED'
            : 'SMS_DELIVERY_STATUS_UPDATED',
      message:
        status === MessageDeliveryStatus.DELIVERED
          ? 'eSMS confirmed delivery to the customer network.'
          : error || 'eSMS updated the message delivery status.',
      metadataJson: {
        deliveryId: delivery.id,
        providerMessageId: smsId,
        sendStatus: providerStatus,
        sendSuccess,
        sendFailed,
        telcoId: this.readString(query.telcoid),
      } as Prisma.InputJsonValue,
    });

    return { ok: true, status };
  }

  private mapDeliveryStatus(
    sendStatus: string | undefined,
    sendSuccess: number,
    sendFailed: number,
  ) {
    if (sendSuccess > 0) {
      return MessageDeliveryStatus.DELIVERED;
    }

    if (sendStatus === '4' || (sendStatus === '5' && sendFailed > 0)) {
      return MessageDeliveryStatus.FAILED;
    }

    if (sendStatus === '5') {
      return MessageDeliveryStatus.FAILED;
    }

    return MessageDeliveryStatus.SENT;
  }

  private assertSignature(deliveryId: number, signature: string) {
    const expected = this.sign(deliveryId);
    const actualBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);

    if (
      actualBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(actualBuffer, expectedBuffer)
    ) {
      throw new UnauthorizedException('Invalid eSMS callback signature');
    }
  }

  private sign(deliveryId: number) {
    return createHmac('sha256', this.getSigningSecret())
      .update(`esms-delivery:${deliveryId}`)
      .digest('hex');
  }

  private getHost() {
    const host =
      this.config.get<string>('app.host') ||
      this.config.get<string>('HOST') ||
      '';

    if (!host) {
      throw new Error('HOST is required for live eSMS delivery callbacks');
    }

    return host;
  }

  private getSigningSecret() {
    const secret =
      this.config.get<string>('INTEGRATION_ENCRYPTION_KEY') ||
      this.config.get<string>('JWT_SECRET_KEY');

    if (!secret || secret.length < 32) {
      throw new Error(
        'INTEGRATION_ENCRYPTION_KEY must contain at least 32 characters',
      );
    }

    return secret;
  }

  private readString(value: unknown) {
    if (Array.isArray(value)) {
      value = value[0];
    }

    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
  }

  private readPositiveInteger(value: unknown) {
    const parsed = Number(this.readString(value));
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
  }

  private readNonNegativeInteger(value: unknown) {
    const parsed = Number(this.readString(value));
    return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : undefined;
  }
}
