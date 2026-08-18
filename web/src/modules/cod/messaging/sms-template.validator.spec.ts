import {
  getSmsTemplateValidationError,
  isTemporaryVerificationUrl,
} from './sms-template.validator';

describe('SMS template validation', () => {
  it('accepts the supported COD Guard placeholders', () => {
    expect(
      getSmsTemplateValidationError(
        '{{shopName}}: Xac nhan don {{orderName}}, tong {{amount}} {{currency}}.',
      ),
    ).toBeNull();
  });

  it('rejects JavaScript interpolation placeholders', () => {
    expect(
      getSmsTemplateValidationError(
        'Don ${data.orderName}, tong ${data.amount}',
      ),
    ).toContain('${data.variable} is not supported');
  });

  it('rejects URLs because the verification URL is appended once', () => {
    expect(
      getSmsTemplateValidationError('Xac nhan tai https://example.com/v/abc'),
    ).toContain('appends the verification URL automatically');
  });

  it('rejects unsupported and malformed placeholders', () => {
    expect(getSmsTemplateValidationError('Hello {{token}}')).toContain(
      'Unsupported SMS template variable',
    );
    expect(getSmsTemplateValidationError('Hello {{orderName}')).toContain(
      'malformed',
    );
  });

  it('recognizes temporary or non-HTTPS verification URLs', () => {
    expect(
      isTemporaryVerificationUrl(
        'https://random-name.trycloudflare.com/api/verify/token',
      ),
    ).toBe(true);
    expect(
      isTemporaryVerificationUrl('http://localhost:8080/api/verify/token'),
    ).toBe(true);
    expect(
      isTemporaryVerificationUrl('https://verify.example.com/api/verify/token'),
    ).toBe(false);
  });
});
