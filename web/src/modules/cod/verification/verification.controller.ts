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
import { VerificationService, VerificationView } from './verification.service';

@Controller()
export class VerificationController {
  constructor(private readonly verifications: VerificationService) {}

  @Get(['verify/:token', 'api/verify/:token'])
  async show(
    @Param('token') token: string,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    const view = await this.verifications.getViewByToken(token);

    return response
      .type('html')
      .send(this.renderPage(token, view, this.getBasePath(request)));
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
      .send(this.renderPage(token, view, this.getBasePath(request)));
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
      .send(this.renderPage(token, view, this.getBasePath(request)));
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

  private renderPage(token: string, view: VerificationView, basePath: string) {
    const order = view.order;
    const shopName = view.shop.name || view.shop.domain;
    const amount = order.totalAmount
      ? `${order.totalAmount.toString()} ${order.currency || ''}`.trim()
      : 'N/A';
    const items = this.getLineItemSummary(order.lineItemsJson);
    const canAct =
      order.status === 'PENDING' || order.status === 'NEEDS_REVIEW';

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
    .actions { display: flex; gap: 12px; margin-top: 24px; }
    button { border: 0; border-radius: 6px; padding: 12px 16px; font-weight: 700; cursor: pointer; }
    .confirm { background: #008060; color: white; }
    .cancel { background: #d82c0d; color: white; }
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
    ${view.isExpired ? '<p class="muted">Link xác nhận đã hết hạn.</p>' : ''}
    ${
      canAct && !view.isExpired
        ? `<div class="actions">
      <form method="post" action="${this.escape(basePath)}/${this.escape(token)}/confirm"><button class="confirm" type="submit">Xác nhận</button></form>
      <form method="post" action="${this.escape(basePath)}/${this.escape(token)}/cancel"><button class="cancel" type="submit">Hủy đơn</button></form>
    </div>`
        : '<p class="muted">Đơn này đã được xử lý.</p>'
    }
  </main>
</body>
</html>`;
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

  private escape(value: string) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
