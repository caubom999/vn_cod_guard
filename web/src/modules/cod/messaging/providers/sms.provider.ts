import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';

export type SmsIntegrationConfig = {
  provider?: 'twilio' | 'esms';
  from?: string;
  accountSid?: string;
  authToken?: string;
  apiKey?: string;
  secretKey?: string;
  brandname?: string;
  sandbox?: boolean;
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
  getProviderName(config: unknown) {
    return this.getConfig(config).provider === 'esms' ? 'ESMS' : 'TWILIO';
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

    const config = this.getConfig(input.integrationConfig);
    return config.provider === 'esms'
      ? this.sendWithEsms({ ...input, to }, segments)
      : this.sendWithTwilio({ ...input, to }, segments);
  }

  async verifyConnection(integrationConfig: unknown) {
    const config = this.getConfig(integrationConfig);
    if (config.provider === 'esms') {
      return this.verifyEsmsConnection(config);
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

  private async sendWithEsms(input: SendSmsInput, segments: number) {
    const config = this.getConfig(input.integrationConfig);
    const apiKey = config.apiKey;
    const secretKey = config.secretKey;
    const brandname = config.brandname;
    const phone = this.toEsmsPhone(input.to);

    if (!apiKey || !secretKey || !brandname) {
      throw new Error(
        'eSMS API Key, Secret Key, and registered Brandname are required',
      );
    }

    if (!phone) {
      throw new Error('eSMS Vietnam only supports Vietnamese phone numbers');
    }

    const response = await fetch(
      'https://rest.esms.vn/MainService.svc/json/SendMultipleMessage_V4_post_json/',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ApiKey: apiKey,
          SecretKey: secretKey,
          Content: input.body,
          Phone: phone,
          Brandname: brandname,
          SmsType: '2',
          IsUnicode: /[^\x00-\x7F]/.test(input.body) ? '1' : '0',
          Sandbox: config.sandbox ? '1' : '0',
          RequestId: this.createEsmsRequestId(),
        }),
      },
    );
    const payload = this.parseJson(await response.text()) as {
      CodeResult?: string | number;
      SMSID?: string;
      ErrorMessage?: string;
    };
    const resultCode = this.readCode(payload.CodeResult);

    if (!response.ok || resultCode !== '100') {
      throw new Error(
        this.formatEsmsError(resultCode, payload.ErrorMessage, response.status),
      );
    }

    return {
      provider: 'ESMS',
      providerMessageId: payload.SMSID,
      segments,
      billingMode: config.billingMode || 'merchant-direct',
    };
  }

  private async verifyEsmsConnection(config: SmsIntegrationConfig) {
    if (!config.apiKey || !config.secretKey || !config.brandname) {
      throw new Error(
        'eSMS API Key, Secret Key, and registered Brandname are required',
      );
    }

    const response = await fetch(
      'https://rest.esms.vn/MainService.svc/json/GetBalance_json',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ApiKey: config.apiKey,
          SecretKey: config.secretKey,
        }),
      },
    );
    const payload = this.parseJson(await response.text()) as {
      CodeResponse?: string | number;
      Balance?: number | string;
      ErrorMessage?: string;
    };
    const responseCode = this.readCode(payload.CodeResponse);

    if (!response.ok || responseCode !== '100') {
      throw new Error(
        this.formatEsmsError(
          responseCode,
          payload.ErrorMessage,
          response.status,
        ),
      );
    }

    const balance = Number(payload.Balance);
    return { balance: Number.isFinite(balance) ? balance : undefined };
  }

  private toEsmsPhone(value: string) {
    if (!/^\+84\d{9,10}$/.test(value)) {
      return null;
    }
    return '0' + value.slice(3);
  }

  private createEsmsRequestId() {
    return `cod-${Date.now()}-${randomBytes(4).toString('hex')}`;
  }

  private readCode(value: unknown) {
    return value === undefined || value === null ? undefined : String(value);
  }

  private formatEsmsError(
    code?: string,
    providerMessage?: string,
    status?: number,
  ) {
    const knownMessages: Record<string, string> = {
      '101': 'eSMS rejected the API Key or Secret Key',
      '102': 'eSMS has no pricing configured for this account',
      '103': 'The eSMS account balance is insufficient',
      '104': 'The registered eSMS Brandname is missing or invalid',
      '108': 'eSMS rejected the destination phone number',
      '118': 'The eSMS account cannot use this message type',
      '124': 'eSMS rejected a duplicate request ID',
      '140': 'The server IP is not allowed by eSMS',
      '146': 'The SMS content does not match an approved eSMS template',
      '177': 'The eSMS account is not registered for this mobile network',
    };
    const detail =
      (code && knownMessages[code]) ||
      providerMessage ||
      'eSMS rejected the request';
    return `${detail}${code ? ` (code ${code})` : status ? ` (HTTP ${status})` : ''}`;
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
}
