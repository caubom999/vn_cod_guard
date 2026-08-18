import { Container, getContainer } from '@cloudflare/containers';
import { env } from 'cloudflare:workers';

const cfg = env as unknown as Record<string, string | undefined>;

export class CodGuardApp extends Container {
  defaultPort = 8080;
  sleepAfter = '10m';
  pingEndpoint = 'localhost/health';

  envVars = {
    NODE_ENV: cfg.NODE_ENV ?? 'production',
    PORT: cfg.PORT ?? '8080',
    HOST: cfg.HOST ?? '',
    APP_SCHEME: cfg.APP_SCHEME ?? 'https',
    SHOPIFY_API_KEY: cfg.SHOPIFY_API_KEY ?? '',
    SHOPIFY_API_SECRET: cfg.SHOPIFY_API_SECRET ?? '',
    SHOPIFY_API_VERSION: cfg.SHOPIFY_API_VERSION ?? '2026-04',
    SHOPIFY_SCOPES: cfg.SHOPIFY_SCOPES ?? '',
    SHOPIFY_BILLING_TEST: cfg.SHOPIFY_BILLING_TEST ?? 'false',
    SHOPIFY_SMS_USAGE_BILLING_ENABLED:
      cfg.SHOPIFY_SMS_USAGE_BILLING_ENABLED ?? 'false',
    INTEGRATION_ENCRYPTION_KEY: cfg.INTEGRATION_ENCRYPTION_KEY ?? '',
    DATABASE_URL: cfg.DATABASE_URL ?? '',
    MYSQL_HOST: cfg.MYSQL_HOST ?? '',
    MYSQL_PORT: cfg.MYSQL_PORT ?? '3306',
    MYSQL_DATABASE: cfg.MYSQL_DATABASE ?? '',
    MYSQL_USER: cfg.MYSQL_USER ?? '',
    MYSQL_PASSWORD: cfg.MYSQL_PASSWORD ?? '',
    REDIS_HOST: cfg.REDIS_HOST ?? '',
    REDIS_PORT: cfg.REDIS_PORT ?? '6379',
    REDIS_DATABASE: cfg.REDIS_DATABASE ?? '0',
    REDIS_PASSWORD: cfg.REDIS_PASSWORD ?? '',
    SHOPIFY_SESSION_STORAGE: cfg.SHOPIFY_SESSION_STORAGE ?? 'redis',
    SHOPIFY_SESSION_REDIS_KEY_PREFIX:
      cfg.SHOPIFY_SESSION_REDIS_KEY_PREFIX ?? 'shopify_sessions',
    COD_AUTOMATION_WORKER_ENABLED: cfg.COD_AUTOMATION_WORKER_ENABLED ?? 'true',
    COD_AUTOMATION_WORKER_INTERVAL_MS:
      cfg.COD_AUTOMATION_WORKER_INTERVAL_MS ?? '30000',
    COD_AUTOMATION_WORKER_BATCH_SIZE:
      cfg.COD_AUTOMATION_WORKER_BATCH_SIZE ?? '10',
    COD_AUTOMATION_WORKER_MAX_ATTEMPTS:
      cfg.COD_AUTOMATION_WORKER_MAX_ATTEMPTS ?? '3',
    COD_AUTOMATION_WORKER_STALE_RUNNING_MS:
      cfg.COD_AUTOMATION_WORKER_STALE_RUNNING_MS ?? '600000',
    COD_AUTOMATION_WORKER_RETRY_BASE_MS:
      cfg.COD_AUTOMATION_WORKER_RETRY_BASE_MS ?? '60000',
    COD_AUTOMATION_WORKER_RETRY_MAX_MS:
      cfg.COD_AUTOMATION_WORKER_RETRY_MAX_MS ?? '900000',
    COD_AVERAGE_SHIPPING_COST: cfg.COD_AVERAGE_SHIPPING_COST ?? '30000',
    EMAIL_PROVIDER: cfg.EMAIL_PROVIDER ?? 'resend',
    RESEND_API_KEY: cfg.RESEND_API_KEY ?? '',
    EMAIL_FROM: cfg.EMAIL_FROM ?? '',
    EMAIL_REPLY_TO: cfg.EMAIL_REPLY_TO ?? '',
    SUPPORT_EMAIL: cfg.SUPPORT_EMAIL ?? '',
    TWILIO_ACCOUNT_SID: cfg.TWILIO_ACCOUNT_SID ?? '',
    TWILIO_AUTH_TOKEN: cfg.TWILIO_AUTH_TOKEN ?? '',
    TWILIO_FROM: cfg.TWILIO_FROM ?? '',
  };
}

export default {
  async fetch(request: Request, env: any): Promise<Response> {
    return getContainer(env.COD_GUARD_APP, 'main').fetch(request);
  },
};
