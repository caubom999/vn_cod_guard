import { Text } from '@shopify/polaris';

export type TemplatePreviewDraft = {
  body: string;
};

const previewContext = {
  shopName: 'StoreVT23',
  customerName: 'Thanh Van',
  orderName: '#1030',
  amount: '110000',
  currency: 'VND',
  expiresAt: '11:14:17 15/6/2026',
  verificationUrl: '#',
};

export function Template1Preview({ draft }: { draft: TemplatePreviewDraft }) {
  const body = renderTemplateText(draft.body, previewContext);

  return (
    <div className="overflow-x-auto rounded-lg border border-[#dfe3e8] bg-[#f6f6f7] p-4">
      <div className="mx-auto min-w-[520px] max-w-[600px] bg-white font-[Arial,sans-serif] text-[#403f3f]">
        <div className="h-3" />
        <div className="h-[7px] bg-[#ff680c]" />
        <div className="table w-full bg-white">
          <div className="table-cell w-1/2 px-[25px] py-[18px] align-middle">
            <div className="text-2xl font-extrabold text-[#ff680c]">
              {previewContext.shopName}
            </div>
          </div>
          <div className="table-cell w-1/2 px-[25px] py-[18px] text-right align-middle">
            <div className="mb-2 text-[13px] text-[#8c8989]">Ma don hang</div>
            <div className="text-[15px] font-extrabold text-black">
              {previewContext.orderName}
            </div>
          </div>
        </div>

        <div className="bg-[#f3f3f3] px-[25px] pb-[18px] pt-[26px]">
          <h1 className="mb-5 mt-0 text-[25px] font-extrabold leading-none text-[#403f3f]">
            Xac nhan don hang COD
          </h1>
          <div className="text-sm leading-relaxed text-[#202223]">
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
          </div>
          <p className="mb-0 mt-2.5 text-[13px] font-extrabold text-black">
            Han xac nhan: {previewContext.expiresAt}
          </p>
        </div>

        <div className="bg-white px-[25px] pt-5">
          <Text as="h2" variant="headingSm">
            THONG TIN DON HANG
          </Text>
          <div className="grid grid-cols-[1fr_auto] gap-4 border-b-2 border-[#e6e6e6] py-[18px]">
            <div>
              <div className="text-sm font-extrabold text-[#666363]">
                PRODUCT VT 1
              </div>
              <div className="mt-2 text-xs text-[#666363]">blue</div>
            </div>
            <div className="text-right">
              <div className="mt-2 text-xs text-[#666363]">So luong: 1</div>
              <div className="mt-3 text-sm font-extrabold text-[#666363]">
                100.000 d
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white px-[25px] pb-5 pt-4 text-right text-[17px] font-extrabold text-black">
          Tong cong: 110.000 d
        </div>

        <div className="bg-white px-[25px] pb-[26px] pt-5">
          <a
            className="mb-3 mr-3 inline-block rounded-md bg-[#008060] px-[22px] py-3.5 text-[17px] font-extrabold text-white no-underline"
            href="#"
          >
            Xac nhan don
          </a>
          <a
            className="mb-3 mr-3 inline-block rounded-md bg-[#d82c0d] px-[22px] py-3.5 text-[17px] font-extrabold text-white no-underline"
            href="#"
          >
            Huy don
          </a>
        </div>

        <div className="grid grid-cols-2 gap-6 bg-[#f3f3f3] px-[25px] py-5">
          <div className="min-w-0">
            <div className="mb-[18px] text-[13px] font-extrabold text-black">
              GIAO HANG DEN
            </div>
            <p className="mb-3.5 mt-0 text-[13px] font-extrabold text-black">
              Thanh Van
            </p>
            <p className="mb-3.5 mt-0 text-[13px] leading-snug text-black">
              N/A
            </p>
            <p className="mb-3.5 mt-0 text-[13px] leading-snug text-black">
              Truong Dinh, Hoang Mai, Vietnam
            </p>
          </div>
          <div className="min-w-0">
            <div className="mb-[18px] text-[13px] font-extrabold text-black">
              THANH TOAN
            </div>
            <p className="mb-3.5 mt-0 text-[13px] font-extrabold text-black">
              Thanh toan khi nhan hang
            </p>
            <p className="mb-3.5 mt-0 text-[13px] leading-snug text-black">
              Phuong thuc: Cash on Delivery (COD)
            </p>
            <p className="mb-3.5 mt-0 text-[13px] leading-snug text-black">
              Trang thai: <span className="text-[#27ae60]">Cho xac nhan COD</span>
            </p>
          </div>
        </div>

        <div className="border-t border-[#e0e0e0] bg-[#f9f9f9] px-[30px] py-[25px] text-center">
          <div className="mb-2.5 text-xl font-extrabold text-[#ff6b35]">
            {previewContext.shopName}
          </div>
          <div className="text-[13px] leading-[1.8] text-[#777777]">
            Lua chon cua ban se duoc ghi nhan ngay khi bam vao nut trong email.
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
