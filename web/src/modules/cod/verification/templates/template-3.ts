import {
  VerificationTemplateInput,
  VerificationTemplateLineItem,
} from './types/template.types';

export function renderTemplate3(input: VerificationTemplateInput) {
  const mode = input.mode || 'decision';
  const isVerification = mode === 'verification';
  const statusTitle =
    input.statusTitle ||
    (isVerification ? 'Xác nhận đơn COD' : 'Đơn hàng đã được xác nhận');
  const paymentStatus =
    input.paymentStatus ||
    (isVerification ? 'Đang chờ xác nhận' : 'Đã xác nhận COD');
  const footerMessage =
    input.footerMessage ||
    (isVerification
      ? 'Lựa chọn của bạn sẽ được ghi nhận ngay khi bấm vào nút trong email.'
      : 'Email này được gửi tự động sau khi bạn xác nhận đơn hàng COD.');

  return `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(statusTitle)}</title>
  <style>
    @media only screen and (max-width: 640px) {
      .page { padding: 16px !important; }
      .container { width: 100% !important; }
      .main-card { border-radius: 28px !important; }
      .hero { padding: 30px 22px !important; border-radius: 28px 28px 0 0 !important; }
      .content { padding: 24px 20px !important; }
      .title { font-size: 32px !important; line-height: 38px !important; letter-spacing: -1.2px !important; }
      .desc { font-size: 16px !important; line-height: 25px !important; }
      .ticket-row td { display: block !important; width: 100% !important; text-align: left !important; }
      .ticket-value { padding-top: 5px !important; }
      .button { display: block !important; width: 100% !important; box-sizing: border-box !important; text-align: center !important; }
      .button-cancel { margin-left: 0 !important; margin-top: 12px !important; }
    }
  </style>
</head>
<body style="margin:0; padding:0; background:#f5f5f7; font-family:-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color:#1d1d1f;">
  <span style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent;">
    ${escapeHtml(input.orderName)} cần được xác nhận trước ${escapeHtml(input.expiresAt || 'khi hết hạn')}.
  </span>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f5f7;">
    <tr>
      <td class="page" align="center" style="padding:46px 16px;">
        <table class="container" role="presentation" width="680" cellspacing="0" cellpadding="0" style="width:680px; max-width:680px;">
          <tr>
            <td style="padding:0 6px 18px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="font-size:17px; line-height:24px; font-weight:750; color:#1d1d1f;">${escapeHtml(input.shopName)}</td>
                  <td align="right">
                    <span style="display:inline-block; padding:7px 12px; border-radius:999px; background:#ffffff; border:1px solid #e5e5ea; color:#515154; font-size:12px; line-height:16px; font-weight:750;">COD Secure Check</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td class="main-card" style="background:#ffffff; border-radius:34px; overflow:hidden; box-shadow:0 28px 80px rgba(0,0,0,0.10); border:1px solid rgba(0,0,0,0.06);">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td class="hero" style="padding:42px 38px; background:#111827; background-image:linear-gradient(135deg,#111827 0%,#182033 48%,#0a84ff 160%); border-radius:34px 34px 0 0;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td>
                          <div style="width:62px; height:62px; border-radius:22px; background:rgba(255,255,255,0.12); border:1px solid rgba(255,255,255,0.18); text-align:center; line-height:62px; font-size:28px; color:#ffffff;">${escapeHtml(input.statusIcon || '✓')}</div>
                        </td>
                        <td align="right" valign="top">
                          <div style="display:inline-block; padding:8px 12px; border-radius:999px; background:rgba(255,255,255,0.12); border:1px solid rgba(255,255,255,0.18); color:#ffffff; font-size:12px; line-height:16px; font-weight:750;">${escapeHtml(paymentStatus)}</div>
                        </td>
                      </tr>
                    </table>
                    <div style="margin-top:30px; font-size:13px; line-height:18px; font-weight:800; color:rgba(255,255,255,0.68); letter-spacing:0.08em; text-transform:uppercase;">Thanh toán khi nhận hàng</div>
                    <h1 class="title" style="margin:10px 0 0; font-size:46px; line-height:52px; letter-spacing:-1.9px; font-weight:850; color:#ffffff;">${escapeHtml(statusTitle)}</h1>
                    <div class="desc" style="margin:16px 0 0; max-width:540px; font-size:18px; line-height:28px; color:rgba(255,255,255,0.78);">
                      ${
                        isVerification
                          ? input.messageHtml ||
                            `<p style="margin:0;">Xin chào <strong style="color:#ffffff;">${escapeHtml(input.customerName)}</strong>, đơn hàng của bạn tại <strong style="color:#ffffff;">${escapeHtml(input.shopName)}</strong> cần được xác nhận trước khi shop chuẩn bị giao hàng.</p>`
                          : `<p style="margin:0;">Cảm ơn <strong style="color:#ffffff;">${escapeHtml(input.customerName)}</strong>. Trạng thái đơn hàng đã được cập nhật thành công.</p>`
                      }
                    </div>
                  </td>
                </tr>
              </table>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td class="content" style="padding:34px 38px 38px;">
                    ${
                      input.expiresAt
                        ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:26px;">
                      <tr>
                        <td style="padding:18px 20px; border-radius:22px; background:#fff7e6; border:1px solid #ffd591;">
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                            <tr>
                              <td style="width:42px; font-size:25px; line-height:32px;" valign="top">⏱</td>
                              <td>
                                <div style="font-size:14px; line-height:20px; color:#7a4d00; font-weight:800;">Hạn xác nhận</div>
                                <div style="margin-top:2px; font-size:18px; line-height:26px; color:#1d1d1f; font-weight:850;">${escapeHtml(input.expiresAt)}</div>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>`
                        : ''
                    }
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e5e5ea; border-radius:26px; overflow:hidden; background:#ffffff;">
                      <tr>
                        <td style="padding:18px 22px; background:#fbfbfd; border-bottom:1px dashed #d2d2d7;">
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                            <tr>
                              <td>
                                <div style="font-size:13px; line-height:18px; color:#86868b; font-weight:750; letter-spacing:0.04em; text-transform:uppercase;">Mã xác nhận COD</div>
                                <div style="margin-top:5px; font-size:24px; line-height:30px; color:#1d1d1f; font-weight:900; letter-spacing:-0.5px;">${escapeHtml(input.orderName)}</div>
                              </td>
                              <td align="right">
                                <span style="display:inline-block; padding:8px 12px; border-radius:999px; background:#eafaf1; color:#12805c; font-size:13px; line-height:17px; font-weight:850;">${escapeHtml(isVerification ? 'Verify required' : 'Completed')}</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      ${renderTicketRow('Khách hàng', input.customerName)}
                      ${renderTicketRow('Tổng tiền COD', input.totalAmount, true)}
                      ${renderTicketRow('Cửa hàng', input.shopName, false, true)}
                    </table>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:26px;">
                      <tr>
                        <td style="font-size:17px; line-height:24px; color:#1d1d1f; font-weight:900; padding-bottom:12px;">Sản phẩm trong đơn</td>
                      </tr>
                      ${renderProducts(input.items, input.currency)}
                    </table>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:26px;">
                      <tr>
                        <td style="padding:18px 20px; border-radius:22px; background:#f8fbff; border:1px solid #d7eaff;">
                          <div style="font-size:15px; line-height:23px; color:#1d1d1f; font-weight:800;">Vì sao cần xác nhận?</div>
                          <div style="margin-top:5px; font-size:14px; line-height:22px; color:#515154;">Việc xác nhận giúp shop tránh đơn ảo, chuẩn bị hàng nhanh hơn và đảm bảo thông tin giao hàng là chính xác.</div>
                        </td>
                      </tr>
                    </table>
                    ${
                      isVerification
                        ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:32px;">
                      <tr>
                        <td>
                          ${input.confirmUrl ? `<a class="button" href="${escapeHtml(input.confirmUrl)}" style="display:inline-block; padding:17px 28px; border-radius:17px; background:#0071e3; color:#ffffff !important; text-decoration:none !important; font-size:16px; line-height:22px; font-weight:900; box-shadow:0 12px 28px rgba(0,113,227,0.28);"><span style="color:#ffffff !important;">Xác nhận đơn hàng</span></a>` : ''}
                          ${input.cancelUrl ? `<a class="button button-cancel" href="${escapeHtml(input.cancelUrl)}" style="display:inline-block; margin-left:12px; padding:16px 24px; border-radius:17px; background:#ffffff; color:#d70015 !important; text-decoration:none !important; font-size:16px; line-height:22px; font-weight:900; border:1px solid #ffd6d6;"><span style="color:#d70015 !important;">Hủy đơn</span></a>` : ''}
                        </td>
                      </tr>
                    </table>`
                        : ''
                    }
                    <div style="margin-top:26px; padding-top:22px; border-top:1px solid #e5e5ea; font-size:13px; line-height:20px; color:#86868b;">${escapeHtml(footerMessage)}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:24px 18px 0;">
              <p style="margin:0; font-size:12px; line-height:18px; color:#86868b;">Email này được gửi tự động từ ${escapeHtml(input.shopName)} để xác nhận đơn hàng thanh toán khi nhận hàng.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function renderTicketRow(
  label: string,
  value: string,
  large = false,
  isLast = false,
) {
  return `<tr class="ticket-row">
    <td style="padding:18px 22px;${isLast ? '' : ' border-bottom:1px solid #f0f0f2;'}">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
        <tr>
          <td style="font-size:15px; line-height:22px; color:#86868b; font-weight:700;">${escapeHtml(label)}</td>
          <td class="ticket-value" align="right" style="font-size:${large ? '24px' : '16px'}; line-height:${large ? '30px' : '24px'}; color:#1d1d1f; font-weight:${large ? '950' : '850'};${large ? ' letter-spacing:-0.7px;' : ''}">${escapeHtml(value)}</td>
        </tr>
      </table>
    </td>
  </tr>`;
}

function renderProducts(items: VerificationTemplateLineItem[], currency: string) {
  const safeItems = items.length
    ? items
    : [{ title: 'Sản phẩm', variantTitle: null, quantity: 1, price: null }];

  return safeItems
    .map((item) => {
      const price = item.price ? formatMoney(item.price, currency) : '';

      return `<tr>
        <td style="padding:18px 20px; border-radius:22px; background:#f5f5f7; border:1px solid #e5e5ea;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td>
                <div style="font-size:16px; line-height:24px; color:#1d1d1f; font-weight:850;">${escapeHtml(item.title)}</div>
                <div style="margin-top:3px; font-size:14px; line-height:21px; color:#86868b;">${item.variantTitle ? `${escapeHtml(item.variantTitle)} · ` : ''}Số lượng: ${escapeHtml(String(item.quantity))}</div>
              </td>
              <td align="right" style="font-size:16px; line-height:24px; color:#1d1d1f; font-weight:900;">${escapeHtml(price)}</td>
            </tr>
          </table>
        </td>
      </tr>`;
    })
    .join('<tr><td style="height:10px;"></td></tr>');
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
