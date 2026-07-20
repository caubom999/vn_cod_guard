import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'crypto';

type EncryptedPayload = {
  version: 1;
  algorithm: 'aes-256-gcm';
  iv: string;
  tag: string;
  data: string;
};

@Injectable()
export class IntegrationSecretService {
  constructor(private readonly config: ConfigService) {}

  encrypt(value: Record<string, string>): EncryptedPayload {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.getKey(), iv);
    const data = Buffer.concat([
      cipher.update(JSON.stringify(value), 'utf8'),
      cipher.final(),
    ]);

    return {
      version: 1,
      algorithm: 'aes-256-gcm',
      iv: iv.toString('base64'),
      tag: cipher.getAuthTag().toString('base64'),
      data: data.toString('base64'),
    };
  }

  decrypt(value: unknown): Record<string, string> {
    if (!this.isEncryptedPayload(value)) {
      return {};
    }

    const decipher = createDecipheriv(
      'aes-256-gcm',
      this.getKey(),
      Buffer.from(value.iv, 'base64'),
    );
    decipher.setAuthTag(Buffer.from(value.tag, 'base64'));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(value.data, 'base64')),
      decipher.final(),
    ]).toString('utf8');
    const parsed = JSON.parse(plaintext) as unknown;

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, string] => typeof entry[1] === 'string',
      ),
    );
  }

  private getKey() {
    const secret =
      this.config.get<string>('INTEGRATION_ENCRYPTION_KEY') ||
      this.config.get<string>('JWT_SECRET_KEY');

    if (!secret || secret.length < 32) {
      throw new Error(
        'INTEGRATION_ENCRYPTION_KEY must contain at least 32 characters',
      );
    }

    return createHash('sha256').update(secret).digest();
  }

  private isEncryptedPayload(value: unknown): value is EncryptedPayload {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return false;
    }

    const payload = value as Partial<EncryptedPayload>;
    return Boolean(
      payload.version === 1 &&
        payload.algorithm === 'aes-256-gcm' &&
        payload.iv &&
        payload.tag &&
        payload.data,
    );
  }
}
