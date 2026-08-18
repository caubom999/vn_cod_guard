import { Controller, Get, Query } from '@nestjs/common';
import {
  EsmsCallbackQuery,
  EsmsCallbackService,
} from './esms-callback.service';

@Controller('api/cod/integrations/sms/esms/callback')
export class EsmsCallbackController {
  constructor(private readonly callbacks: EsmsCallbackService) {}

  @Get()
  handle(@Query() query: EsmsCallbackQuery) {
    return this.callbacks.handle(query);
  }
}
