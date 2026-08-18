import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { IntegrationSecretService } from './integration-secret.service';
import { SmsIntegrationRepository } from './sms-integration.repository';
import {
  SmsIntegrationConfig,
  SmsProvider,
} from '../messaging/providers/sms.provider';

type SmsProviderId = 'twilio' | 'esms';

export type UpdateSmsIntegrationDto = {
  provider?: SmsProviderId;
  enabled?: boolean;
  from?: string;
  accountSid?: string;
  authToken?: string;
  apiKey?: string;
  secretKey?: string;
  brandname?: string;
};

type StoredSmsConfig = {
  provider?: string;
  twilioFrom?: string;
  esmsBrandname?: string;
  // Kept for records created before provider-specific sender fields existed.
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
    const integration = await this.integrations.getOrCreate(shopId);
    return this.toResponse(integration);
  }

  async update(shopId: number, dto: UpdateSmsIntegrationDto) {
    const integration = await this.integrations.getOrCreate(shopId);
    const currentConfig = this.readConfig(integration.configJson);
    const currentSecrets = this.secrets.decrypt(
      integration.encryptedSecretJson,
    );
    const provider = this.readProvider(dto.provider || currentConfig.provider);

    const from =
      dto.from?.trim() || currentConfig.twilioFrom || currentConfig.from || '';
    const brandname =
      dto.brandname?.trim() || currentConfig.esmsBrandname || '';
    const accountSid =
      dto.accountSid?.trim() || currentSecrets.accountSid || '';
    const authToken = dto.authToken?.trim() || currentSecrets.authToken || '';
    const apiKey = dto.apiKey?.trim() || currentSecrets.apiKey || '';
    const secretKey = dto.secretKey?.trim() || currentSecrets.secretKey || '';
    const enabled = dto.enabled ?? integration.enabled;

    if (enabled) {
      if (provider === 'twilio') {
        if (!accountSid || !authToken || !from) {
          throw new BadRequestException(
            'Twilio Account SID, Auth Token, and sender number are required',
          );
        }
        this.validateTwilioAccountSid(accountSid);
        this.validateSender(from);
      } else {
        if (!apiKey || !secretKey || !brandname) {
          throw new BadRequestException(
            'eSMS API Key, Secret Key, and registered Brandname are required',
          );
        }
      }
    }

    const updated = await this.integrations.update(shopId, {
      enabled,
      senderName:
        (provider === 'esms' ? brandname : from) || integration.senderName,
      configJson: {
        provider,
        twilioFrom: from,
        esmsBrandname: brandname,
        billingMode: 'merchant-direct',
      } as Prisma.InputJsonValue,
      encryptedSecretJson: this.secrets.encrypt({
        accountSid,
        authToken,
        apiKey,
        secretKey,
      }) as Prisma.InputJsonValue,
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

    if (!runtime.enabled || !runtime.configured) {
      throw new BadRequestException('Enable and save the SMS connection first');
    }

    const result = await this.smsProvider.verifyConnection(
      runtime.integrationConfig,
    );

    return { ok: true, provider: runtime.provider, ...result };
  }

  async isAvailable(shopId: number) {
    const runtime = await this.getRuntimeConfiguration(shopId);
    return runtime.enabled && runtime.configured;
  }

  async getRuntimeConfiguration(shopId: number) {
    const integration = await this.integrations.getOrCreate(shopId);
    const config = this.readConfig(integration.configJson);
    const provider = this.readProvider(config.provider);
    const storedSecrets = this.secrets.decrypt(integration.encryptedSecretJson);

    if (provider === 'esms') {
      const configured = Boolean(
        storedSecrets.apiKey && storedSecrets.secretKey && config.esmsBrandname,
      );
      const integrationConfig: SmsIntegrationConfig = {
        provider,
        apiKey: storedSecrets.apiKey,
        secretKey: storedSecrets.secretKey,
        brandname: config.esmsBrandname,
        billingMode: 'merchant-direct',
      };

      return {
        enabled: integration.enabled,
        configured,
        provider,
        integrationConfig,
      };
    }

    const from = config.twilioFrom || config.from;
    if (storedSecrets.accountSid && storedSecrets.authToken) {
      return {
        enabled: integration.enabled,
        configured: Boolean(from),
        provider,
        integrationConfig: {
          provider,
          from,
          accountSid: storedSecrets.accountSid,
          authToken: storedSecrets.authToken,
          billingMode: 'merchant-direct' as const,
        },
      };
    }

    const environmentConfigured = this.isEnvironmentProviderConfigured();
    return {
      enabled: integration.enabled || environmentConfigured,
      configured: environmentConfigured,
      provider,
      integrationConfig: {
        provider,
        from,
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
    const provider = this.readProvider(config.provider);
    const twilioFrom = config.twilioFrom || config.from || '';
    const configured =
      provider === 'esms'
        ? Boolean(
            storedSecrets.apiKey &&
              storedSecrets.secretKey &&
              config.esmsBrandname,
          )
        : Boolean(
            (storedSecrets.accountSid &&
              storedSecrets.authToken &&
              twilioFrom) ||
              this.isEnvironmentProviderConfigured(),
          );

    return {
      provider,
      enabled: integration.enabled && configured,
      configured,
      readyForLiveDelivery: integration.enabled && configured,
      from: twilioFrom,
      brandname: config.esmsBrandname || '',
      hasAccountSid: Boolean(storedSecrets.accountSid),
      hasAuthToken: Boolean(storedSecrets.authToken),
      hasApiKey: Boolean(storedSecrets.apiKey),
      hasSecretKey: Boolean(storedSecrets.secretKey),
      billingOwner: 'merchant' as const,
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
          availability: 'available',
          badge: 'new',
        },
      ],
    };
  }

  private readConfig(value: unknown): StoredSmsConfig {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }
    return value as StoredSmsConfig;
  }

  private readProvider(value: unknown): SmsProviderId {
    return value === 'esms' ? 'esms' : 'twilio';
  }

  private isEnvironmentProviderConfigured() {
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
