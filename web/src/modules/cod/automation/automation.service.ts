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
import {
  ADD_SHOPIFY_TAGS,
  CANCEL_SHOPIFY_ORDER,
  REMOVE_SHOPIFY_TAGS,
} from '../../graphql/mutation/order.mutation';
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
      const staleRunningBefore = this.getStaleRunningBefore();
      const jobs = await this.automation.findDueJobs(
        this.getBatchSize(),
        staleRunningBefore,
      );

      for (const job of jobs) {
        await this.processJob(job, staleRunningBefore);
      }
    } catch (error) {
      this.logger.error(
        'COD automation worker failed: ' + this.getErrorMessage(error),
      );
    } finally {
      this.isRunning = false;
    }
  }

  private async processJob(job: CodAutomationJob, staleRunningBefore: Date) {
    const claimed = await this.automation.claimJob(job.id, staleRunningBefore);

    if (!claimed) {
      return;
    }

    const attempts = claimed.attempts;

    try {
      if (claimed.type === AutomationJobType.SEND_REMINDER) {
        await this.handleSendReminder(claimed, attempts);
      } else if (claimed.type === AutomationJobType.EXPIRE_ORDER) {
        await this.handleExpireOrder(claimed, attempts);
      } else if (claimed.type === AutomationJobType.AUTO_CANCEL_ORDER) {
        await this.handleAutoCancelOrder(claimed, attempts);
      }

      await this.automation.markJobDone(claimed.id, attempts);
    } catch (error) {
      const message = this.getErrorMessage(error);

      this.logger.warn(
        'COD automation job ' + claimed.id + ' failed: ' + message,
      );
      await this.automation.markJobFailed({
        id: claimed.id,
        attempts,
        error: message,
        maxAttempts: this.getMaxAttempts(),
        retryDelayMs: this.getRetryDelayMs(attempts),
      });
    }
  }

  private async handleSendReminder(job: CodAutomationJob, attempts: number) {
    const order = await this.automation.findOrderForJob(job.codOrderId);

    if (!order) {
      await this.automation.markJobCancelled(
        job.id,
        'Order not found',
        attempts,
      );
      return;
    }

    const setting = order.shop.codSetting;

    if (!setting?.enabled) {
      await this.automation.markJobCancelled(
        job.id,
        'COD Guard disabled',
        attempts,
      );
      return;
    }

    if (!ACTIVE_ORDER_STATUSES.includes(order.status)) {
      await this.automation.markJobCancelled(
        job.id,
        'Order is no longer pending',
        attempts,
      );
      return;
    }

    if (!order.expiresAt || order.expiresAt.getTime() <= Date.now()) {
      await this.automation.markJobCancelled(
        job.id,
        'Order is already expired',
        attempts,
      );
      return;
    }

    if (order.reminderCount >= setting.maxReminders) {
      await this.automation.markJobCancelled(
        job.id,
        'Max reminders reached',
        attempts,
      );
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

  private async handleExpireOrder(job: CodAutomationJob, attempts: number) {
    const order = await this.automation.findOrderForJob(job.codOrderId);

    if (!order) {
      await this.automation.markJobCancelled(
        job.id,
        'Order not found',
        attempts,
      );
      return;
    }

    if (!ACTIVE_ORDER_STATUSES.includes(order.status)) {
      await this.automation.markJobCancelled(
        job.id,
        'Order is no longer pending',
        attempts,
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

  private async handleAutoCancelOrder(job: CodAutomationJob, attempts: number) {
    const order = await this.automation.findOrderForJob(job.codOrderId);

    if (!order) {
      await this.automation.markJobCancelled(
        job.id,
        'Order not found',
        attempts,
      );
      return;
    }

    const setting = order.shop.codSetting;

    if (!setting?.autoCancelUnconfirmed) {
      await this.automation.markJobCancelled(
        job.id,
        'Auto cancel disabled',
        attempts,
      );
      return;
    }

    if (
      order.status !== CodOrderStatus.EXPIRED &&
      !ACTIVE_ORDER_STATUSES.includes(order.status)
    ) {
      await this.automation.markJobCancelled(
        job.id,
        'Order is no longer cancellable',
        attempts,
      );
      return;
    }

    if (ACTIVE_ORDER_STATUSES.includes(order.status)) {
      await this.handleExpireOrder(job, attempts);
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
      CANCEL_SHOPIFY_ORDER,
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
    await this.shopify.graphql(shopDomain, ADD_SHOPIFY_TAGS, {
      id: orderGid,
      tags,
    });
  }

  private async removeTags(
    shopDomain: string,
    orderGid: string,
    tags: string[],
  ) {
    await this.shopify.graphql(shopDomain, REMOVE_SHOPIFY_TAGS, {
      id: orderGid,
      tags,
    });
  }

  private getPollIntervalMs() {
    return this.getPositiveIntegerEnv(
      'COD_AUTOMATION_WORKER_INTERVAL_MS',
      30000,
    );
  }

  private getBatchSize() {
    return this.getPositiveIntegerEnv('COD_AUTOMATION_WORKER_BATCH_SIZE', 10);
  }

  private getMaxAttempts() {
    return this.getPositiveIntegerEnv('COD_AUTOMATION_WORKER_MAX_ATTEMPTS', 3);
  }

  private getStaleRunningBefore() {
    return new Date(Date.now() - this.getStaleRunningMs());
  }

  private getStaleRunningMs() {
    return this.getPositiveIntegerEnv(
      'COD_AUTOMATION_WORKER_STALE_RUNNING_MS',
      10 * 60 * 1000,
    );
  }

  private getRetryDelayMs(attempts: number) {
    const baseDelayMs = this.getPositiveIntegerEnv(
      'COD_AUTOMATION_WORKER_RETRY_BASE_MS',
      60 * 1000,
    );
    const maxDelayMs = this.getPositiveIntegerEnv(
      'COD_AUTOMATION_WORKER_RETRY_MAX_MS',
      15 * 60 * 1000,
    );
    const multiplier = Math.pow(2, Math.max(attempts - 1, 0));

    return Math.min(baseDelayMs * multiplier, maxDelayMs);
  }

  private getPositiveIntegerEnv(name: string, fallback: number) {
    const value = Number(process.env[name]);

    return Number.isInteger(value) && value > 0 ? value : fallback;
  }

  private getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : String(error);
  }

  private addMinutes(date: Date, minutes: number) {
    return new Date(date.getTime() + minutes * 60 * 1000);
  }
}
