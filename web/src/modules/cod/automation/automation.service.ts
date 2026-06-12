import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import {
  AutomationJobType,
  CodAutomationJob,
  CodOrderStatus,
  CodShopSetting,
  Prisma,
  VerificationSessionStatus,
} from '@prisma/client';
import { ShopifyService } from '../../shopify/shopify.service';
import { COD_DEFAULT_TAGS } from '../cod.constants';
import { VerificationService } from '../verification/verification.service';
import { AutomationRepository } from './automation.repository';

const ACTIVE_ORDER_STATUSES: CodOrderStatus[] = [
  CodOrderStatus.PENDING,
  CodOrderStatus.NEEDS_REVIEW,
];

@Injectable()
export class AutomationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AutomationService.name);
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(
    private readonly automation: AutomationRepository,
    private readonly verifications: VerificationService,
    private readonly shopify: ShopifyService,
  ) {}

  onModuleInit() {
    if (process.env.COD_AUTOMATION_WORKER_ENABLED === 'false') {
      this.logger.log('COD automation worker disabled by env.');
      return;
    }

    this.timer = setInterval(() => {
      void this.processDueJobs();
    }, this.getPollIntervalMs());

    void this.processDueJobs();
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  async scheduleInitialJobs(input: {
    codOrderId: number;
    expiresAt: Date;
    setting: CodShopSetting;
  }) {
    await this.automation.cancelScheduledJobsForOrder(input.codOrderId);

    const reminderRunAt = this.addMinutes(
      new Date(),
      input.setting.reminderDelayMinutes,
    );

    if (
      input.setting.maxReminders > 0 &&
      reminderRunAt.getTime() < input.expiresAt.getTime()
    ) {
      await this.automation.createJob({
        codOrderId: input.codOrderId,
        type: AutomationJobType.SEND_REMINDER,
        runAt: reminderRunAt,
      });
    }

    await this.automation.createJob({
      codOrderId: input.codOrderId,
      type: AutomationJobType.EXPIRE_ORDER,
      runAt: input.expiresAt,
    });

    if (input.setting.autoCancelUnconfirmed) {
      await this.automation.createJob({
        codOrderId: input.codOrderId,
        type: AutomationJobType.AUTO_CANCEL_ORDER,
        runAt: input.expiresAt,
      });
    }

    await this.automation.createEvent({
      codOrderId: input.codOrderId,
      type: 'AUTOMATION_JOBS_SCHEDULED',
      message:
        'COD automation jobs scheduled for reminder, expiry, and optional auto cancel.',
      metadataJson: {
        expiresAt: input.expiresAt,
        reminderDelayMinutes: input.setting.reminderDelayMinutes,
        maxReminders: input.setting.maxReminders,
        autoCancelUnconfirmed: input.setting.autoCancelUnconfirmed,
      } as Prisma.InputJsonValue,
    });
  }

  async processDueJobs() {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    try {
      const jobs = await this.automation.findDueJobs(10);

      for (const job of jobs) {
        await this.processJob(job);
      }
    } finally {
      this.isRunning = false;
    }
  }

  private async processJob(job: CodAutomationJob) {
    const claimed = await this.automation.claimJob(job.id);

    if (!claimed) {
      return;
    }

    const attempts = job.attempts + 1;

    try {
      if (job.type === AutomationJobType.SEND_REMINDER) {
        await this.handleSendReminder(job);
      } else if (job.type === AutomationJobType.EXPIRE_ORDER) {
        await this.handleExpireOrder(job);
      } else if (job.type === AutomationJobType.AUTO_CANCEL_ORDER) {
        await this.handleAutoCancelOrder(job);
      }

      await this.automation.markJobDone(job.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      this.logger.warn('COD automation job ' + job.id + ' failed: ' + message);
      await this.automation.markJobFailed(job.id, attempts, message);
    }
  }

  private async handleSendReminder(job: CodAutomationJob) {
    const order = await this.automation.findOrderForJob(job.codOrderId);

    if (!order) {
      await this.automation.markJobCancelled(job.id, 'Order not found');
      return;
    }

    const setting = order.shop.codSetting;

    if (!setting?.enabled) {
      await this.automation.markJobCancelled(job.id, 'COD Guard disabled');
      return;
    }

    if (!ACTIVE_ORDER_STATUSES.includes(order.status)) {
      await this.automation.markJobCancelled(
        job.id,
        'Order is no longer pending',
      );
      return;
    }

    if (!order.expiresAt || order.expiresAt.getTime() <= Date.now()) {
      await this.automation.markJobCancelled(
        job.id,
        'Order is already expired',
      );
      return;
    }

    if (order.reminderCount >= setting.maxReminders) {
      await this.automation.markJobCancelled(job.id, 'Max reminders reached');
      return;
    }

    const { session } = await this.verifications.createSessionForOrder({
      codOrderId: order.id,
      expiresAt: order.expiresAt,
      channel: setting.defaultChannel,
    });

    const updatedOrder = await this.automation.incrementReminderCount(order.id);

    await this.automation.createEvent({
      codOrderId: order.id,
      verificationSessionId: session.id,
      type: 'REMINDER_SENT',
      message:
        'COD verification reminder sent with a fresh verification token.',
      metadataJson: {
        reminderCount: updatedOrder.reminderCount,
        maxReminders: setting.maxReminders,
      } as Prisma.InputJsonValue,
    });

    const nextRunAt = this.addMinutes(new Date(), setting.reminderDelayMinutes);

    if (
      updatedOrder.reminderCount < setting.maxReminders &&
      nextRunAt.getTime() < order.expiresAt.getTime()
    ) {
      await this.automation.createFollowUpReminder(order.id, nextRunAt);
    }
  }

  private async handleExpireOrder(job: CodAutomationJob) {
    const order = await this.automation.findOrderForJob(job.codOrderId);

    if (!order) {
      await this.automation.markJobCancelled(job.id, 'Order not found');
      return;
    }

    if (!ACTIVE_ORDER_STATUSES.includes(order.status)) {
      await this.automation.markJobCancelled(
        job.id,
        'Order is no longer pending',
      );
      return;
    }

    const now = new Date();

    if (order.expiresAt && order.expiresAt.getTime() > now.getTime()) {
      throw new Error('Expire job ran before order deadline');
    }

    await this.automation.updateActiveSessionsStatus(
      order.id,
      VerificationSessionStatus.EXPIRED,
    );

    await this.automation.updateOrderStatus(order.id, CodOrderStatus.EXPIRED);

    await this.automation.createEvent({
      codOrderId: order.id,
      verificationSessionId: order.sessions[0]?.id,
      type: 'ORDER_EXPIRED_BY_WORKER',
      message:
        'COD order expired because customer did not confirm before deadline.',
    });

    await this.syncShopifyExpiredTags(order);
  }

  private async handleAutoCancelOrder(job: CodAutomationJob) {
    const order = await this.automation.findOrderForJob(job.codOrderId);

    if (!order) {
      await this.automation.markJobCancelled(job.id, 'Order not found');
      return;
    }

    const setting = order.shop.codSetting;

    if (!setting?.autoCancelUnconfirmed) {
      await this.automation.markJobCancelled(job.id, 'Auto cancel disabled');
      return;
    }

    if (
      order.status !== CodOrderStatus.EXPIRED &&
      !ACTIVE_ORDER_STATUSES.includes(order.status)
    ) {
      await this.automation.markJobCancelled(
        job.id,
        'Order is no longer cancellable',
      );
      return;
    }

    if (ACTIVE_ORDER_STATUSES.includes(order.status)) {
      await this.handleExpireOrder(job);
    }

    await this.cancelShopifyOrder(order.shop.domain, order.shopifyOrderGid);

    await this.automation.updateOrderStatus(
      order.id,
      CodOrderStatus.CANCELLED_BY_CUSTOMER,
      { cancelledAt: new Date() },
    );

    await this.automation.createEvent({
      codOrderId: order.id,
      verificationSessionId: order.sessions[0]?.id,
      type: 'ORDER_AUTO_CANCELLED',
      message:
        'COD order was automatically cancelled on Shopify after verification deadline.',
    });

    await this.syncShopifyAutoCancelledTags(order);
  }

  private async syncShopifyExpiredTags(
    order: NonNullable<
      Awaited<ReturnType<AutomationRepository['findOrderForJob']>>
    >,
  ) {
    const setting = order.shop.codSetting;
    const pendingTag = setting?.pendingTag || COD_DEFAULT_TAGS.pending;
    const riskTag = setting?.riskTag || COD_DEFAULT_TAGS.risky;
    const expiredTag = setting?.expiredTag || COD_DEFAULT_TAGS.noResponse;

    await this.removeTags(order.shop.domain, order.shopifyOrderGid, [
      pendingTag,
      riskTag,
    ]);
    await this.addTags(order.shop.domain, order.shopifyOrderGid, [expiredTag]);
  }

  private async syncShopifyAutoCancelledTags(
    order: NonNullable<
      Awaited<ReturnType<AutomationRepository['findOrderForJob']>>
    >,
  ) {
    const setting = order.shop.codSetting;
    const expiredTag = setting?.expiredTag || COD_DEFAULT_TAGS.noResponse;
    const cancelledTag = setting?.cancelledTag || COD_DEFAULT_TAGS.cancelled;

    await this.removeTags(order.shop.domain, order.shopifyOrderGid, [
      expiredTag,
    ]);
    await this.addTags(order.shop.domain, order.shopifyOrderGid, [
      cancelledTag,
    ]);
  }

  private async cancelShopifyOrder(
    shopDomain: string,
    shopifyOrderGid: string,
  ) {
    const response = (await this.shopify.graphql(
      shopDomain,
      [
        'mutation CancelCodOrder($orderId: ID!) {',
        '  orderCancel(',
        '    orderId: $orderId,',
        '    reason: CUSTOMER,',
        '    restock: true,',
        '    notifyCustomer: false,',
        '    refund: false',
        '  ) {',
        '    job { id }',
        '    userErrors { field message }',
        '  }',
        '}',
      ].join('\n'),
      { orderId: shopifyOrderGid },
    )) as {
      data?: { orderCancel?: { userErrors?: Array<{ message: string }> } };
    };

    const userErrors = response.data?.orderCancel?.userErrors || [];

    if (userErrors.length) {
      throw new Error(userErrors.map((error) => error.message).join('; '));
    }
  }

  private async addTags(shopDomain: string, orderGid: string, tags: string[]) {
    await this.shopify.graphql(
      shopDomain,
      [
        'mutation AddCodAutomationTags($id: ID!, $tags: [String!]!) {',
        '  tagsAdd(id: $id, tags: $tags) {',
        '    userErrors { field message }',
        '  }',
        '}',
      ].join('\n'),
      { id: orderGid, tags },
    );
  }

  private async removeTags(
    shopDomain: string,
    orderGid: string,
    tags: string[],
  ) {
    await this.shopify.graphql(
      shopDomain,
      [
        'mutation RemoveCodAutomationTags($id: ID!, $tags: [String!]!) {',
        '  tagsRemove(id: $id, tags: $tags) {',
        '    userErrors { field message }',
        '  }',
        '}',
      ].join('\n'),
      { id: orderGid, tags },
    );
  }

  private getPollIntervalMs() {
    return Number(process.env.COD_AUTOMATION_WORKER_INTERVAL_MS || 30000);
  }

  private addMinutes(date: Date, minutes: number) {
    return new Date(date.getTime() + minutes * 60 * 1000);
  }
}
