import { Injectable, Logger } from '@nestjs/common';

export type SendEmailInput = {
  to: string;
  subject: string;
  body: string;
  fromName?: string | null;
};

export type SendEmailResult = {
  providerMessageId?: string;
  delivered?: boolean;
};

@Injectable()
export class EmailProvider {
  private readonly logger = new Logger(EmailProvider.name);

  async send(input: SendEmailInput): Promise<SendEmailResult> {
    if (!input.to || !input.to.includes('@')) {
      throw new Error('Missing valid customer email recipient');
    }

    const providerMessageId = 'dev-email-' + Date.now();

    this.logger.log(
      [
        '[VN-Cod-Guard] Email verification queued via dev provider',
        'To: ' + input.to,
        'Subject: ' + input.subject,
        input.body,
      ].join('\n'),
    );

    return {
      providerMessageId,
      delivered: true,
    };
  }
}
