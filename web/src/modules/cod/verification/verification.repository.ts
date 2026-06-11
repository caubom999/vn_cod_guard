import { Injectable } from '@nestjs/common';
import {
  CodOrderStatus,
  Prisma,
  VerificationSessionStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class VerificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  revokeActiveSessions(codOrderId: number) {
    return this.prisma.verificationSession.updateMany({
      where: {
        codOrderId,
        status: VerificationSessionStatus.ACTIVE,
      },
      data: {
        status: VerificationSessionStatus.REVOKED,
      },
    });
  }

  createSession(data: Prisma.VerificationSessionUncheckedCreateInput) {
    return this.prisma.verificationSession.create({ data });
  }

  findByTokenHash(tokenHash: string) {
    return this.prisma.verificationSession.findUnique({
      where: { tokenHash },
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

  updateSessionStatus(
    id: number,
    status: VerificationSessionStatus,
    data: Omit<Prisma.VerificationSessionUpdateInput, 'status'> = {},
  ) {
    return this.prisma.verificationSession.update({
      where: { id },
      data: {
        ...data,
        status,
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
      data: {
        ...data,
        status,
      },
    });
  }

  createEvent(data: Prisma.CodVerificationEventUncheckedCreateInput) {
    return this.prisma.codVerificationEvent.create({ data });
  }
}
