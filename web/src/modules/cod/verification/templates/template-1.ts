import {
  VerificationTemplateInput,
  VerificationTemplateLineItem,
} from './types/template.types';

export function renderTemplate1(input: VerificationTemplateInput) {
  const mode = input.mode || 'decision';
  const statusTitle =
    input.statusTitle ||
    (mode === 'verification'
      ? 'Xác nhận đơn hàng COD'
      : 'Đơn hàng đã được xác nhận');
  const statusIcon = input.statusIcon || '✓';
  const statusColor = input.statusColor || '#18bf29';
  const paymentStatus =
    input.paymentStatus ||
    (mode === 'verification' ? 'Chờ xác nhận COD' : 'Đã xác nhận COD');
  const footerMessage =
    input.footerMessage ||
    (mode === 'verification'
      ? 'Lựa chọn của bạn sẽ được ghi nhận ngay khi bấm vào nút trong email.'
      : 'Email này được gửi tự động sau khi bạn xác nhận đơn hàng COD.');

  return `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(statusTitle)}</title>
  <style>
    body { margin: 0; padding: 0; background: #ffffff; color: #403f3f; font-family: Arial, sans-serif; }
    .wrap { max-width: 600px; margin: 0 auto; }
    .spacer { height: 20px; }
    .topline { background: #ff680c; height: 7px; }
    .header { background: #ffffff; display: table; width: 100%; }
    .header-cell { display: table-cell; width: 50%; vertical-align: middle; padding: 10px 25px; }
    .brand { color: #ff680c; font-size: 26px; font-weight: 800; letter-spacing: 1px; }
    .order-meta { text-align: right; }
    .label { color: #8c8989; font-size: 13px; margin-bottom: 8px; }
    .order-code { color: #000; font-size: 15px; font-weight: 800; }
    .intro { background: #f3f3f3; padding: 26px 25px 18px; color: #202223; font-size: 14px; line-height: 1.6; }
    .intro p { margin: 0 0 12px; }
    .deadline { margin: 10px 0 0; color: #000; font-size: 13px; font-weight: 800; }
    .hero { background: #f3f3f3; text-align: center; padding: 33px 25px 19px; }
    .check { width: 62px; height: 62px; margin: 0 auto 24px; border-radius: 50%; background: ${statusColor}; color: #fff; display: inline-flex; align-items: center; justify-content: center; font-size: 45px; line-height: 1; font-weight: 800; }
    h1 { margin: 0 0 20px; font-size: 25px; line-height: 1; color: #403f3f; }
    .hero p { margin: 8px 0; font-size: 13px; color: #000; }
    .section { background: #ffffff; padding: 20px 25px 0; }
    .section-title { margin: 0; color: #403f3f; font-size: 15px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; }
    .item { display: table; width: 100%; padding: 16px 0; border-bottom: 2px solid #e6e6e6; }
    .item-left, .item-right { display: table-cell; vertical-align: top; width: 50%; }
    .item-right { text-align: right; }
    .item-name { color: #666363; font-size: 14px; font-weight: 800; text-transform: uppercase; }
    .item-variant, .item-qty { color: #666363; font-size: 12px; margin-top: 8px; }
    .item-price { color: #666363; font-size: 14px; font-weight: 800; margin-top: 12px; }
    .total { background: #ffffff; text-align: right; padding: 16px 25px 20px; color: #000; font-size: 17px; font-weight: 800; }
    .actions { background: #ffffff; padding: 20px 25px 26px; }
    .button { display: inline-block; color: #ffffff !important; text-decoration: none !important; font-size: 17px; font-weight: 800; border-radius: 6px; padding: 14px 22px; margin: 0 12px 12px 0; }
    .confirm { background: #008060; }
    .cancel { background: #d82c0d; }
    .info { background: #f3f3f3; display: table; width: 100%; padding: 20px 0; }
    .info-col { display: table-cell; width: 50%; vertical-align: top; padding: 0 25px; box-sizing: border-box; }
    .info-title { margin: 0 0 18px; color: #000; font-size: 13px; font-weight: 800; text-transform: uppercase; }
    .info p { margin: 0 0 14px; color: #000; font-size: 13px; line-height: 1.35; }
    .paid { color: #27ae60; }
    .footer { background: #f9f9f9; border-top: 1px solid #e0e0e0; padding: 25px 30px; text-align: center; color: #777; font-size: 13px; line-height: 1.8; }
    .footer-brand { color: #ff6b35; font-size: 20px; font-weight: 800; letter-spacing: 1px; margin-bottom: 10px; }
    @media (max-width: 520px) {
      .header-cell, .item-left, .item-right, .info-col { display: block; width: auto; text-align: left; }
      .order-meta, .item-right { text-align: left; margin-top: 12px; }
    }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="spacer"></div>
    <div class="topline"></div>
    <div class="header">
      <div class="header-cell"><div class="brand">${escapeHtml(input.shopName)}</div></div>
      <div class="header-cell order-meta">
        <div class="label">Mã đơn hàng</div>
        <div class="order-code">${escapeHtml(input.orderName)}</div>
      </div>
    </div>
    ${
      mode === 'verification'
        ? `<div class="intro">
      <h1>${escapeHtml(statusTitle)}</h1>
      ${input.messageHtml || ''}
      ${input.expiresAt ? `<p class="deadline">Hạn xác nhận: ${escapeHtml(input.expiresAt)}</p>` : ''}
    </div>`
        : `<div class="hero">
      <div class="check">${escapeHtml(statusIcon)}</div>
      <h1>${escapeHtml(statusTitle)}</h1>
      <p>Ngày đặt: ${escapeHtml(input.placedAt)}</p>
      <p>Dự kiến giao: ${escapeHtml(input.deliveryWindow)}</p>
    </div>`
    }
    <div class="section">
      <h2 class="section-title">Thông tin đơn hàng</h2>
      ${
        input.items.length
          ? input.items.map((item) => renderLineItem(item, input.currency)).join('')
          : '<div class="item"><div class="item-left"><div class="item-name">Sản phẩm</div></div><div class="item-right"><div class="item-qty">Số lượng: 1</div></div></div>'
      }
    </div>
    <div class="total">Tổng cộng: ${escapeHtml(input.totalAmount)}</div>
    ${
      mode === 'verification'
        ? `<div class="actions">
      ${input.confirmUrl ? `<a class="button confirm" href="${escapeHtml(input.confirmUrl)}" style="color:#ffffff !important;text-decoration:none !important;"><span style="color:#ffffff !important;text-decoration:none !important;">Xác nhận đơn</span></a>` : ''}
      ${input.cancelUrl ? `<a class="button cancel" href="${escapeHtml(input.cancelUrl)}" style="color:#ffffff !important;text-decoration:none !important;"><span style="color:#ffffff !important;text-decoration:none !important;">Hủy đơn</span></a>` : ''}
    </div>`
        : ''
    }
    <div class="info">
      <div class="info-col">
        <h3 class="info-title">Giao hàng đến</h3>
        <p><strong>${escapeHtml(input.customerName)}</strong></p>
        <p>${escapeHtml(input.customerPhone)}</p>
        <p>${escapeHtml(input.shippingAddress)}</p>
      </div>
      <div class="info-col">
        <h3 class="info-title">Thanh toán</h3>
        <p><strong>Thanh toán khi nhận hàng</strong></p>
        <p>Phương thức: ${escapeHtml(input.paymentMethod)}</p>
        <p>Trạng thái: <span class="paid">${escapeHtml(paymentStatus)}</span></p>
      </div>
    </div>
    <div class="footer">
      <div class="footer-brand">${escapeHtml(input.shopName)}</div>
      ${escapeHtml(footerMessage)}
    </div>
  </div>
</body>
</html>`;
}

function renderLineItem(item: VerificationTemplateLineItem, currency: string) {
  const price = item.price ? formatMoney(item.price, currency) : '';

  return `<div class="item">
    <div class="item-left">
      <div class="item-name">${escapeHtml(item.title)}</div>
      ${item.variantTitle ? `<div class="item-variant">${escapeHtml(item.variantTitle)}</div>` : ''}
    </div>
    <div class="item-right">
      <div class="item-qty">Số lượng: ${escapeHtml(String(item.quantity))}</div>
      ${price ? `<div class="item-price">${escapeHtml(price)}</div>` : ''}
    </div>
  </div>`;
}

function formatMoney(value: string, currency: string) {
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

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
