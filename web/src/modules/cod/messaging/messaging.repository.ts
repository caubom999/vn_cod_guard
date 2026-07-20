import { Injectable } from '@nestjs/common';
import {
  ChannelIntegrationProvider,
  MessageDeliveryStatus,
  MessageTemplateType,
  Prisma,
  VerificationChannel,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  DEFAULT_MESSAGE_LOCALE,
  DEFAULT_VERIFICATION_EMAIL_TEMPLATE,
  DEFAULT_VERIFICATION_SMS_TEMPLATE,
} from './messaging.constants';

@Injectable()
export class MessagingRepository {
  constructor(private readonly prisma: PrismaService) {}

  findSessionForMessage(verificationSessionId: number) {
    return this.prisma.verificationSession.findUnique({
      where: { id: verificationSessionId },
      include: {
        codOrder: {
          include: {
            shop: {
              include: {
                codSetting: true,
              },
            },
          },
        },
      },
    });
  }

  getOrCreateVerificationEmailTemplate(shopId: number) {
    return this.prisma.codMessageTemplate.upsert({
      where: {
        shopId_type_channel_locale: {
          shopId,
          type: MessageTemplateType.VERIFICATION,
          channel: VerificationChannel.EMAIL,
          locale: DEFAULT_MESSAGE_LOCALE,
        },
      },
      update: {},
      create: {
        shopId,
        ...DEFAULT_VERIFICATION_EMAIL_TEMPLATE,
      },
    });
  }

  getOrCreateVerificationSmsTemplate(shopId: number) {
    return this.prisma.codMessageTemplate.upsert({
      where: {
        shopId_type_channel_locale: {
          shopId,
          type: MessageTemplateType.VERIFICATION,
          channel: VerificationChannel.SMS,
          locale: DEFAULT_MESSAGE_LOCALE,
        },
      },
      update: {},
      create: {
        shopId,
        ...DEFAULT_VERIFICATION_SMS_TEMPLATE,
      },
    });
  }

  getOrCreateSmsIntegration(shopId: number) {
    return this.prisma.codChannelIntegration.upsert({
      where: {
        shopId_provider: {
          shopId,
          provider: ChannelIntegrationProvider.SMS,
        },
      },
      update: { enabled: true },
      create: {
        shopId,
        provider: ChannelIntegrationProvider.SMS,
        enabled: true,
        senderName: 'COD Guard',
        configJson: { mode: 'dev-log' },
      },
    });
  }

  getOrCreateEmailIntegration(shopId: number) {
    return this.prisma.codChannelIntegration.upsert({
      where: {
        shopId_provider: {
          shopId,
          provider: ChannelIntegrationProvider.EMAIL,
        },
      },
      update: {},
      create: {
        shopId,
        provider: ChannelIntegrationProvider.EMAIL,
        enabled: true,
        senderName: 'Vietnam COD Guard',
        configJson: { mode: 'dev-log' },
      },
    });
  }

  createDelivery(data: Prisma.CodMessageDeliveryUncheckedCreateInput) {
    return this.prisma.codMessageDelivery.create({ data });
  }

  markDeliverySent(
    id: number,
    data: {
      providerMessageId?: string;
      delivered?: boolean;
    } = {},
  ) {
    const now = new Date();

    return this.prisma.codMessageDelivery.update({
      where: { id },
      data: {
        status: data.delivered
          ? MessageDeliveryStatus.DELIVERED
          : MessageDeliveryStatus.SENT,
        providerMessageId: data.providerMessageId,
        sentAt: now,
        deliveredAt: data.delivered ? now : undefined,
      },
    });
  }

  markDeliveryFailed(id: number, error: string) {
    return this.prisma.codMessageDelivery.update({
      where: { id },
      data: {
        status: MessageDeliveryStatus.FAILED,
        error,
      },
    });
  }

  markSessionSent(verificationSessionId: number) {
    return this.prisma.verificationSession.update({
      where: { id: verificationSessionId },
      data: {
        lastSentAt: new Date(),
      },
    });
  }

  createEvent(data: Prisma.CodVerificationEventUncheckedCreateInput) {
    return this.prisma.codVerificationEvent.create({ data });
  }
}
