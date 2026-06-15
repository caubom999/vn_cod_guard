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
      lineItems: this.getLineItemSummary(order.lineItemsJson),
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
    lineItems: string[];
  }) {
    const amount = [input.amount, input.currency]
      .filter((value) => value !== null && value !== undefined && value !== '')
      .join(' ');
    const message = this.removeVerificationUrlLine(
      input.body,
      input.verificationUrl,
    );
    const confirmUrl = this.buildDecisionUrl(input.verificationUrl, 'confirm');
    const cancelUrl = this.buildDecisionUrl(input.verificationUrl, 'cancel');

    return `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${this.escapeHtml(String(input.shopName || 'COD verification'))}</title>
</head>
<body style="margin:0;padding:0;background:#f6f6f7;color:#202223;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f6f7;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid #dfe3e8;border-radius:8px;overflow:hidden;">
          <tr>
            <td style="padding:20px 24px;border-bottom:1px solid #e3e3e3;">
              <p style="margin:0 0 6px;color:#6d7175;font-size:13px;">${this.escapeHtml(String(input.shopName || ''))}</p>
              <h1 style="margin:0;color:#202223;font-size:22px;line-height:1.3;">Xac nhan don hang COD</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 24px;">
              <div style="font-size:14px;line-height:1.6;color:#202223;">${this.renderEmailParagraphs(message)}</div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;border:1px solid #e3e3e3;border-radius:8px;background:#fafafa;">
                ${this.renderEmailRow('Ma don', String(input.orderName || 'N/A'))}
                ${this.renderEmailRow('Khach hang', String(input.customerName || 'N/A'))}
                ${this.renderEmailRow('Tong tien', amount || 'N/A')}
                ${this.renderEmailRow('Han xac nhan', String(input.expiresAt || 'N/A'))}
              </table>
              ${input.lineItems.length ? this.renderLineItems(input.lineItems) : ''}
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:24px;">
                <tr>
                  <td style="padding-right:12px;padding-bottom:12px;">
                    <a href="${this.escapeHtml(confirmUrl)}" style="display:inline-block;background:#008060;color:#ffffff;text-decoration:none;font-weight:700;border-radius:6px;padding:12px 18px;">Xac nhan don</a>
                  </td>
                  <td style="padding-bottom:12px;">
                    <a href="${this.escapeHtml(cancelUrl)}" style="display:inline-block;background:#d82c0d;color:#ffffff;text-decoration:none;font-weight:700;border-radius:6px;padding:12px 18px;">Huy don</a>
                  </td>
                </tr>
              </table>
              <p style="margin:8px 0 0;color:#6d7175;font-size:12px;line-height:1.5;">Lua chon cua ban se duoc ghi nhan ngay khi bam vao nut trong email.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
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

  private renderEmailRow(label: string, value: string) {
    return `<tr>
      <td style="padding:10px 12px;color:#6d7175;font-size:13px;border-bottom:1px solid #e3e3e3;">${this.escapeHtml(label)}</td>
      <td style="padding:10px 12px;color:#202223;font-size:13px;font-weight:700;text-align:right;border-bottom:1px solid #e3e3e3;">${this.escapeHtml(value)}</td>
    </tr>`;
  }

  private renderLineItems(items: string[]) {
    return `<div style="margin:20px 0;">
      <p style="margin:0 0 8px;font-weight:700;">San pham</p>
      <ul style="margin:0;padding-left:20px;color:#202223;">${items
        .map(
          (item) =>
            `<li style="margin-bottom:6px;">${this.escapeHtml(item)}</li>`,
        )
        .join('')}</ul>
    </div>`;
  }

  private getLineItemSummary(value: unknown) {
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
          typeof lineItem.title === 'string' ? lineItem.title : 'San pham';
        const quantity =
          typeof lineItem.quantity === 'number' ? lineItem.quantity : 1;

        return `${title} x${quantity}`;
      })
      .filter((item): item is string => Boolean(item));
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
