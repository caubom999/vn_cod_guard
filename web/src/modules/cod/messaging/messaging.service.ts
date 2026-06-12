import { Injectable, Logger } from '@nestjs/common';
import {
  MessageDeliveryStatus,
  Prisma,
  VerificationChannel,
} from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { MessagingRepository } from './messaging.repository';
import { MessageTemplateRenderer } from './message-template.renderer';
import { EmailProvider } from './providers/email.provider';

type SendVerificationMessageInput = {
  verificationSessionId: number;
  token: string;
};

@Injectable()
export class MessagingService {
  private readonly logger = new Logger(MessagingService.name);

  constructor(
    private readonly messages: MessagingRepository,
    private readonly renderer: MessageTemplateRenderer,
    private readonly emailProvider: EmailProvider,
    private readonly config: ConfigService,
  ) {}

  async sendVerificationMessage(input: SendVerificationMessageInput) {
    const session = await this.messages.findSessionForMessage(
      input.verificationSessionId,
    );

    if (!session) {
      throw new Error('Verification session not found for messaging');
    }

    if (session.channel !== VerificationChannel.EMAIL) {
      await this.messages.createEvent({
        codOrderId: session.codOrderId,
        verificationSessionId: session.id,
        type: 'MESSAGE_CHANNEL_NOT_IMPLEMENTED',
        message:
          session.channel + ' messaging provider is not implemented yet.',
        metadataJson: { channel: session.channel } as Prisma.InputJsonValue,
      });

      return null;
    }

    return this.sendVerificationEmail(session, input.token);
  }

  private async sendVerificationEmail(
    session: NonNullable<
      Awaited<ReturnType<MessagingRepository['findSessionForMessage']>>
    >,
    token: string,
  ) {
    const order = session.codOrder;
    const shop = order.shop;
    const template = await this.messages.getOrCreateVerificationEmailTemplate(
      shop.id,
    );
    const integration = await this.messages.getOrCreateEmailIntegration(
      shop.id,
    );
    const verificationUrl = this.buildVerificationUrl(token);
    const context = {
      shopName: shop.name || shop.domain,
      shopDomain: shop.domain,
      customerName: order.customerName || 'ban',
      orderName: order.orderName || order.orderNumber || '#' + order.id,
      amount: order.totalAmount?.toString() || '',
      currency: order.currency || '',
      expiresAt: session.expiresAt.toLocaleString('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
      }),
      verificationUrl,
    };
    const subject = this.renderer.render(template.subject || '', context);
    const body = this.renderer.render(template.body, context);
    const recipient = order.customerEmail || '';

    const delivery = await this.messages.createDelivery({
      verificationSessionId: session.id,
      channel: VerificationChannel.EMAIL,
      provider: String(integration.provider),
      recipient: recipient || 'missing-email',
      subject,
      body,
      status: MessageDeliveryStatus.QUEUED,
    });

    try {
      if (!template.enabled) {
        throw new Error('Verification email template is disabled');
      }

      if (!integration.enabled) {
        throw new Error('Email channel integration is disabled');
      }

      const result = await this.emailProvider.send({
        to: recipient,
        subject,
        body,
        fromName: integration.senderName,
      });

      const updatedDelivery = await this.messages.markDeliverySent(
        delivery.id,
        {
          providerMessageId: result.providerMessageId,
          delivered: result.delivered,
        },
      );

      await this.messages.markSessionSent(session.id);
      await this.messages.createEvent({
        codOrderId: order.id,
        verificationSessionId: session.id,
        type: 'VERIFICATION_MESSAGE_SENT',
        message: 'Verification email was sent via configured email provider.',
        metadataJson: {
          deliveryId: updatedDelivery.id,
          recipient: updatedDelivery.recipient,
          provider: updatedDelivery.provider,
          verificationUrl,
        } as Prisma.InputJsonValue,
      });

      return updatedDelivery;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      this.logger.warn('Verification email delivery failed: ' + message);

      const failedDelivery = await this.messages.markDeliveryFailed(
        delivery.id,
        message,
      );

      await this.messages.createEvent({
        codOrderId: order.id,
        verificationSessionId: session.id,
        type: 'VERIFICATION_MESSAGE_FAILED',
        message,
        metadataJson: {
          deliveryId: failedDelivery.id,
          recipient: failedDelivery.recipient,
          provider: failedDelivery.provider,
        } as Prisma.InputJsonValue,
      });

      return failedDelivery;
    }
  }

  private buildVerificationUrl(token: string) {
    const host = this.config.get<string>('app.host') || process.env.HOST || '';
    const normalizedHost = host.replace(/\/$/, '');

    if (!normalizedHost) {
      return '/api/verify/' + token;
    }

    return normalizedHost + '/api/verify/' + token;
  }
}
