import { SmsIntegrationService } from './sms-integration.service';

describe('SmsIntegrationService', () => {
  const integrations = {
    getOrCreate: jest.fn(),
    update: jest.fn(),
  };
  const secrets = {
    decrypt: jest.fn(() => ({
      apiKey: 'api-key',
      secretKey: 'secret-key',
    })),
    encrypt: jest.fn((value) => value),
  };
  const smsProvider = {
    verifyConnection: jest.fn(),
  };
  const service = new SmsIntegrationService(
    integrations as never,
    secrets as never,
    smsProvider as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('treats a configured eSMS connection as live without a test gate', async () => {
    integrations.getOrCreate.mockResolvedValue({
      enabled: true,
      senderName: 'CODGUARD',
      configJson: {
        provider: 'esms',
        esmsBrandname: 'CODGUARD',
      },
      encryptedSecretJson: {},
      updatedAt: new Date(),
    });

    await expect(service.isAvailable(1)).resolves.toBe(true);
    await expect(service.get(1)).resolves.toMatchObject({
      enabled: true,
      configured: true,
      readyForLiveDelivery: true,
    });
  });

  it('saves eSMS in live mode without calling a connection test', async () => {
    const existing = {
      enabled: false,
      senderName: null,
      configJson: { provider: 'esms' },
      encryptedSecretJson: {},
      updatedAt: new Date(),
    };
    integrations.getOrCreate.mockResolvedValue(existing);
    integrations.update.mockImplementation(
      async (_shopId: number, data: Record<string, unknown>) => ({
        ...existing,
        ...data,
        updatedAt: new Date(),
      }),
    );

    await expect(
      service.update(1, {
        provider: 'esms',
        enabled: true,
        apiKey: 'api-key',
        secretKey: 'secret-key',
        brandname: 'CODGUARD',
      }),
    ).resolves.toMatchObject({
      enabled: true,
      configured: true,
      readyForLiveDelivery: true,
    });
    expect(integrations.update).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        enabled: true,
        configJson: expect.objectContaining({
          provider: 'esms',
          esmsBrandname: 'CODGUARD',
        }),
      }),
    );
  });

  it('uses Test connection to check credentials and eSMS balance', async () => {
    integrations.getOrCreate.mockResolvedValue({
      enabled: true,
      senderName: 'CODGUARD',
      configJson: {
        provider: 'esms',
        esmsBrandname: 'CODGUARD',
      },
      encryptedSecretJson: {},
      updatedAt: new Date(),
    });
    smsProvider.verifyConnection.mockResolvedValue({
      balance: 120000,
      registeredTemplateCount: 2,
      registeredNetworks: ['VMS'],
    });

    await expect(service.test(1)).resolves.toMatchObject({
      ok: true,
      provider: 'esms',
      balance: 120000,
      registeredTemplateCount: 2,
    });
    expect(smsProvider.verifyConnection).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'esms',
        brandname: 'CODGUARD',
      }),
    );
  });
});
