import { Injectable, Logger } from '@nestjs/common';

export type EmailIntegrationConfig = {
  mode?: string;
  fromEmail?: string;
  replyTo?: string;
};

export type SendEmailInput = {
  to: string;
  subject: string;
  body: string;
  html?: string;
  fromName?: string | null;
  integrationConfig?: unknown;
};

export type SendEmailResult = {
  provider: string;
  providerMessageId?: string;
  delivered?: boolean;
};

@Injectable()
export class EmailProvider {
  private readonly logger = new Logger(EmailProvider.name);

  getProviderName(config: unknown) {
    return this.getMode(config) === 'resend' ? 'RESEND' : 'DEV_LOG';
  }

  async send(input: SendEmailInput): Promise<SendEmailResult> {
    if (!input.to || !input.to.includes('@')) {
      throw new Error('Missing valid customer email recipient');
    }

    if (this.getMode(input.integrationConfig) === 'resend') {
      return this.sendWithResend(input);
    }

    return this.sendWithDevLog(input);
  }

  private async sendWithResend(input: SendEmailInput) {
    const apiKey = process.env.RESEND_API_KEY;
    const config = this.getConfig(input.integrationConfig);
    const fromEmail = config.fromEmail || process.env.EMAIL_FROM;
    const replyTo = config.replyTo || process.env.EMAIL_REPLY_TO;

    if (!apiKey) {
      throw new Error('RESEND_API_KEY is required when EMAIL_PROVIDER=resend');
    }

    if (!fromEmail) {
      throw new Error('EMAIL_FROM is required when EMAIL_PROVIDER=resend');
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.formatFromAddress(input.fromName, fromEmail),
        to: [input.to],
        subject: input.subject,
        text: input.body,
        html: input.html,
        reply_to: replyTo || undefined,
      }),
    });

    const responseText = await response.text();

    if (!response.ok) {
      throw new Error('Resend email failed: ' + responseText);
    }

    const payload = this.parseJson(responseText) as { id?: string };

    this.logger.log(
      'Verification email sent via Resend to ' + this.maskEmail(input.to),
    );

    return {
      provider: 'RESEND',
      providerMessageId: payload.id,
      delivered: false,
    };
  }

  private sendWithDevLog(input: SendEmailInput): SendEmailResult {
    const providerMessageId = 'dev-email-' + Date.now();

    this.logger.log(
      [
        '[Vietnam COD Guard] Email verification queued via dev provider',
        'To: ' + input.to,
        'Subject: ' + input.subject,
        input.html ? 'HTML:\n' + this.redactVerificationTokens(input.html) : '',
        'Text:',
        this.redactVerificationTokens(input.body),
      ]
        .filter(Boolean)
        .join('\n'),
    );

    return {
      provider: 'DEV_LOG',
      providerMessageId,
      delivered: true,
    };
  }

  private getMode(config: unknown) {
    const configuredMode =
      process.env.EMAIL_PROVIDER || this.getConfig(config).mode;

    if (configuredMode) {
      return configuredMode.toLowerCase();
    }

    return process.env.RESEND_API_KEY ? 'resend' : 'dev-log';
  }

  private getConfig(config: unknown): EmailIntegrationConfig {
    if (!config || typeof config !== 'object' || Array.isArray(config)) {
      return {};
    }

    return config as EmailIntegrationConfig;
  }

  private formatFromAddress(fromName: string | null | undefined, from: string) {
    if (!fromName || from.includes('<')) {
      return from;
    }

    return fromName + ' <' + from + '>';
  }

  private parseJson(value: string) {
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }

  private maskEmail(email: string) {
    const [localPart, domain] = email.split('@');

    if (!localPart || !domain) {
      return '[redacted-email]';
    }

    return localPart.slice(0, 2) + '***@' + domain;
  }

  private redactVerificationTokens(value: string) {
    return value.replace(
      /\/(?:api\/)?verify\/[^\\s"'<>?]+/g,
      '/verify/[redacted-token]',
    );
  }
}
