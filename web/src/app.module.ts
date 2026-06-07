import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AppController } from './app.controller';
import appConfig from './config/app';
import shopifyConfig from './config/shopify';
import { AuthModule } from './modules/auth/auth.module';
import { ShopModule } from './modules/shop/shop.module';
import { ShopifyModule } from './modules/shopify/shopify.module';

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
        process.env.NODE_ENV === 'production' ? '../frontend/dist' : '../frontend',
      ),
      exclude: ['/api*'],
      serveStaticOptions: {
        etag: false,
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
    ShopModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
