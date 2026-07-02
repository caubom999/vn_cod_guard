import { BadRequestException, Injectable } from '@nestjs/common';
import { CodFeeSetting, CodFeeType, Prisma, Shop } from '@prisma/client';
import {
  ADD_COD_FEE_CUSTOM_ITEM,
  BEGIN_COD_FEE_ORDER_EDIT,
  COMMIT_COD_FEE_ORDER_EDIT,
} from '../../graphql/mutation/order-edit.mutation';
import { ShopifyService } from '../../shopify/shopify.service';
import { CodFeeRepository } from './cod-fee.repository';

export type UpdateCodFeeDto = {
  enabled?: boolean;
  feeType?: 'fixed' | 'percentage';
  feeAmount?: number;
  minimumOrderAmount?: number | null;
  provinces?: string[];
  excludedCustomerTags?: string[];
  lineItemTitle?: string;
  displayMessage?: string;
};

export type ApplyCodFeeInput = {
  shop: Shop;
  codOrderId: number;
  shopifyOrderGid: string;
  isCod: boolean;
  orderTotal: Prisma.Decimal | null;
  currency: string | null;
  shippingProvince: string | null;
  shippingCity: string | null;
  customerTags: string[];
  alreadyAppliedAt: Date | null;
};

export type ApplyCodFeeResult =
  | { status: 'applied' | 'already-applied'; amount: number }
  | { status: 'skipped'; reason: string };

type UserError = { field?: string[] | null; message: string };

@Injectable()
export class CodFeeService {
  constructor(
    private readonly fees: CodFeeRepository,
    private readonly shopify: ShopifyService,
  ) {}

  async get(shopId: number) {
    return this.toResponse(await this.fees.getOrCreate(shopId));
  }

  async update(shopId: number, dto: UpdateCodFeeDto) {
    const current = await this.fees.getOrCreate(shopId);
    const data = this.validate(dto, current);
    return this.toResponse(await this.fees.update(shopId, data));
  }

  async applyToOrder(input: ApplyCodFeeInput): Promise<ApplyCodFeeResult> {
    if (!input.isCod) {
      return { status: 'skipped', reason: 'Order is not COD.' };
    }

    const setting = await this.fees.getOrCreate(input.shop.id);

    if (!setting.enabled) {
      return { status: 'skipped', reason: 'COD fee is disabled.' };
    }

    if (input.alreadyAppliedAt && input.orderTotal) {
      return {
        status: 'already-applied',
        amount: this.calculateAmount(setting, input.orderTotal, input.currency),
      };
    }

    const eligibility = this.getEligibility(setting, input);

    if (eligibility) {
      return { status: 'skipped', reason: eligibility };
    }

    if (!input.orderTotal) {
      return { status: 'skipped', reason: 'Order total is unavailable.' };
    }

    if (!input.currency) {
      return { status: 'skipped', reason: 'Order currency is unavailable.' };
    }

    const amount = this.calculateAmount(
      setting,
      input.orderTotal,
      input.currency,
    );
    const calculatedOrder = await this.beginOrderEdit(
      input.shop.domain,
      input.shopifyOrderGid,
    );

    if (
      calculatedOrder.lineItemTitles.some(
        (title) =>
          this.normalize(title) === this.normalize(setting.lineItemTitle),
      )
    ) {
      await this.fees.markApplied(input.codOrderId, new Prisma.Decimal(amount));
      return { status: 'already-applied', amount };
    }

    await this.addCustomItem({
      shopDomain: input.shop.domain,
      calculatedOrderId: calculatedOrder.id,
      title: setting.lineItemTitle,
      amount,
      currency: input.currency,
    });
    await this.commitOrderEdit(input.shop.domain, calculatedOrder.id);
    await this.fees.markApplied(input.codOrderId, new Prisma.Decimal(amount));

    return { status: 'applied', amount };
  }

  markFailed(codOrderId: number, message: string) {
    return this.fees.markFailed(codOrderId, message);
  }

  private validate(dto: UpdateCodFeeDto, current: CodFeeSetting) {
    const enabled =
      typeof dto.enabled === 'boolean' ? dto.enabled : current.enabled;
    const feeType =
      dto.feeType === undefined
        ? current.feeType
        : dto.feeType === 'fixed'
          ? CodFeeType.FIXED
          : dto.feeType === 'percentage'
            ? CodFeeType.PERCENTAGE
            : null;

    if (!feeType) {
      throw new BadRequestException('Fee type must be fixed or percentage');
    }

    const feeAmount = this.requiredAmount(
      dto.feeAmount,
      current.feeAmount,
      'Fee amount',
    );

    if (feeType === CodFeeType.PERCENTAGE && feeAmount > 100) {
      throw new BadRequestException('Percentage must be 100 or less');
    }

    const minimumOrderAmount = this.optionalAmount(
      dto.minimumOrderAmount,
      current.minimumOrderAmount,
      'Minimum order total',
    );
    const provinces = this.cleanList(
      dto.provinces,
      this.jsonStringArray(current.provincesJson),
    );
    const excludedCustomerTags = this.cleanList(
      dto.excludedCustomerTags,
      this.jsonStringArray(current.excludedCustomerTagsJson),
    );
    const lineItemTitle = this.requiredText(
      dto.lineItemTitle,
      current.lineItemTitle,
      255,
      'Fee line item title',
    );
    const displayMessage = this.requiredText(
      dto.displayMessage,
      current.displayMessage,
      1000,
      'Display message',
    );

    return {
      enabled,
      feeType,
      feeAmount: new Prisma.Decimal(feeAmount),
      minimumOrderAmount:
        minimumOrderAmount === null
          ? null
          : new Prisma.Decimal(minimumOrderAmount),
      provincesJson: provinces as Prisma.InputJsonValue,
      excludedCustomerTagsJson: excludedCustomerTags as Prisma.InputJsonValue,
      lineItemTitle,
      displayMessage,
    };
  }

  private getEligibility(
    setting: CodFeeSetting,
    input: ApplyCodFeeInput,
  ): string | null {
    if (
      setting.minimumOrderAmount &&
      (!input.orderTotal ||
        input.orderTotal.lessThan(setting.minimumOrderAmount))
    ) {
      return 'Order total is below the configured minimum.';
    }

    const locations = this.jsonStringArray(setting.provincesJson).map((value) =>
      this.normalize(value),
    );
    const orderLocations = [input.shippingProvince, input.shippingCity]
      .filter((value): value is string => Boolean(value))
      .map((value) => this.normalize(value));

    if (
      locations.length &&
      !orderLocations.some((location) =>
        locations.some(
          (configured) =>
            location.includes(configured) || configured.includes(location),
        ),
      )
    ) {
      return 'Shipping province or city does not match the fee rule.';
    }

    const excludedTags = this.jsonStringArray(
      setting.excludedCustomerTagsJson,
    ).map((value) => this.normalize(value));
    const customerTags = input.customerTags.map((value) =>
      this.normalize(value),
    );

    if (customerTags.some((tag) => excludedTags.includes(tag))) {
      return 'Customer has an excluded tag.';
    }

    return null;
  }

  private calculateAmount(
    setting: CodFeeSetting,
    orderTotal: Prisma.Decimal,
    currency: string | null,
  ) {
    const raw =
      setting.feeType === CodFeeType.PERCENTAGE
        ? orderTotal.mul(setting.feeAmount).div(100)
        : setting.feeAmount;
    const decimals = currency?.toUpperCase() === 'VND' ? 0 : 2;

    return raw
      .toDecimalPlaces(decimals, Prisma.Decimal.ROUND_HALF_UP)
      .toNumber();
  }

  private async beginOrderEdit(shopDomain: string, orderId: string) {
    const response = await this.shopify.graphql(
      shopDomain,
      BEGIN_COD_FEE_ORDER_EDIT,
      { id: orderId },
    );
    const payload = this.payload<{
      calculatedOrder?: {
        id?: string;
        lineItems?: { nodes?: Array<{ title?: string | null }> };
      } | null;
      userErrors?: UserError[];
    }>(response, 'orderEditBegin');

    this.throwUserErrors(payload.userErrors);

    if (!payload.calculatedOrder?.id) {
      throw new Error('Shopify did not start the order edit');
    }

    return {
      id: payload.calculatedOrder.id,
      lineItemTitles: (payload.calculatedOrder.lineItems?.nodes || [])
        .map((node) => node.title)
        .filter((title): title is string => Boolean(title)),
    };
  }

  private async addCustomItem(input: {
    shopDomain: string;
    calculatedOrderId: string;
    title: string;
    amount: number;
    currency: string;
  }) {
    const response = await this.shopify.graphql(
      input.shopDomain,
      ADD_COD_FEE_CUSTOM_ITEM,
      {
        id: input.calculatedOrderId,
        title: input.title,
        price: {
          amount: String(input.amount),
          currencyCode: input.currency.toUpperCase(),
        },
      },
    );
    const payload = this.payload<{
      calculatedLineItem?: { id?: string } | null;
      userErrors?: UserError[];
    }>(response, 'orderEditAddCustomItem');

    this.throwUserErrors(payload.userErrors);

    if (!payload.calculatedLineItem?.id) {
      throw new Error('Shopify did not add the COD fee line item');
    }
  }

  private async commitOrderEdit(shopDomain: string, calculatedOrderId: string) {
    const response = await this.shopify.graphql(
      shopDomain,
      COMMIT_COD_FEE_ORDER_EDIT,
      { id: calculatedOrderId },
    );
    const payload = this.payload<{
      order?: { id?: string } | null;
      userErrors?: UserError[];
    }>(response, 'orderEditCommit');

    this.throwUserErrors(payload.userErrors);

    if (!payload.order?.id) {
      throw new Error('Shopify did not commit the COD fee order edit');
    }
  }

  private payload<T>(response: unknown, key: string) {
    const data = (response as { data?: Record<string, unknown> })?.data;
    return (data?.[key] || {}) as T;
  }

  private throwUserErrors(errors: UserError[] | undefined) {
    if (errors?.length) {
      throw new Error(errors.map((error) => error.message).join('; '));
    }
  }

  private requiredAmount(
    value: number | undefined,
    current: Prisma.Decimal,
    label: string,
  ) {
    const amount = value === undefined ? current.toNumber() : value;

    if (!Number.isFinite(amount) || amount <= 0 || amount > 999999999999) {
      throw new BadRequestException(`${label} must be greater than 0`);
    }

    return amount;
  }

  private optionalAmount(
    value: number | null | undefined,
    current: Prisma.Decimal | null,
    label: string,
  ) {
    const amount = value === undefined ? (current?.toNumber() ?? null) : value;

    if (
      amount !== null &&
      (!Number.isFinite(amount) || amount < 0 || amount > 999999999999)
    ) {
      throw new BadRequestException(`${label} must be a valid positive amount`);
    }

    return amount;
  }

  private requiredText(
    value: string | undefined,
    current: string,
    max: number,
    label: string,
  ) {
    const text = value === undefined ? current : value.trim();

    if (!text || text.length > max) {
      throw new BadRequestException(
        `${label} is required and must be ${max} characters or fewer`,
      );
    }

    return text;
  }

  private cleanList(value: string[] | undefined, current: string[]) {
    const values = value === undefined ? current : value;
    return [...new Set(values.map((item) => item.trim()).filter(Boolean))];
  }

  private jsonStringArray(value: Prisma.JsonValue | null) {
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === 'string')
      : [];
  }

  private normalize(value: string) {
    return value
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  private toResponse(setting: CodFeeSetting) {
    return {
      id: setting.id,
      shopId: setting.shopId,
      enabled: setting.enabled,
      feeType: setting.feeType === CodFeeType.FIXED ? 'fixed' : 'percentage',
      feeAmount: setting.feeAmount.toNumber(),
      minimumOrderAmount: setting.minimumOrderAmount?.toNumber() ?? null,
      provinces: this.jsonStringArray(setting.provincesJson),
      excludedCustomerTags: this.jsonStringArray(
        setting.excludedCustomerTagsJson,
      ),
      lineItemTitle: setting.lineItemTitle,
      displayMessage: setting.displayMessage,
      updatedAt: setting.updatedAt.toISOString(),
    };
  }
}
