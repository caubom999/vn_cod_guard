import { SmsProvider } from './sms.provider';

describe('SmsProvider', () => {
  const provider = new SmsProvider();

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('counts a short ASCII message as one segment', () => {
    expect(provider.countSegments('A'.repeat(160))).toBe(1);
  });

  it('counts concatenated ASCII messages using 153 characters per segment', () => {
    expect(provider.countSegments('A'.repeat(161))).toBe(2);
  });

  it('uses Unicode segment limits for Vietnamese text', () => {
    expect(provider.countSegments('Đ'.repeat(71))).toBe(2);
  });

  it('verifies eSMS credentials by checking the account balance', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ CodeResponse: '100', Balance: 125000 }), {
        status: 200,
      }),
    );

    await expect(
      provider.verifyConnection({
        provider: 'esms',
        apiKey: 'api-key',
        secretKey: 'secret-key',
        brandname: 'CODGUARD',
      }),
    ).resolves.toEqual({ balance: 125000 });
  });

  it('sends an eSMS sandbox request using the domestic phone format', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ CodeResult: '100', SMSID: 'sms-123' }), {
        status: 200,
      }),
    );

    await expect(
      provider.send({
        to: '+84896138163',
        body: 'Xac nhan don hang',
        integrationConfig: {
          provider: 'esms',
          apiKey: 'api-key',
          secretKey: 'secret-key',
          brandname: 'CODGUARD',
          sandbox: true,
          billingMode: 'merchant-direct',
        },
      }),
    ).resolves.toMatchObject({
      provider: 'ESMS',
      providerMessageId: 'sms-123',
      billingMode: 'merchant-direct',
    });

    const request = fetchMock.mock.calls[0];
    const payload = JSON.parse(String(request[1]?.body)) as Record<
      string,
      string
    >;
    expect(payload).toMatchObject({
      Phone: '0896138163',
      Brandname: 'CODGUARD',
      SmsType: '2',
      Sandbox: '1',
      IsUnicode: '0',
    });
  });

  it('surfaces an approved-template error returned by eSMS', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ CodeResult: '146' }), { status: 200 }),
      );

    await expect(
      provider.send({
        to: '+84896138163',
        body: 'Unregistered template',
        integrationConfig: {
          provider: 'esms',
          apiKey: 'api-key',
          secretKey: 'secret-key',
          brandname: 'CODGUARD',
          sandbox: false,
        },
      }),
    ).rejects.toThrow('approved eSMS template (code 146)');
  });
});
