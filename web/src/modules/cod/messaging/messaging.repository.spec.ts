import { MessageDeliveryStatus } from '@prisma/client';
import { MessagingRepository } from './messaging.repository';

describe('MessagingRepository', () => {
  it('does not downgrade a final provider callback status to SENT', async () => {
    const finalDelivery = {
      id: 10,
      status: MessageDeliveryStatus.DELIVERED,
      providerMessageId: 'sms-123',
    };
    const codMessageDelivery = {
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      findUniqueOrThrow: jest.fn().mockResolvedValue(finalDelivery),
    };
    const repository = new MessagingRepository({
      codMessageDelivery,
    } as never);

    await expect(
      repository.markDeliverySent(10, { providerMessageId: 'sms-123' }),
    ).resolves.toEqual(finalDelivery);

    expect(codMessageDelivery.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 10,
          status: {
            in: [MessageDeliveryStatus.QUEUED, MessageDeliveryStatus.SENT],
          },
        },
      }),
    );
  });
});
