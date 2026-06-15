export type VerificationTemplateMode = 'decision' | 'verification';

export type VerificationTemplateLineItem = {
  title: string;
  variantTitle: string | null;
  quantity: number;
  price: string | null;
};

export type VerificationTemplateInput = {
  shopName: string;
  orderName: string;
  mode?: VerificationTemplateMode;
  statusTitle?: string;
  statusIcon?: string;
  statusColor?: string;
  paymentStatus?: string;
  footerMessage?: string;
  messageHtml?: string;
  expiresAt?: string;
  confirmUrl?: string;
  cancelUrl?: string;
  placedAt: string;
  deliveryWindow: string;
  items: VerificationTemplateLineItem[];
  totalAmount: string;
  currency: string;
  customerName: string;
  customerPhone: string;
  shippingAddress: string;
  paymentMethod: string;
};
