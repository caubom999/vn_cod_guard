import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { IntegrationSecretService } from './integration-secret.service';
import { SmsIntegrationRepository } from './sms-integration.repository';
import { SmsProvider } from '../messaging/providers/sms.provider';

type SmsProviderId = 'twilio' | 'dev-log';

export type UpdateSmsIntegrationDto = {
  provider?: SmsProviderId;
  enabled?: boolean;
  from?: string;
  accountSid?: string;
  authToken?: string;
};

type StoredSmsConfig = {
  provider?: SmsProviderId;
  from?: string;
  billingMode?: 'platform' | 'merchant-direct';
};

@Injectable()
export class SmsIntegrationService {
  constructor(
    private readonly integrations: SmsIntegrationRepository,
    private readonly secrets: IntegrationSecretService,
    private readonly smsProvider: SmsProvider,
  ) {}

  async get(shopId: number) {
    return this.toResponse(await this.integrations.getOrCreate(shopId));
  }

  async update(shopId: number, dto: UpdateSmsIntegrationDto) {
    const integration = await this.integrations.getOrCreate(shopId);
    const currentConfig = this.readConfig(integration.configJson);
    const currentSecrets = this.secrets.decrypt(
      integration.encryptedSecretJson,
    );
    const provider = dto.provider || currentConfig.provider || 'twilio';

    if (provider === 'dev-log' && process.env.NODE_ENV === 'production') {
      throw new BadRequestException(
        'The development SMS provider cannot be enabled in production',
      );
    }

    const from = dto.from?.trim() || currentConfig.from || '';
    const accountSid =
      dto.accountSid?.trim() || currentSecrets.accountSid || '';
    const authToken = dto.authToken?.trim() || currentSecrets.authToken || '';
    const enabled = dto.enabled ?? integration.enabled;

    if (provider === 'twilio' && enabled) {
      if (!accountSid || !authToken || !from) {
        throw new BadRequestException(
          'Twilio Account SID, Auth Token, and sender number are required',
        );
      }
      this.validateTwilioAccountSid(accountSid);
      this.validateSender(from);
    }

    const updated = await this.integrations.update(shopId, {
      enabled,
      senderName: from || 'COD Guard',
      configJson: {
        provider,
        from,
        billingMode: provider === 'dev-log' ? 'platform' : 'merchant-direct',
      } as Prisma.InputJsonValue,
      encryptedSecretJson:
        provider === 'twilio'
          ? (this.secrets.encrypt({
              accountSid,
              authToken,
            }) as Prisma.InputJsonValue)
          : Prisma.JsonNull,
    });

    return this.toResponse(updated);
  }

  async disconnect(shopId: number) {
    await this.integrations.getOrCreate(shopId);
    const updated = await this.integrations.update(shopId, {
      enabled: false,
      encryptedSecretJson: Prisma.JsonNull,
    });

    return this.toResponse(updated);
  }

  async test(shopId: number) {
    const runtime = await this.getRuntimeConfiguration(shopId);

    if (!runtime.enabled) {
      throw new BadRequestException('Enable and save the SMS connection first');
    }

    await this.smsProvider.verifyConnection(runtime.integrationConfig);
    return { ok: true, provider: runtime.provider };
  }

  async isAvailable(shopId: number) {
    const runtime = await this.getRuntimeConfiguration(shopId);
    return runtime.enabled && runtime.configured;
  }

  async getRuntimeConfiguration(shopId: number) {
    const integration = await this.integrations.getOrCreate(shopId);
    const config = this.readConfig(integration.configJson);
    const provider = config.provider || this.environmentProvider();
    const storedSecrets = this.secrets.decrypt(integration.encryptedSecretJson);

    if (
      provider === 'twilio' &&
      storedSecrets.accountSid &&
      storedSecrets.authToken
    ) {
      return {
        enabled: integration.enabled,
        configured: Boolean(config.from),
        provider,
        integrationConfig: {
          mode: 'twilio',
          from: config.from,
          accountSid: storedSecrets.accountSid,
          authToken: storedSecrets.authToken,
          billingMode: 'merchant-direct' as const,
        },
      };
    }

    const environmentConfigured =
      this.isEnvironmentProviderConfigured(provider);
    return {
      enabled: integration.enabled || environmentConfigured,
      configured: environmentConfigured,
      provider,
      integrationConfig: {
        mode: provider,
        from: config.from,
        billingMode: 'platform' as const,
      },
    };
  }

  private toResponse(integration: {
    enabled: boolean;
    senderName: string | null;
    configJson: unknown;
    encryptedSecretJson: unknown;
    updatedAt: Date;
  }) {
    const config = this.readConfig(integration.configJson);
    const storedSecrets = this.secrets.decrypt(integration.encryptedSecretJson);
    const provider = config.provider || this.environmentProvider();
    const configured =
      provider === 'dev-log'
        ? process.env.NODE_ENV !== 'production'
        : Boolean(
            (storedSecrets.accountSid &&
              storedSecrets.authToken &&
              config.from) ||
              this.isEnvironmentProviderConfigured(provider),
          );

    return {
      provider,
      enabled: integration.enabled && configured,
      configured,
      from: config.from || '',
      hasAccountSid: Boolean(storedSecrets.accountSid),
      hasAuthToken: Boolean(storedSecrets.authToken),
      billingOwner: provider === 'dev-log' ? 'platform' : 'merchant',
      updatedAt: integration.updatedAt,
      providers: [
        {
          id: 'twilio',
          name: 'Twilio',
          description: 'Global SMS coverage with delivery reporting.',
          availability: 'available',
        },
        {
          id: 'esms',
          name: 'eSMS Vietnam',
          description: 'Local sender-name and domestic routing support.',
          availability: 'coming-soon',
        },
        ...(process.env.NODE_ENV !== 'production'
          ? [
              {
                id: 'dev-log',
                name: 'Development sandbox',
                description: 'Writes masked messages to the application log.',
                availability: 'development',
              },
            ]
          : []),
      ],
    };
  }

  private readConfig(value: unknown): StoredSmsConfig {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }
    return value as StoredSmsConfig;
  }

  private environmentProvider(): SmsProviderId {
    return process.env.SMS_PROVIDER?.toLowerCase() === 'twilio'
      ? 'twilio'
      : 'dev-log';
  }

  private isEnvironmentProviderConfigured(provider: SmsProviderId) {
    if (provider === 'dev-log') {
      return process.env.NODE_ENV !== 'production';
    }

    return Boolean(
      process.env.TWILIO_ACCOUNT_SID &&
        process.env.TWILIO_AUTH_TOKEN &&
        process.env.TWILIO_FROM &&
        process.env.SHOPIFY_SMS_USAGE_BILLING_ENABLED === 'true',
    );
  }

  private validateTwilioAccountSid(value: string) {
    if (!/^AC[a-fA-F0-9]{32}$/.test(value)) {
      throw new BadRequestException('Enter a valid Twilio Account SID');
    }
  }

  private validateSender(value: string) {
    if (
      !/^\+[1-9]\d{7,14}$/.test(value) &&
      !/^[a-zA-Z0-9 ]{3,11}$/.test(value)
    ) {
      throw new BadRequestException(
        'Enter an E.164 sender number or an approved alphanumeric sender ID',
      );
    }
  }
}
