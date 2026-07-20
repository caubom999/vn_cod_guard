import { ConfigService } from '@nestjs/config';
import { IntegrationSecretService } from './integration-secret.service';

describe('IntegrationSecretService', () => {
  const service = new IntegrationSecretService(
    new ConfigService({
      INTEGRATION_ENCRYPTION_KEY:
        'test-only-integration-secret-key-32-characters',
    }),
  );

  it('encrypts and decrypts provider credentials', () => {
    const encrypted = service.encrypt({
      accountSid: 'AC123',
      authToken: 'top-secret',
    });

    expect(JSON.stringify(encrypted)).not.toContain('top-secret');
    expect(service.decrypt(encrypted)).toEqual({
      accountSid: 'AC123',
      authToken: 'top-secret',
    });
  });

  it('returns an empty object for an unencrypted value', () => {
    expect(service.decrypt({ authToken: 'plaintext' })).toEqual({});
  });
});
