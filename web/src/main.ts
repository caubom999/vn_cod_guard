import '@shopify/shopify-api/adapters/node';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
    rawBody: true,
  });

  const captureRawBody = (req: any, _res: unknown, buffer: Buffer) => {
    if (buffer?.length) {
      req.rawBody = Buffer.from(buffer);
    }
  };

  app.use(json({ limit: '10mb', verify: captureRawBody }));
  app.use(
    urlencoded({ extended: true, limit: '10mb', verify: captureRawBody }),
  );
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    }),
  );

  await app.listen(Number(process.env.PORT || 8081));
}

bootstrap();
