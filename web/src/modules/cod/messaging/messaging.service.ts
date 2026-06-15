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
import { renderConfirmedTemplate1 } from '../verification/verification-confirmed-template-1';

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
    const redactedVerificationUrl = this.redactVerificationUrl(verificationUrl);
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
    const html = this.buildVerificationEmailHtml({
      body,
      orderName: context.orderName,
      shopName: context.shopName,
      customerName: context.customerName,
      amount: context.amount,
      currency: context.currency,
      expiresAt: context.expiresAt,
      verificationUrl,
      placedAt: this.formatDateTime(order.createdAt),
      deliveryWindow: this.formatDeliveryWindow(order.createdAt),
      lineItems: this.getDetailedLineItems(order.lineItemsJson),
      shippingAddress: this.formatShippingAddress(order.shippingAddressJson),
      paymentMethod: order.paymentMethod || 'Thanh toán khi nhận hàng',
      customerPhone: order.customerPhone || 'N/A',
    });
    const recipient = order.customerEmail || '';

    const delivery = await this.messages.createDelivery({
      verificationSessionId: session.id,
      channel: VerificationChannel.EMAIL,
      provider: this.emailProvider.getProviderName(integration.configJson),
      recipient: recipient || 'missing-email',
      subject,
      body: this.redactRawToken(body, verificationUrl, redactedVerificationUrl),
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
        html,
        fromName: integration.senderName,
        integrationConfig: integration.configJson,
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
          verificationUrl: redactedVerificationUrl,
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

  private buildVerificationEmailHtml(input: {
    body: string;
    orderName: string | number | boolean | null | undefined;
    shopName: string | number | boolean | null | undefined;
    customerName: string | number | boolean | null | undefined;
    amount: string | number | boolean | null | undefined;
    currency: string | number | boolean | null | undefined;
    expiresAt: string | number | boolean | null | undefined;
    verificationUrl: string;
    placedAt: string;
    deliveryWindow: string;
    lineItems: Array<{
      title: string;
      variantTitle: string | null;
      quantity: number;
      price: string | null;
    }>;
    shippingAddress: string;
    paymentMethod: string;
    customerPhone: string;
  }) {
    const message = this.removeVerificationUrlLine(
      input.body,
      input.verificationUrl,
    );
    const confirmUrl = this.buildDecisionUrl(input.verificationUrl, 'confirm');
    const cancelUrl = this.buildDecisionUrl(input.verificationUrl, 'cancel');

    return renderConfirmedTemplate1({
      mode: 'verification',
      shopName: String(input.shopName || ''),
      orderName: String(input.orderName || 'N/A'),
      statusTitle: 'Xác nhận đơn hàng COD',
      messageHtml: this.renderEmailParagraphs(message),
      expiresAt: String(input.expiresAt || 'N/A'),
      confirmUrl,
      cancelUrl,
      placedAt: input.placedAt,
      deliveryWindow: input.deliveryWindow,
      items: input.lineItems,
      totalAmount: this.formatAmount(
        String(input.amount || ''),
        String(input.currency || 'VND'),
      ),
      currency: String(input.currency || 'VND'),
      customerName: String(input.customerName || 'N/A'),
      customerPhone: input.customerPhone,
      shippingAddress: input.shippingAddress || 'N/A',
      paymentMethod: input.paymentMethod,
    });
  }

  private removeVerificationUrlLine(body: string, verificationUrl: string) {
    return body
      .split('\n')
      .filter((line) => {
        const trimmed = line.trim();
        const normalized = trimmed.toLowerCase();

        return (
          trimmed !== verificationUrl &&
          !normalized.includes('{{verificationurl}}') &&
          !normalized.includes('link sau')
        );
      })
      .join('\n')
      .trim();
  }

  private buildDecisionUrl(
    verificationUrl: string,
    decision: 'confirm' | 'cancel',
  ) {
    return verificationUrl.replace(/\/$/, '') + '/' + decision;
  }

  private renderEmailParagraphs(value: string) {
    return value
      .split(/\n{2,}/)
      .map((paragraph) =>
        paragraph
          .split('\n')
          .map((line) => this.escapeHtml(line))
          .join('<br>'),
      )
      .filter(Boolean)
      .map((paragraph) => `<p style="margin:0 0 12px;">${paragraph}</p>`)
      .join('');
  }

  private getDetailedLineItems(value: unknown) {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((item) => {
        if (!item || typeof item !== 'object') {
          return null;
        }

        const lineItem = item as Record<string, unknown>;
        const title =
          typeof lineItem.title === 'string' && lineItem.title.trim()
            ? lineItem.title
            : 'San pham';
        const variantTitle =
          typeof lineItem.variantTitle === 'string' &&
          lineItem.variantTitle.trim()
            ? lineItem.variantTitle
            : null;
        const quantity =
          typeof lineItem.quantity === 'number' ? lineItem.quantity : 1;
        const price =
          typeof lineItem.price === 'string' && lineItem.price.trim()
            ? lineItem.price
            : null;

        return { title, variantTitle, quantity, price };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
  }

  private formatShippingAddress(value: unknown) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return '';
    }

    const address = value as Record<string, unknown>;
    const parts = [
      this.stringValue(address.address1),
      this.stringValue(address.address2),
      this.stringValue(address.ward),
      this.stringValue(address.district),
      this.stringValue(address.city),
      this.stringValue(address.province),
      this.stringValue(address.country),
    ];

    return parts.filter(Boolean).join(', ');
  }

  private stringValue(value: unknown) {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }

  private formatAmount(value: string, currency: string) {
    const amount = Number(value);

    if (Number.isNaN(amount)) {
      return `${value} ${currency}`.trim();
    }

    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency,
      maximumFractionDigits: currency === 'VND' ? 0 : 2,
    }).format(amount);
  }

  private formatDateTime(value: Date) {
    return new Intl.DateTimeFormat('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(value);
  }

  private formatDeliveryWindow(value: Date) {
    const start = new Date(value);
    const end = new Date(value);

    start.setDate(start.getDate() + 2);
    end.setDate(end.getDate() + 5);

    const startDay = new Intl.DateTimeFormat('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      day: '2-digit',
    }).format(start);
    const endDate = new Intl.DateTimeFormat('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(end);

    return `${startDay}-${endDate}`;
  }

  private redactVerificationUrl(verificationUrl: string) {
    return verificationUrl.replace(
      /\/api\/verify\/[^\s]+$/,
      '/api/verify/[redacted-token]',
    );
  }

  private redactRawToken(
    value: string,
    verificationUrl: string,
    redactedVerificationUrl: string,
  ) {
    return value.split(verificationUrl).join(redactedVerificationUrl);
  }

  private escapeHtml(value: string) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
