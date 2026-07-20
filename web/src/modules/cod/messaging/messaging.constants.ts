import { MessageTemplateType, VerificationChannel } from '@prisma/client';

export const DEFAULT_MESSAGE_LOCALE = 'vi';

export const DEFAULT_VERIFICATION_EMAIL_TEMPLATE = {
  type: MessageTemplateType.VERIFICATION,
  channel: VerificationChannel.EMAIL,
  locale: DEFAULT_MESSAGE_LOCALE,
  templateKey: 'template-1',
  subject: 'Xác nhận đơn hàng COD {{orderName}}',
  body: [
    'Xin chào {{customerName}},',
    '',
    'Cảm ơn bạn đã đặt hàng tại {{shopName}}.',
    '',
    'Thông tin đơn hàng:',
    'Mã đơn: {{orderName}}',
    'Tổng tiền: {{amount}} {{currency}}',
    'Hạn xác nhận: {{expiresAt}}',
    '',
    'Vui lòng kiểm tra thông tin đơn hàng và chọn Xác nhận đơn hoặc Hủy đơn ngay trong email này.',
    '',
    'Nếu bạn không thực hiện đơn hàng này hoặc muốn hủy đơn, vui lòng chọn Hủy đơn để cửa hàng xử lý kịp thời.',
    '',
    'Trân trọng,',
    '{{shopName}}',
  ].join('\n'),
};

export const DEFAULT_VERIFICATION_SMS_TEMPLATE = {
  type: MessageTemplateType.VERIFICATION,
  channel: VerificationChannel.SMS,
  locale: DEFAULT_MESSAGE_LOCALE,
  templateKey: 'sms-1',
  subject: null,
  body: '{{shopName}}: Xac nhan don {{orderName}}, tong {{amount}} {{currency}}. Mo link de xac nhan hoac huy:',
};
