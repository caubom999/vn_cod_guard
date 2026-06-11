export const COD_DEFAULT_PAYMENT_NAMES = [
  'cod',
  'cash on delivery',
  'cash on delivery (cod)',
  'manual',
  'thanh toán khi giao hàng',
  'thanh toán khi nhận hàng',
  'tra tien khi nhan hang',
  'trả tiền khi nhận hàng',
];

export const COD_DEFAULT_TAGS = {
  pending: 'cod_pending',
  risky: 'cod_risky',
  confirmed: 'cod_confirmed',
  cancelled: 'cod_cancelled',
  noResponse: 'cod_no_response',
} as const;

export const COD_RISK_REVIEW_THRESHOLD = 50;
