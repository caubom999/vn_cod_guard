import { BadRequestException, Injectable } from '@nestjs/common';
import { VerificationChannel } from '@prisma/client';
import { CodSettingsRepository } from './cod-settings.repository';

export type UpdateCodSettingsDto = {
  enabled?: boolean;
  defaultChannel?: VerificationChannel;
  confirmationDeadlineMinutes?: number;
  reminderDelayMinutes?: number;
  maxReminders?: number;
  autoCancelUnconfirmed?: boolean;
  pendingTag?: string;
  confirmedTag?: string;
  cancelledTag?: string;
  expiredTag?: string;
  riskTag?: string;
  codPaymentNames?: string[];
};

@Injectable()
export class CodSettingsService {
  constructor(private readonly settings: CodSettingsRepository) {}

  async get(shopId: number) {
    return this.toResponse(await this.settings.getOrCreate(shopId));
  }

  async update(shopId: number, dto: UpdateCodSettingsDto) {
    const data = this.validate(dto);

    return this.toResponse(await this.settings.update(shopId, data));
  }

  private validate(dto: UpdateCodSettingsDto) {
    const data: Record<string, unknown> = {};

    if (typeof dto.enabled === 'boolean') {
      data.enabled = dto.enabled;
    }

    if (dto.defaultChannel !== undefined) {
      if (!Object.values(VerificationChannel).includes(dto.defaultChannel)) {
        throw new BadRequestException('Invalid default channel');
      }

      data.defaultChannel = dto.defaultChannel;
    }

    data.confirmationDeadlineMinutes = this.numberInRange(
      dto.confirmationDeadlineMinutes,
      'confirmationDeadlineMinutes',
      1,
      10080,
    );
    data.reminderDelayMinutes = this.numberInRange(
      dto.reminderDelayMinutes,
      'reminderDelayMinutes',
      1,
      10080,
    );
    data.maxReminders = this.numberInRange(
      dto.maxReminders,
      'maxReminders',
      0,
      10,
    );

    if (typeof dto.autoCancelUnconfirmed === 'boolean') {
      data.autoCancelUnconfirmed = dto.autoCancelUnconfirmed;
    }

    for (const key of [
      'pendingTag',
      'confirmedTag',
      'cancelledTag',
      'expiredTag',
      'riskTag',
    ] as const) {
      if (dto[key] !== undefined) {
        data[key] = this.validateTag(dto[key], key);
      }
    }

    if (dto.codPaymentNames !== undefined) {
      if (!Array.isArray(dto.codPaymentNames)) {
        throw new BadRequestException(
          'COD payment method names must be an array',
        );
      }

      data.codPaymentNamesJson = dto.codPaymentNames
        .map((name) => (typeof name === 'string' ? name.trim() : ''))
        .filter(Boolean)
        .slice(0, 20);
    }

    return Object.fromEntries(
      Object.entries(data).filter(([, value]) => value !== undefined),
    );
  }

  private numberInRange(
    value: number | undefined,
    field: string,
    min: number,
    max: number,
  ) {
    if (value === undefined) {
      return undefined;
    }

    if (!Number.isInteger(value) || value < min || value > max) {
      throw new BadRequestException(
        `${field} must be between ${min} and ${max}`,
      );
    }

    return value;
  }

  private validateTag(value: string | undefined, field: string) {
    const tag = value?.trim();

    if (!tag) {
      throw new BadRequestException(`${field} is required`);
    }

    if (tag.length > 64) {
      throw new BadRequestException(`${field} must be 64 characters or fewer`);
    }

    return tag;
  }

  private toResponse(setting: {
    id: number;
    shopId: number;
    enabled: boolean;
    defaultChannel: VerificationChannel;
    confirmationDeadlineMinutes: number;
    reminderDelayMinutes: number;
    maxReminders: number;
    autoCancelUnconfirmed: boolean;
    pendingTag: string;
    confirmedTag: string;
    cancelledTag: string;
    expiredTag: string;
    riskTag: string;
    codPaymentNamesJson: unknown;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: setting.id,
      shopId: setting.shopId,
      enabled: setting.enabled,
      defaultChannel: setting.defaultChannel,
      confirmationDeadlineMinutes: setting.confirmationDeadlineMinutes,
      reminderDelayMinutes: setting.reminderDelayMinutes,
      maxReminders: setting.maxReminders,
      autoCancelUnconfirmed: setting.autoCancelUnconfirmed,
      pendingTag: setting.pendingTag,
      confirmedTag: setting.confirmedTag,
      cancelledTag: setting.cancelledTag,
      expiredTag: setting.expiredTag,
      riskTag: setting.riskTag,
      codPaymentNames: Array.isArray(setting.codPaymentNamesJson)
        ? setting.codPaymentNamesJson.filter(
            (name): name is string => typeof name === 'string',
          )
        : [],
      createdAt: setting.createdAt,
      updatedAt: setting.updatedAt,
    };
  }
}
