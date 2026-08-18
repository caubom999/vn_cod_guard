import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MessageDeliveryStatus } from '@prisma/client';
import { EsmsCallbackService } from './esms-callback.service';

describe('EsmsCallbackService', () => {
  const config = {
    get: jest.fn((key: string) => {
      if (key === 'app.host') return 'https://app.example.com';
      if (key === 'INTEGRATION_ENCRYPTION_KEY') return 'k'.repeat(32);
      return undefined;
    }),
  } as unknown as ConfigService;
  const messages = {
    findDeliveryForProviderCallback: jest.fn(),
    updateDeliveryProviderStatus: jest.fn(),
    createEvent: jest.fn(),
  };
  const service = new EsmsCallbackService(config, messages as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('builds a signed HTTPS callback URL', () => {
    const url = new URL(service.buildCallbackUrl(42));

    expect(url.origin).toBe('https://app.example.com');
    expect(url.pathname).toBe('/api/cod/integrations/sms/esms/callback');
    expect(url.searchParams.get('deliveryId')).toBe('42');
    expect(url.searchParams.get('signature')).toMatch(/^[a-f0-9]{64}$/);
  });

  it('marks an accepted eSMS message as delivered from a valid callback', async () => {
    const callbackUrl = new URL(service.buildCallbackUrl(42));
    messages.findDeliveryForProviderCallback.mockResolvedValue({
      id: 42,
      provider: 'ESMS',
      providerMessageId: 'sms-123',
      status: MessageDeliveryStatus.SENT,
      sentAt: new Date('2026-08-11T00:00:00.000Z'),
      deliveredAt: null,
      session: { id: 7, codOrderId: 9 },
    });

    await expect(
      service.handle({
        deliveryId: '42',
        signature: callbackUrl.searchParams.get('signature'),
        SMSID: 'sms-123',
        SendStatus: '5',
        SendSuccess: '1',
        SendFailed: '0',
        telcoid: '1',
      }),
    ).resolves.toEqual({
      ok: true,
      status: MessageDeliveryStatus.DELIVERED,
    });

    expect(messages.updateDeliveryProviderStatus).toHaveBeenCalledWith(
      42,
      expect.objectContaining({
        status: MessageDeliveryStatus.DELIVERED,
        providerMessageId: 'sms-123',
        error: null,
        deliveredAt: expect.any(Date),
      }),
    );
    expect(messages.createEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'SMS_DELIVERY_CONFIRMED' }),
    );
  });

  it('marks a final failed callback as failed', async () => {
    const callbackUrl = new URL(service.buildCallbackUrl(43));
    messages.findDeliveryForProviderCallback.mockResolvedValue({
      id: 43,
      provider: 'ESMS',
      providerMessageId: 'sms-456',
      status: MessageDeliveryStatus.SENT,
      sentAt: new Date(),
      deliveredAt: null,
      session: { id: 8, codOrderId: 10 },
    });

    await service.handle({
      deliveryId: '43',
      signature: callbackUrl.searchParams.get('signature'),
      SMSID: 'sms-456',
      SendStatus: '5',
      SendSuccess: '0',
      SendFailed: '1',
    });

    expect(messages.updateDeliveryProviderStatus).toHaveBeenCalledWith(
      43,
      expect.objectContaining({
        status: MessageDeliveryStatus.FAILED,
        error: 'eSMS delivery failed (SendStatus 5)',
      }),
    );
  });

  it('rejects a forged callback signature', async () => {
    await expect(
      service.handle({
        deliveryId: '42',
        signature: '0'.repeat(64),
        SMSID: 'sms-123',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(messages.findDeliveryForProviderCallback).not.toHaveBeenCalled();
  });
});
