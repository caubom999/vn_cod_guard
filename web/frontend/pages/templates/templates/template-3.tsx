import type { TemplatePreviewDraft } from './template-1';

const previewContext = {
  shopName: 'StoreVT23',
  customerName: 'Thanh Vân',
  orderName: '#1030',
  amount: '110000',
  currency: 'VND',
  expiresAt: '11:14:17 15/6/2026',
  verificationUrl: '#',
};

export function Template3Preview({ draft }: { draft: TemplatePreviewDraft }) {
  const body = renderTemplateText(draft.body, previewContext);

  return (
    <div className="overflow-x-auto rounded-lg border border-[#dfe3e8] bg-[#f5f5f7] p-4">
      <div className="mx-auto min-w-[560px] max-w-[680px] font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text','Segoe_UI',Roboto,Helvetica,Arial,sans-serif] text-[#1d1d1f]">
        <div className="mb-[18px] flex items-center justify-between px-1.5">
          <div className="text-[17px] font-bold leading-6">
            {previewContext.shopName}
          </div>
          <div className="rounded-full border border-[#e5e5ea] bg-white px-3 py-[7px] text-xs font-bold leading-4 text-[#515154]">
            COD Secure Check
          </div>
        </div>

        <div className="overflow-hidden rounded-[34px] border border-black/5 bg-white shadow-[0_28px_80px_rgba(0,0,0,0.10)]">
          <div className="rounded-t-[34px] bg-[#111827] bg-[linear-gradient(135deg,#111827_0%,#182033_48%,#0a84ff_160%)] px-[38px] py-[42px] text-white">
            <div className="flex items-start justify-between">
              <div className="h-[62px] w-[62px] rounded-[22px] border border-white/20 bg-white/10 text-center text-[28px] leading-[62px]">
                ✓
              </div>
              <div className="rounded-full border border-white/20 bg-white/10 px-3 py-2 text-xs font-bold leading-4">
                Đang chờ xác nhận
              </div>
            </div>

            <div className="mt-[30px] text-[13px] font-extrabold uppercase leading-[18px] tracking-[0.08em] text-white/70">
              Thanh toán khi nhận hàng
            </div>
            <h1 className="m-0 mt-2.5 text-[46px] font-black leading-[52px] tracking-[-1.9px] text-white">
              Xác nhận đơn COD
            </h1>
            <div className="mt-4 max-w-[540px] text-lg leading-7 text-white/80">
              {body.split(/\n{2,}/).map((paragraph, index) => (
                <p key={index} className="m-0 mb-3">
                  {paragraph.split('\n').map((line, lineIndex, lines) => (
                    <span key={lineIndex}>
                      {line}
                      {lineIndex < lines.length - 1 ? <br /> : null}
                    </span>
                  ))}
                </p>
              ))}
            </div>
          </div>

          <div className="px-[38px] py-[34px]">
            <div className="mb-[26px] rounded-[22px] border border-[#ffd591] bg-[#fff7e6] p-5">
              <div className="flex gap-3">
                <div className="text-[25px] leading-8">⏱</div>
                <div>
                  <div className="text-sm font-extrabold leading-5 text-[#7a4d00]">
                    Hạn xác nhận
                  </div>
                  <div className="mt-0.5 text-lg font-black leading-[26px]">
                    {previewContext.expiresAt}
                  </div>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-[26px] border border-[#e5e5ea] bg-white">
              <div className="border-b border-dashed border-[#d2d2d7] bg-[#fbfbfd] px-[22px] py-[18px]">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-[13px] font-bold uppercase leading-[18px] tracking-[0.04em] text-[#86868b]">
                      Mã xác nhận COD
                    </div>
                    <div className="mt-1 text-2xl font-black leading-[30px] tracking-[-0.5px]">
                      {previewContext.orderName}
                    </div>
                  </div>
                  <div className="rounded-full bg-[#eafaf1] px-3 py-2 text-[13px] font-black leading-[17px] text-[#12805c]">
                    Verify required
                  </div>
                </div>
              </div>
              <TicketRow label="Khách hàng" value={previewContext.customerName} />
              <TicketRow label="Tổng tiền COD" value="110.000 ₫" large />
              <TicketRow label="Cửa hàng" value={previewContext.shopName} last />
            </div>

            <div className="mt-[26px]">
              <div className="pb-3 text-[17px] font-black leading-6">
                Sản phẩm trong đơn
              </div>
              <div className="rounded-[22px] border border-[#e5e5ea] bg-[#f5f5f7] px-5 py-[18px]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-base font-black leading-6">
                      Product VT 1
                    </div>
                    <div className="mt-1 text-sm leading-[21px] text-[#86868b]">
                      blue · Số lượng: 1
                    </div>
                  </div>
                  <div className="text-base font-black leading-6">
                    100.000 ₫
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-[26px] rounded-[22px] border border-[#d7eaff] bg-[#f8fbff] p-5">
              <div className="text-[15px] font-extrabold leading-[23px]">
                Vì sao cần xác nhận?
              </div>
              <div className="mt-1 text-sm leading-[22px] text-[#515154]">
                Việc xác nhận giúp shop tránh đơn ảo, chuẩn bị hàng nhanh hơn
                và đảm bảo thông tin giao hàng là chính xác.
              </div>
            </div>

            <div className="mt-8">
              <a
                className="inline-block rounded-[17px] bg-[#0071e3] px-7 py-[17px] text-base font-black leading-[22px] text-white no-underline shadow-[0_12px_28px_rgba(0,113,227,0.28)]"
                href="#"
              >
                Xác nhận đơn hàng
              </a>
              <a
                className="ml-3 inline-block rounded-[17px] border border-[#ffd6d6] bg-white px-6 py-4 text-base font-black leading-[22px] text-[#d70015] no-underline"
                href="#"
              >
                Hủy đơn
              </a>
            </div>

            <div className="mt-[26px] border-t border-[#e5e5ea] pt-[22px] text-[13px] leading-5 text-[#86868b]">
              Lựa chọn của bạn sẽ được ghi nhận ngay khi bấm vào nút trong
              email.
            </div>
          </div>
        </div>

        <p className="m-0 px-[18px] pt-6 text-center text-xs leading-[18px] text-[#86868b]">
          Email này được gửi tự động từ {previewContext.shopName} để xác nhận
          đơn hàng thanh toán khi nhận hàng.
        </p>
      </div>
    </div>
  );
}

function TicketRow({
  label,
  value,
  large = false,
  last = false,
}: {
  label: string;
  value: string;
  large?: boolean;
  last?: boolean;
}) {
  return (
    <div
      className={[
        'flex items-center justify-between gap-4 px-[22px] py-[18px]',
        last ? '' : 'border-b border-[#f0f0f2]',
      ].join(' ')}
    >
      <div className="text-[15px] font-bold leading-[22px] text-[#86868b]">
        {label}
      </div>
      <div
        className={[
          'text-right font-black text-[#1d1d1f]',
          large ? 'text-2xl leading-[30px] tracking-[-0.7px]' : 'text-base leading-6',
        ].join(' ')}
      >
        {value}
      </div>
    </div>
  );
}

function renderTemplateText(
  template: string,
  context: Record<string, string>,
) {
  return template
    .replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_match, key: string) => {
      return context[key] || '';
    })
    .split('\n')
    .filter((line) => {
      const normalized = line.trim().toLowerCase();

      return (
        normalized !== previewContext.verificationUrl &&
        !normalized.includes('{{verificationurl}}') &&
        !normalized.includes('link sau')
      );
    })
    .join('\n')
    .trim();
}
