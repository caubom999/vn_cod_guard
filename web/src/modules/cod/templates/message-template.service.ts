import { BadRequestException, Injectable } from '@nestjs/common';
import { MessagingRepository } from '../messaging/messaging.repository';
import { MessageTemplateRepository } from './message-template.repository';

export type UpdateMessageTemplateDto = {
  subject?: string | null;
  body?: string;
  enabled?: boolean;
};

@Injectable()
export class MessageTemplateService {
  constructor(
    private readonly templates: MessageTemplateRepository,
    private readonly messaging: MessagingRepository,
  ) {}

  async list(shopId: number) {
    await this.messaging.getOrCreateVerificationEmailTemplate(shopId);
    return this.templates.list(shopId);
  }

  update(id: number, shopId: number, dto: UpdateMessageTemplateDto) {
    const data: UpdateMessageTemplateDto = {};

    if (dto.subject !== undefined) {
      data.subject =
        typeof dto.subject === 'string' ? dto.subject.trim() : null;
    }

    if (dto.body !== undefined) {
      if (typeof dto.body !== 'string' || !dto.body.trim()) {
        throw new BadRequestException('Template body is required');
      }

      data.body = dto.body;
    }

    if (dto.enabled !== undefined) {
      if (typeof dto.enabled !== 'boolean') {
        throw new BadRequestException('enabled must be boolean');
      }

      data.enabled = dto.enabled;
    }

    return this.templates.update(id, shopId, data);
  }
}
