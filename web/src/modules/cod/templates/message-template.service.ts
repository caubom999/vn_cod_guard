import { BadRequestException, Injectable } from '@nestjs/common';
import { VerificationChannel } from '@prisma/client';
import { MessagingRepository } from '../messaging/messaging.repository';
import { MessageTemplateRepository } from './message-template.repository';

export type UpdateMessageTemplateDto = {
  subject?: string | null;
  body?: string;
  enabled?: boolean;
  templateKey?: string;
};

const AVAILABLE_MESSAGE_TEMPLATE_KEYS = new Set([
  'template-1',
  'template-2',
  'template-3',
]);

@Injectable()
export class MessageTemplateService {
  constructor(
    private readonly templates: MessageTemplateRepository,
    private readonly messaging: MessagingRepository,
  ) {}

  async list(shopId: number) {
    await this.messaging.getOrCreateVerificationEmailTemplate(shopId);
    await this.messaging.getOrCreateVerificationSmsTemplate(shopId);
    const templates = await this.templates.list(shopId);

    return Promise.all(
      templates.map(async (template) => {
        const sanitizedBody = this.removeLegacyVerificationUrlLines(
          template.body,
        );

        if (sanitizedBody === template.body) {
          return template;
        }

        return this.templates.update(template.id, shopId, {
          body: sanitizedBody,
        });
      }),
    );
  }

  async update(id: number, shopId: number, dto: UpdateMessageTemplateDto) {
    const existing = await this.templates.findById(id, shopId);

    if (!existing) {
      throw new BadRequestException('Message template not found');
    }

    const data: UpdateMessageTemplateDto = {};

    if (dto.subject !== undefined) {
      data.subject =
        typeof dto.subject === 'string' ? dto.subject.trim() : null;
    }

    if (dto.body !== undefined) {
      if (typeof dto.body !== 'string' || !dto.body.trim()) {
        throw new BadRequestException('Template body is required');
      }

      if (
        existing.channel === VerificationChannel.SMS &&
        dto.body.length > 320
      ) {
        throw new BadRequestException(
          'Template body must be 320 characters or fewer',
        );
      }

      data.body = this.removeLegacyVerificationUrlLines(dto.body);
    }

    if (dto.enabled !== undefined) {
      if (typeof dto.enabled !== 'boolean') {
        throw new BadRequestException('enabled must be boolean');
      }

      data.enabled = dto.enabled;
    }

    if (dto.templateKey !== undefined) {
      if (!AVAILABLE_MESSAGE_TEMPLATE_KEYS.has(dto.templateKey)) {
        throw new BadRequestException('Unsupported message template');
      }

      data.templateKey = dto.templateKey;
    }

    return this.templates.update(id, shopId, data);
  }

  private removeLegacyVerificationUrlLines(body: string) {
    return body
      .split('\n')
      .filter((line) => {
        const normalized = line.trim().toLowerCase();

        return (
          !normalized.includes('{{verificationurl}}') &&
          !normalized.includes('verificationurl') &&
          !normalized.includes('link sau') &&
          !normalized.includes('link xác nhận') &&
          !normalized.includes('link xac nhan')
        );
      })
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
}
