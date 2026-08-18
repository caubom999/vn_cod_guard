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

  it('verifies eSMS credentials, Brandname templates, and balance', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ CodeResponse: '100', Balance: 125000 }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            CodeResult: '100',
            BrandnameTemplates: [
              {
                NetworkID: 1,
                TempId: 10,
                TempContent:
                  'CODGUARD: Xac nhan don {P1,20} tai https://app.example.com/api/verify/{P1,50}',
              },
              {
                NetworkID: 3,
                TempId: 11,
                TempContent:
                  'CODGUARD: Xac nhan don {P1,20} tai https://app.example.com/api/verify/{P1,50}',
              },
            ],
          }),
          { status: 200 },
        ),
      );

    await expect(
      provider.verifyConnection(
        {
          provider: 'esms',
          apiKey: 'api-key',
          secretKey: 'secret-key',
          brandname: 'CODGUARD',
        },
        {
          sampleBody:
            'CODGUARD: Xac nhan don #1001 tai https://app.example.com/api/verify/' +
            'a'.repeat(43),
        },
      ),
    ).resolves.toEqual({
      balance: 125000,
      registeredTemplateCount: 2,
      registeredNetworks: ['1', '3'],
      matchingTemplateCount: 2,
      matchingNetworks: ['1', '3'],
    });
  });

  it('rejects an eSMS Brandname with no approved customer-care templates', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ CodeResponse: '100', Balance: 1000 }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ CodeResult: '100', BrandnameTemplates: [] }),
          { status: 200 },
        ),
      );

    await expect(
      provider.verifyConnection({
        provider: 'esms',
        apiKey: 'api-key',
        secretKey: 'secret-key',
        brandname: 'CODGUARD',
      }),
    ).rejects.toThrow('has no approved customer-care templates');
  });

  it('rejects a COD message that does not match an approved eSMS template', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ CodeResponse: '100', Balance: 1000 }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            CodeResult: '100',
            BrandnameTemplates: [
              {
                NetworkID: 1,
                TempContent: 'Cam on quy khach da su dung dich vu.',
              },
            ],
          }),
          { status: 200 },
        ),
      );

    await expect(
      provider.verifyConnection(
        {
          provider: 'esms',
          apiKey: 'api-key',
          secretKey: 'secret-key',
          brandname: 'CODGUARD',
        },
        { sampleBody: 'CODGUARD: Xac nhan don #1001' },
      ),
    ).rejects.toThrow('do not match any approved eSMS');
  });

  it('sends a live eSMS request using the domestic phone format', async () => {
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
      Sandbox: '0',
      IsUnicode: '0',
    });
    expect(payload.CallbackUrl).toBeUndefined();
  });

  it('adds the delivery callback to a live eSMS request', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ CodeResult: '100', SMSID: 'sms-live' }), {
        status: 200,
      }),
    );

    await provider.send({
      to: '0896138163',
      body: 'Xac nhan don hang',
      callbackUrl:
        'https://app.example.com/api/cod/integrations/sms/esms/callback?deliveryId=1&signature=signed',
      integrationConfig: {
        provider: 'esms',
        apiKey: 'api-key',
        secretKey: 'secret-key',
        brandname: 'CODGUARD',
      },
    });

    const payload = JSON.parse(
      String(fetchMock.mock.calls[0][1]?.body),
    ) as Record<string, string>;
    expect(payload).toMatchObject({
      Phone: '0896138163',
      Sandbox: '0',
      CallbackUrl:
        'https://app.example.com/api/cod/integrations/sms/esms/callback?deliveryId=1&signature=signed',
    });
  });

  it('rejects Vietnamese landlines before calling eSMS', async () => {
    const fetchMock = jest.spyOn(global, 'fetch');

    await expect(
      provider.send({
        to: '+842025550147',
        body: 'Xac nhan don hang',
        integrationConfig: {
          provider: 'esms',
          apiKey: 'api-key',
          secretKey: 'secret-key',
          brandname: 'CODGUARD',
        },
      }),
    ).rejects.toThrow('requires a valid mobile number');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('surfaces the network error code without exposing credentials', async () => {
    const networkError = Object.assign(new TypeError('fetch failed'), {
      cause: { code: 'ENOTFOUND' },
    });
    jest.spyOn(global, 'fetch').mockRejectedValue(networkError);

    await expect(
      provider.send({
        to: '+84896138163',
        body: 'Xac nhan don hang',
        integrationConfig: {
          provider: 'esms',
          apiKey: 'api-key',
          secretKey: 'secret-key',
          brandname: 'CODGUARD',
        },
      }),
    ).rejects.toThrow('eSMS send request failed (ENOTFOUND)');
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
        },
      }),
    ).rejects.toThrow('approved eSMS template (code 146)');
  });
});
