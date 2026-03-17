import { Module } from '@nestjs/common';
import { CronController } from './cron.controller';
import { StockModule } from '../stock/stock.module';

@Module({
  imports: [StockModule],
  controllers: [CronController],
})
export class CronModule {}
