import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ShopModule } from '../shop/shop.module';
import { ShopifyModule } from '../shopify/shopify.module';
import { AutomationRepository } from './automation/automation.repository';
import { AutomationService } from './automation/automation.service';
import { MessagingRepository } from './messaging/messaging.repository';
import { MessagingService } from './messaging/messaging.service';
import { MessageTemplateRenderer } from './messaging/message-template.renderer';
import { EmailProvider } from './messaging/providers/email.provider';
import { CodOrderProcessorService } from './orders/cod-order-processor.service';
import { CodSettingsController } from './settings/cod-settings.controller';
import { CodSettingsRepository } from './settings/cod-settings.repository';
import { CodSettingsService } from './settings/cod-settings.service';
import { CodOrderRepository } from './orders/cod-order.repository';
import { RiskController } from './risk/risk.controller';
import { RiskRepository } from './risk/risk.repository';
import { RiskService } from './risk/risk.service';
import { VerificationController } from './verification/verification.controller';
import { VerificationRepository } from './verification/verification.repository';
import { VerificationService } from './verification/verification.service';

@Module({
  imports: [PrismaModule, ShopModule, ShopifyModule],
  controllers: [VerificationController, CodSettingsController, RiskController],
  providers: [
    AutomationService,
    AutomationRepository,
    MessagingRepository,
    MessagingService,
    MessageTemplateRenderer,
    EmailProvider,
    RiskService,
    RiskRepository,
    CodOrderProcessorService,
    CodOrderRepository,
    CodSettingsService,
    CodSettingsRepository,
    VerificationService,
    VerificationRepository,
  ],
  exports: [CodOrderProcessorService, VerificationService],
})
export class CodModule {}
