import {
  VerificationTemplateInput,
  VerificationTemplateLineItem,
} from './types/template.types';

export function renderTemplate2(input: VerificationTemplateInput) {
  const mode = input.mode || 'decision';
  const statusTitle =
    input.statusTitle ||
    (mode === 'verification'
      ? 'Xác nhận đơn hàng COD'
      : 'Đơn hàng đã được xác nhận');
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
    body { margin: 0; padding: 0; background: #f2f2f2; color: #000000; font-family: Arial, sans-serif; }
    .wrap { max-width: 600px; margin: 0 auto; background: #f2f2f2; }
    .hero { position: relative; overflow: hidden; background: #31558f; color: #ffffff; padding: 28px 42px 88px; }
    .logo { color: #25e0b2; font-size: 12px; font-weight: 800; line-height: 1; }
    .headline { margin-top: 48px; text-align: center; font-size: 28px; font-weight: 800; line-height: 1.2; }
    .shape-one { position: absolute; right: 96px; top: 30px; width: 0; height: 0; border-top: 18px solid transparent; border-bottom: 18px solid transparent; border-left: 30px solid #26c7b4; transform: rotate(95deg); }
    .shape-two { position: absolute; right: 58px; top: 84px; width: 0; height: 0; border-top: 14px solid transparent; border-bottom: 14px solid transparent; border-left: 28px solid #b9d99b; transform: rotate(10deg); }
    .shape-three { position: absolute; right: 78px; bottom: 36px; width: 0; height: 0; border-left: 16px solid transparent; border-right: 16px solid transparent; border-top: 28px solid #f63768; transform: rotate(-45deg); }
    .card { width: 76%; margin: -24px auto 0; background: #ffffff; padding: 32px 28px 36px; box-shadow: 0 20px 24px rgba(0,0,0,0.16); }
    .message { margin-bottom: 28px; font-size: 15px; line-height: 1.6; }
    .message p { margin: 0 0 12px; }
    .deadline { margin: 16px 0 0; font-weight: 800; }
    h2 { margin: 0; text-align: center; font-size: 18px; line-height: 1.3; }
    .facts { display: table; width: 100%; margin-top: 24px; text-align: center; }
    .fact { display: table-cell; width: 33.333%; padding: 0 8px; vertical-align: top; }
    .shape-blue { width: 64px; height: 44px; margin: 0 auto 16px; border-radius: 28px 0 28px 0; background: #7790bd; }
    .shape-teal { width: 64px; height: 44px; margin: 0 auto 16px; background: #61c8c4; transform: skew(-18deg) rotate(-12deg); }
    .shape-pink { width: 0; height: 0; margin: 0 auto 16px; border-left: 24px solid transparent; border-right: 24px solid transparent; border-bottom: 42px solid #ec5d8d; }
    .fact-label { font-size: 12px; line-height: 1.25; }
    .fact-value { margin-top: 4px; font-size: 14px; font-weight: 800; }
    .items { margin-top: 36px; text-align: center; }
    .items p { margin: 16px 0 0; font-size: 13px; line-height: 1.6; }
    .actions { margin-top: 32px; text-align: center; }
    .button { display: inline-block; color: #ffffff !important; text-decoration: none !important; font-size: 15px; font-weight: 800; border-radius: 4px; padding: 12px 20px; margin: 0 6px 12px; }
    .confirm { background: #008060; }
    .cancel { background: #d82c0d; }
    .hint { margin-top: 24px; text-align: center; font-size: 12px; line-height: 1.6; }
    .footer { padding: 56px 40px 32px; text-align: center; font-size: 11px; line-height: 1.6; color: #333333; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="hero">
      <div class="logo">BRAND<br />LOGO</div>
      <div class="headline">${escapeHtml(statusTitle)}</div>
      <div class="shape-one"></div>
      <div class="shape-two"></div>
      <div class="shape-three"></div>
    </div>
    <div class="card">
      <div class="message">
        ${input.messageHtml || `<p>Xin chào ${escapeHtml(input.customerName)},</p>`}
        ${input.expiresAt ? `<p class="deadline">Hạn xác nhận: ${escapeHtml(input.expiresAt)}</p>` : ''}
      </div>
      <h2>Thông tin đơn hàng</h2>
      <div class="facts">
        <div class="fact">
          <div class="shape-blue"></div>
          <div class="fact-label">Mã đơn</div>
          <div class="fact-value">${escapeHtml(input.orderName)}</div>
        </div>
        <div class="fact">
          <div class="shape-teal"></div>
          <div class="fact-label">Tổng tiền</div>
          <div class="fact-value">${escapeHtml(input.totalAmount)}</div>
        </div>
        <div class="fact">
          <div class="shape-pink"></div>
          <div class="fact-label">Trạng thái</div>
          <div class="fact-value">${escapeHtml(paymentStatus)}</div>
        </div>
      </div>
      <div class="items">
        <h2>Sản phẩm trong đơn</h2>
        <p>${renderItems(input.items)}</p>
      </div>
      ${
        mode === 'verification'
          ? `<div class="actions">
        ${input.confirmUrl ? `<a class="button confirm" href="${escapeHtml(input.confirmUrl)}"><span style="color:#ffffff !important;">Xác nhận đơn</span></a>` : ''}
        ${input.cancelUrl ? `<a class="button cancel" href="${escapeHtml(input.cancelUrl)}"><span style="color:#ffffff !important;">Hủy đơn</span></a>` : ''}
      </div>`
          : ''
      }
      <div class="hint">${escapeHtml(footerMessage)}</div>
    </div>
    <div class="footer">
      <div>${escapeHtml(input.shopName)} · ${escapeHtml(input.shippingAddress)}</div>
      <div style="margin-top:8px;">Email này được gửi tự động từ hệ thống xác nhận COD.</div>
    </div>
  </div>
</body>
</html>`;
}

function renderItems(items: VerificationTemplateLineItem[]) {
  if (!items.length) {
    return 'Sản phẩm x1';
  }

  return items
    .map((item) =>
      [item.title, item.variantTitle, `Số lượng: ${item.quantity}`]
        .filter(Boolean)
        .map((value) => escapeHtml(String(value)))
        .join(' · '),
    )
    .join('<br />');
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
