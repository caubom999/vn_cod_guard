import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { MessagingRepository } from '../messaging/messaging.repository';
import { renderTemplate1 } from './templates/template-1';
import { renderTemplate2 } from './templates/template-2';
import { VerificationService, VerificationView } from './verification.service';

@Controller()
export class VerificationController {
  constructor(
    private readonly verifications: VerificationService,
    private readonly messages: MessagingRepository,
  ) {}

  @Get(['verify/:token', 'api/verify/:token'])
  async show(
    @Param('token') token: string,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    const view = await this.verifications.getViewByToken(token);

    return response
      .type('html')
      .send(await this.renderPage(token, view, this.getBasePath(request)));
  }

  @Post(['verify/:token/confirm', 'api/verify/:token/confirm'])
  @HttpCode(HttpStatus.OK)
  async confirm(
    @Param('token') token: string,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    const view = await this.verifications.confirm(
      token,
      this.getMetadata(request),
    );

    return response
      .type('html')
      .send(await this.renderPage(token, view, this.getBasePath(request)));
  }

  @Get(['verify/:token/confirm', 'api/verify/:token/confirm'])
  async confirmFromEmail(
    @Param('token') token: string,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    const view = await this.verifications.confirm(
      token,
      this.getMetadata(request),
    );

    return response
      .type('html')
      .send(await this.renderPage(token, view, this.getBasePath(request)));
  }

  @Post(['verify/:token/cancel', 'api/verify/:token/cancel'])
  @HttpCode(HttpStatus.OK)
  async cancel(
    @Param('token') token: string,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    const view = await this.verifications.cancel(
      token,
      this.getMetadata(request),
    );

    return response
      .type('html')
      .send(await this.renderPage(token, view, this.getBasePath(request)));
  }

  @Get(['verify/:token/cancel', 'api/verify/:token/cancel'])
  async cancelFromEmail(
    @Param('token') token: string,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    const view = await this.verifications.cancel(
      token,
      this.getMetadata(request),
    );

    return response
      .type('html')
      .send(await this.renderPage(token, view, this.getBasePath(request)));
  }

  private getBasePath(request: Request) {
    return request.path.startsWith('/api/verify') ? '/api/verify' : '/verify';
  }

  private getMetadata(request: Request) {
    return {
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    };
  }

  private async renderPage(
    token: string,
    view: VerificationView,
    basePath: string,
  ) {
    const order = view.order;

    if (
      order.status === 'CONFIRMED' ||
      order.status === 'CANCELLED_BY_CUSTOMER'
    ) {
      const template = await this.messages.getOrCreateVerificationEmailTemplate(
        view.shop.id,
      );

      return this.renderDecisionTemplate(view, template.templateKey);
    }

    const shopName = view.shop.name || view.shop.domain;
    const amount = order.totalAmount
      ? `${order.totalAmount.toString()} ${order.currency || ''}`.trim()
      : 'N/A';
    const items = this.getLineItemSummary(order.lineItemsJson);
    const statusMessage = this.getStatusMessage(view);

    return `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Xác nhận đơn COD ${this.escape(order.orderName || '')}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 0; background: #f6f6f7; color: #202223; }
    main { max-width: 560px; margin: 40px auto; background: white; border: 1px solid #dde0e4; border-radius: 8px; padding: 24px; }
    h1 { margin: 0 0 8px; font-size: 24px; }
    dl { display: grid; grid-template-columns: 130px 1fr; gap: 10px 16px; margin: 24px 0; }
    dt { color: #6d7175; }
    dd { margin: 0; font-weight: 600; }
    ul { padding-left: 20px; }
    .result { margin: 20px 0; border: 1px solid #dde0e4; border-radius: 8px; background: #fafafa; padding: 16px; font-weight: 600; }
    .muted { color: #6d7175; }
  </style>
</head>
<body>
  <main>
    <p class="muted">${this.escape(shopName)}</p>
    <h1>Xác nhận đơn hàng COD</h1>
    <dl>
      <dt>Mã đơn</dt><dd>${this.escape(order.orderName || order.orderNumber || 'N/A')}</dd>
      <dt>Số tiền</dt><dd>${this.escape(amount)}</dd>
      <dt>Người nhận</dt><dd>${this.escape(order.customerName || 'N/A')}</dd>
      <dt>Số điện thoại</dt><dd>${this.escape(order.customerPhone || 'N/A')}</dd>
      <dt>Trạng thái</dt><dd>${this.escape(order.status)}</dd>
    </dl>
    ${items.length ? `<h2>Sản phẩm</h2><ul>${items.map((item) => `<li>${this.escape(item)}</li>`).join('')}</ul>` : ''}
    <p class="result">${this.escape(statusMessage)}</p>
    <p class="muted">Bạn có thể đóng trang này.</p>
  </main>
</body>
</html>`;
  }

  private renderDecisionTemplate(
    view: VerificationView,
    templateKey: string | null,
  ) {
    const order = view.order;
    const isCancelled = order.status === 'CANCELLED_BY_CUSTOMER';

    const input = {
      shopName: view.shop.name || view.shop.domain,
      orderName: order.orderName || order.orderNumber || '#' + order.id,
      statusTitle: isCancelled
        ? 'Đơn hàng đã được hủy'
        : 'Đơn hàng đã được xác nhận',
      statusIcon: isCancelled ? '×' : '✓',
      statusColor: isCancelled ? '#d82c0d' : '#18bf29',
      paymentStatus: isCancelled ? 'Đã hủy COD' : 'Đã xác nhận COD',
      footerMessage: isCancelled
        ? 'Email này được gửi tự động sau khi bạn hủy đơn hàng COD.'
        : 'Email này được gửi tự động sau khi bạn xác nhận đơn hàng COD.',
      placedAt: this.formatDateTime(order.createdAt),
      deliveryWindow: this.formatDeliveryWindow(order.createdAt),
      items: this.getDetailedLineItems(order.lineItemsJson),
      totalAmount: order.totalAmount
        ? this.formatMoney(
            order.totalAmount.toString(),
            order.currency || 'VND',
          )
        : 'N/A',
      currency: order.currency || 'VND',
      customerName: order.customerName || 'N/A',
      customerPhone: order.customerPhone || 'N/A',
      shippingAddress:
        this.formatShippingAddress(order.shippingAddressJson) || 'N/A',
      paymentMethod: order.paymentMethod || 'Thanh toán khi nhận hàng',
    };

    return templateKey === 'template-2'
      ? renderTemplate2(input)
      : renderTemplate1(input);
  }

  private getStatusMessage(view: VerificationView) {
    if (view.isExpired) {
      return 'Link xác nhận đã hết hạn.';
    }

    if (view.order.status === 'CONFIRMED') {
      return 'Đơn COD của bạn đã được xác nhận.';
    }

    if (view.order.status === 'CANCELLED_BY_CUSTOMER') {
      return 'Đơn COD của bạn đã được hủy theo lựa chọn của bạn.';
    }

    return 'Lựa chọn trong email sẽ được ghi nhận ngay khi bạn bấm nút xác nhận hoặc hủy.';
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
          typeof lineItem.title === 'string' ? lineItem.title : 'Sản phẩm';
        const quantity =
          typeof lineItem.quantity === 'number' ? lineItem.quantity : 1;

        return `${title} x${quantity}`;
      })
      .filter((item): item is string => Boolean(item));
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
            : 'Sản phẩm';
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

  private formatMoney(value: string, currency: string) {
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

  private escape(value: string) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
