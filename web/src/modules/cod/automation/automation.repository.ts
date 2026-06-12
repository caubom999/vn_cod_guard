import { Injectable } from '@nestjs/common';
import {
  AutomationJobStatus,
  AutomationJobType,
  CodOrderStatus,
  Prisma,
  VerificationSessionStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AutomationRepository {
  constructor(private readonly prisma: PrismaService) {}

  cancelScheduledJobsForOrder(codOrderId: number) {
    return this.prisma.codAutomationJob.updateMany({
      where: { codOrderId, status: AutomationJobStatus.SCHEDULED },
      data: { status: AutomationJobStatus.CANCELLED },
    });
  }

  createJob(data: Prisma.CodAutomationJobUncheckedCreateInput) {
    return this.prisma.codAutomationJob.create({ data });
  }

  findDueJobs(limit = 10) {
    return this.prisma.codAutomationJob.findMany({
      where: {
        status: AutomationJobStatus.SCHEDULED,
        runAt: { lte: new Date() },
      },
      orderBy: [{ runAt: 'asc' }, { id: 'asc' }],
      take: limit,
    });
  }

  async claimJob(id: number) {
    const result = await this.prisma.codAutomationJob.updateMany({
      where: {
        id,
        status: AutomationJobStatus.SCHEDULED,
        runAt: { lte: new Date() },
      },
      data: {
        status: AutomationJobStatus.RUNNING,
        attempts: { increment: 1 },
        lastError: null,
      },
    });

    return result.count === 1;
  }

  findOrderForJob(codOrderId: number) {
    return this.prisma.codOrder.findUnique({
      where: { id: codOrderId },
      include: {
        shop: { include: { codSetting: true } },
        sessions: {
          where: { status: VerificationSessionStatus.ACTIVE },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });
  }

  markJobDone(id: number) {
    return this.prisma.codAutomationJob.update({
      where: { id },
      data: { status: AutomationJobStatus.DONE, lastError: null },
    });
  }

  markJobCancelled(id: number, reason: string) {
    return this.prisma.codAutomationJob.update({
      where: { id },
      data: { status: AutomationJobStatus.CANCELLED, lastError: reason },
    });
  }

  markJobFailed(id: number, attempts: number, error: string) {
    const shouldRetry = attempts < 3;

    return this.prisma.codAutomationJob.update({
      where: { id },
      data: {
        status: shouldRetry
          ? AutomationJobStatus.SCHEDULED
          : AutomationJobStatus.FAILED,
        runAt: shouldRetry
          ? new Date(Date.now() + attempts * 60 * 1000)
          : undefined,
        lastError: error,
      },
    });
  }

  updateOrderStatus(
    id: number,
    status: CodOrderStatus,
    data: Omit<Prisma.CodOrderUpdateInput, 'status'> = {},
  ) {
    return this.prisma.codOrder.update({
      where: { id },
      data: { ...data, status },
    });
  }

  updateActiveSessionsStatus(
    codOrderId: number,
    status: VerificationSessionStatus,
  ) {
    return this.prisma.verificationSession.updateMany({
      where: { codOrderId, status: VerificationSessionStatus.ACTIVE },
      data: { status },
    });
  }

  incrementReminderCount(codOrderId: number) {
    return this.prisma.codOrder.update({
      where: { id: codOrderId },
      data: { reminderCount: { increment: 1 } },
    });
  }

  createEvent(data: Prisma.CodVerificationEventUncheckedCreateInput) {
    return this.prisma.codVerificationEvent.create({ data });
  }

  createFollowUpReminder(codOrderId: number, runAt: Date) {
    return this.createJob({
      codOrderId,
      type: AutomationJobType.SEND_REMINDER,
      runAt,
    });
  }
}
