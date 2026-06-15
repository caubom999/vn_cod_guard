import { Text } from '@shopify/polaris';
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

export function Template2Preview({ draft }: { draft: TemplatePreviewDraft }) {
  const body = renderTemplateText(draft.body, previewContext);

  return (
    <div className="overflow-x-auto rounded-lg border border-[#dfe3e8] bg-[#f0f0f0] p-4">
      <div className="mx-auto min-w-[520px] max-w-[600px] bg-[#f2f2f2] font-[Arial,sans-serif] text-black">
        <div className="relative overflow-hidden bg-[#31558f] px-[42px] pb-[88px] pt-[28px] text-white">
          <div className="text-xs font-extrabold leading-none text-[#25e0b2]">
            BRAND
            <br />
            LOGO
          </div>
          <div className="mt-12 text-center text-[28px] font-extrabold leading-tight">
            Xác nhận đơn hàng COD
          </div>
          <div className="absolute right-[96px] top-[30px] h-0 w-0 border-b-[18px] border-l-[30px] border-t-[18px] border-b-transparent border-l-[#26c7b4] border-t-transparent rotate-[95deg]" />
          <div className="absolute right-[58px] top-[84px] h-0 w-0 border-b-[14px] border-l-[28px] border-t-[14px] border-b-transparent border-l-[#b9d99b] border-t-transparent rotate-[10deg]" />
          <div className="absolute bottom-[36px] right-[78px] h-0 w-0 border-l-[16px] border-r-[16px] border-t-[28px] border-l-transparent border-r-transparent border-t-[#f63768] rotate-[-45deg]" />
        </div>

        <div className="-mt-6 mx-auto w-[76%] bg-white px-7 pb-9 pt-8 shadow-[0_20px_24px_rgba(0,0,0,0.16)]">
          <div className="mb-7 text-[15px] leading-relaxed">
            {body.split(/\n{2,}/).map((paragraph, index) => (
              <p key={index} className="mb-3 mt-0">
                {paragraph.split('\n').map((line, lineIndex, lines) => (
                  <span key={lineIndex}>
                    {line}
                    {lineIndex < lines.length - 1 ? <br /> : null}
                  </span>
                ))}
              </p>
            ))}
            <p className="mb-0 mt-4 font-extrabold">
              Hạn xác nhận: {previewContext.expiresAt}
            </p>
          </div>

          <Text as="h2" variant="headingSm" alignment="center">
            Thông tin đơn hàng
          </Text>
          <div className="mt-6 grid grid-cols-3 gap-5 text-center">
            <div>
              <div className="mx-auto mb-4 h-11 w-16 rounded-br-[28px] rounded-tl-[28px] bg-[#7790bd]" />
              <div className="text-xs leading-snug">Mã đơn</div>
              <div className="mt-1 text-sm font-extrabold">
                {previewContext.orderName}
              </div>
            </div>
            <div>
              <div className="mx-auto mb-4 h-11 w-16 bg-[#61c8c4] [clip-path:polygon(20%_20%,100%_0,80%_100%,0_80%)]" />
              <div className="text-xs leading-snug">Tổng tiền</div>
              <div className="mt-1 text-sm font-extrabold">110.000 d</div>
            </div>
            <div>
              <div className="mx-auto mb-4 h-0 w-0 border-x-[24px] border-b-[42px] border-x-transparent border-b-[#ec5d8d]" />
              <div className="text-xs leading-snug">Trạng thái</div>
              <div className="mt-1 text-sm font-extrabold">Chờ xác nhận</div>
            </div>
          </div>

          <div className="mt-9 text-center">
            <Text as="h2" variant="headingSm">
              Sản phẩm trong đơn
            </Text>
            <p className="mt-4 text-[13px] leading-relaxed">
              Product VT 1 · blue · Số lượng: 1
            </p>
          </div>

          <div className="mt-8 text-center">
            <a
              className="mb-3 mr-3 inline-block rounded bg-[#008060] px-5 py-3 text-[15px] font-extrabold text-white no-underline"
              href="#"
            >
              Xác nhận đơn
            </a>
            <a
              className="mb-3 inline-block rounded bg-[#d82c0d] px-5 py-3 text-[15px] font-extrabold text-white no-underline"
              href="#"
            >
              Hủy đơn
            </a>
          </div>

          <div className="mt-8 text-center text-xs leading-relaxed">
            Lựa chọn của bạn sẽ được ghi nhận ngay khi bấm vào nút trong email.
          </div>
        </div>

        <div className="px-10 pb-8 pt-14 text-center text-[11px] leading-relaxed text-[#333]">
          <div>StoreVT23 · Truong Dinh, Hoang Mai, Vietnam</div>
          <div className="mt-2">
            Bạn có thể cập nhật thông tin liên hệ với cửa hàng bất cứ lúc nào.
          </div>
        </div>
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
