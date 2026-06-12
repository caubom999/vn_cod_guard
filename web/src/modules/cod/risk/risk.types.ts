import { BlacklistEntryType, Prisma } from '@prisma/client';

export type RiskRuleCondition =
  | { type: 'missing_phone' }
  | { type: 'missing_email' }
  | { type: 'amount_gte'; amount: number }
  | { type: 'province_in'; values: string[] }
  | { type: 'city_in'; values: string[] }
  | { type: 'location_in'; provinces?: string[]; cities?: string[] }
  | { type: 'phone_cancel_count_gte'; count: number };

export type RiskRuleAction = {
  score: number;
  reason: string;
};

export type RiskEvaluationInput = {
  shopId: number;
  shopifyOrderGid: string;
  isCod: boolean;
  totalAmount: Prisma.Decimal | null;
  customerEmail: string | null;
  customerPhone: string | null;
  normalizedPhone: string | null;
  shippingProvince: string | null;
  shippingCity: string | null;
  shippingDistrict: string | null;
  shippingAddressJson: Record<string, unknown> | null;
};

export type RiskResult = {
  score: number;
  reasons: string[];
};

export type BlacklistCandidate = {
  type: BlacklistEntryType;
  value: string;
};
