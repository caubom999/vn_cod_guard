import { MessageTemplateType, VerificationChannel } from '@prisma/client';

export const DEFAULT_MESSAGE_LOCALE = 'vi';

export const DEFAULT_VERIFICATION_EMAIL_TEMPLATE = {
  type: MessageTemplateType.VERIFICATION,
  channel: VerificationChannel.EMAIL,
  locale: DEFAULT_MESSAGE_LOCALE,
  subject: 'Xac nhan don COD {{orderName}}',
  body: [
    'Xin chao {{customerName}},',
    '',
    'Cam on ban da dat hang tai {{shopName}}.',
    '',
    'Don hang: {{orderName}}',
    'Tong tien: {{amount}} {{currency}}',
    'Han xac nhan: {{expiresAt}}',
    '',
    'Vui long xac nhan hoac huy don COD bang cac nut trong email.',
    '',
    'Neu ban khong thuc hien don hang nay, hay chon Huy don trong trang xac nhan.',
    '',
    '{{shopName}}',
  ].join('\n'),
};
