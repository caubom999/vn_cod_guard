import { BadRequestException, Injectable } from '@nestjs/common';
import { VerificationChannel } from '@prisma/client';
import { CodSettingsRepository } from './cod-settings.repository';
import { SmsIntegrationService } from '../integrations/sms-integration.service';

const CUSTOMER_VERIFICATION_CHANNELS = new Set<VerificationChannel>([
  VerificationChannel.EMAIL,
  VerificationChannel.SMS,
  VerificationChannel.WHATSAPP,
]);

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
  constructor(
    private readonly settings: CodSettingsRepository,
    private readonly smsIntegrations: SmsIntegrationService,
  ) {}

  async get(shopId: number) {
    return this.toResponse(
      await this.settings.getOrCreate(shopId),
      await this.smsIntegrations.isAvailable(shopId),
    );
  }

  async update(shopId: number, dto: UpdateCodSettingsDto) {
    const smsAvailable = await this.smsIntegrations.isAvailable(shopId);
    const data = this.validate(dto, smsAvailable);

    return this.toResponse(
      await this.settings.update(shopId, data),
      smsAvailable,
    );
  }

  private validate(dto: UpdateCodSettingsDto, smsAvailable: boolean) {
    const data: Record<string, unknown> = {};

    if (typeof dto.enabled === 'boolean') {
      data.enabled = dto.enabled;
    }

    if (dto.defaultChannel !== undefined) {
      if (!CUSTOMER_VERIFICATION_CHANNELS.has(dto.defaultChannel)) {
        throw new BadRequestException(
          'Default channel must be Email, WhatsApp, or SMS',
        );
      }

      if (dto.defaultChannel === VerificationChannel.SMS && !smsAvailable) {
        throw new BadRequestException(
          'Configure and enable an SMS connection first',
        );
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

  private toResponse(
    setting: {
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
    },
    smsAvailable: boolean,
  ) {
    return {
      id: setting.id,
      shopId: setting.shopId,
      enabled: setting.enabled,
      defaultChannel: CUSTOMER_VERIFICATION_CHANNELS.has(setting.defaultChannel)
        ? setting.defaultChannel
        : VerificationChannel.EMAIL,
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
      availableChannels: [
        VerificationChannel.EMAIL,
        ...(smsAvailable ? [VerificationChannel.SMS] : []),
      ],
      createdAt: setting.createdAt,
      updatedAt: setting.updatedAt,
    };
  }
}
