import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AppController } from './app.controller';
import {
  AUTHENTICATED_APP_ROUTES,
  PUBLIC_APP_SHELL_ROUTES,
} from './app.routes';
import appConfig from './config/app';
import shopifyConfig from './config/shopify';
import { AuthModule } from './modules/auth/auth.module';
import { BillingModule } from './modules/billing/billing.module';
import { ShopModule } from './modules/shop/shop.module';
import { ShopifyModule } from './modules/shopify/shopify.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `${process.cwd()}/.env`,
      load: [appConfig, shopifyConfig],
    }),
    ServeStaticModule.forRoot({
      rootPath: join(
        __dirname,
        process.env.NODE_ENV === 'production'
          ? '../frontend/dist'
          : '../frontend',
      ),
      exclude: [
        '/api',
        '/api/(.*)',
        '/verify',
        '/verify/(.*)',
        '/privacy',
        '/privacy-policy',
        '/terms',
        '/terms-of-service',
        '/data-retention',
        ...AUTHENTICATED_APP_ROUTES,
        ...PUBLIC_APP_SHELL_ROUTES,
      ],
      serveStaticOptions: {
        etag: false,
        index: false,
        maxAge: process.env.NODE_ENV === 'production' ? '30d' : 0,
        setHeaders: (res, path) => {
          if (path.endsWith('index.html')) {
            res.setHeader('Cache-Control', 'no-cache');
          }
        },
      },
    }),
    ShopifyModule,
    AuthModule,
    BillingModule,
    ShopModule,
    WebhooksModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
