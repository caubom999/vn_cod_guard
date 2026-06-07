import '@shopify/shopify-api/adapters/node';
import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from '../src/app.controller';
import { AppModule } from '../src/app.module';

describe('AppController', () => {
  let moduleFixture: TestingModule;
  let controller: AppController;

  beforeEach(async () => {
    process.env.NODE_ENV = 'test';
    process.env.HOST = 'https://example.com';
    process.env.SHOPIFY_API_KEY = 'test_key';
    process.env.SHOPIFY_API_SECRET = 'test_secret';
    process.env.SHOPIFY_SCOPES = 'read_products';
    process.env.DATABASE_URL = 'mysql://root:root@127.0.0.1:3306/test';

    moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    controller = moduleFixture.get(AppController);
  });

  afterEach(async () => {
    await moduleFixture?.close();
  });

  it('returns health status', () => {
    expect(controller.health()).toEqual({ ok: true });
  });
});
