import { Injectable, Logger } from '@nestjs/common';

export type SmsIntegrationConfig = {
  mode?: string;
  from?: string;
  accountSid?: string;
  authToken?: string;
  billingMode?: 'platform' | 'merchant-direct';
};

export type SendSmsInput = {
  to: string;
  body: string;
  integrationConfig?: unknown;
};

export type SendSmsResult = {
  provider: string;
  providerMessageId?: string;
  segments: number;
  billingMode: 'platform' | 'merchant-direct';
};

@Injectable()
export class SmsProvider {
  private readonly logger = new Logger(SmsProvider.name);

  getProviderName(config: unknown) {
    return this.getMode(config) === 'twilio' ? 'TWILIO' : 'DEV_LOG';
  }

  async send(input: SendSmsInput): Promise<SendSmsResult> {
    const to = this.normalizePhone(input.to);
    const segments = this.countSegments(input.body);

    if (!to) {
      throw new Error('Missing valid customer phone recipient');
    }

    if (segments > 3) {
      throw new Error('SMS exceeds the maximum of 3 segments');
    }

    if (this.getMode(input.integrationConfig) === 'twilio') {
      return this.sendWithTwilio({ ...input, to }, segments);
    }

    this.logger.log(
      `[COD Guard] SMS queued via dev provider\nTo: ${this.maskPhone(to)}\nSegments: ${segments}\n${this.redactVerificationTokens(input.body)}`,
    );

    return {
      provider: 'DEV_LOG',
      providerMessageId: 'dev-sms-' + Date.now(),
      segments,
      billingMode:
        this.getConfig(input.integrationConfig).billingMode || 'platform',
    };
  }

  async verifyConnection(integrationConfig: unknown) {
    const config = this.getConfig(integrationConfig);
    const mode = this.getMode(integrationConfig);

    if (mode === 'dev-log') {
      return { ok: true };
    }

    if (mode !== 'twilio') {
      throw new Error('Unsupported SMS provider');
    }

    const accountSid = config.accountSid || process.env.TWILIO_ACCOUNT_SID;
    const authToken = config.authToken || process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
      throw new Error('Twilio credentials are required');
    }

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}.json`,
      {
        headers: {
          Authorization:
            'Basic ' +
            Buffer.from(accountSid + ':' + authToken).toString('base64'),
        },
      },
    );

    if (!response.ok) {
      throw new Error(
        response.status === 401
          ? 'Twilio rejected the credentials'
          : `Twilio connection check failed (${response.status})`,
      );
    }

    return { ok: true };
  }

  countSegments(body: string) {
    const unicode = /[^\x00-\x7F]/.test(body);
    const singleSegmentLimit = unicode ? 70 : 160;
    const concatenatedSegmentLimit = unicode ? 67 : 153;

    if (body.length <= singleSegmentLimit) {
      return 1;
    }

    return Math.ceil(body.length / concatenatedSegmentLimit);
  }

  private async sendWithTwilio(input: SendSmsInput, segments: number) {
    const config = this.getConfig(input.integrationConfig);
    const accountSid = config.accountSid || process.env.TWILIO_ACCOUNT_SID;
    const authToken = config.authToken || process.env.TWILIO_AUTH_TOKEN;
    const from = config.from || process.env.TWILIO_FROM;

    if (!accountSid || !authToken || !from) {
      throw new Error(
        'TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM are required',
      );
    }

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization:
            'Basic ' +
            Buffer.from(accountSid + ':' + authToken).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: input.to,
          From: from,
          Body: input.body,
        }),
      },
    );
    const responseText = await response.text();
    const payload = this.parseJson(responseText) as {
      sid?: string;
      code?: number;
    };

    if (!response.ok) {
      throw new Error(
        `Twilio SMS request failed (${response.status}${payload.code ? `, code ${payload.code}` : ''})`,
      );
    }

    return {
      provider: 'TWILIO',
      providerMessageId: payload.sid,
      segments,
      billingMode: config.billingMode || 'platform',
    };
  }

  private normalizePhone(value: string) {
    const compact = value.trim().replace(/[\s().-]/g, '');

    if (/^\+?[1-9]\d{7,14}$/.test(compact)) {
      return compact.startsWith('+') ? compact : '+' + compact;
    }

    if (/^0\d{8,10}$/.test(compact)) {
      return '+84' + compact.slice(1);
    }

    return null;
  }

  private getMode(config: unknown) {
    return (
      this.getConfig(config).mode ||
      process.env.SMS_PROVIDER ||
      'dev-log'
    ).toLowerCase();
  }

  private getConfig(config: unknown): SmsIntegrationConfig {
    if (!config || typeof config !== 'object' || Array.isArray(config)) {
      return {};
    }

    return config as SmsIntegrationConfig;
  }

  private parseJson(value: string) {
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }

  private maskPhone(phone: string) {
    return phone.slice(0, 4) + '***' + phone.slice(-3);
  }

  private redactVerificationTokens(value: string) {
    return value.replace(
      /\/(?:api\/)?verify\/[^\s"'<>?]+/g,
      '/verify/[redacted-token]',
    );
  }
}
