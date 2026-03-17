import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { StockModule } from './stock/stock.module';
import { MarketModule } from './market/market.module';
import { NewsModule } from './news/news.module';
import { RecommendationModule } from './recommendation/recommendation.module';
import { CronModule } from './cron/cron.module';

const isVercel = process.env.VERCEL === '1';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ...(isVercel
      ? []
      : [ServeStaticModule.forRoot({ rootPath: join(__dirname, '..', 'public') })]),
    StockModule,
    MarketModule,
    NewsModule,
    RecommendationModule,
    CronModule,
  ],
})
export class AppModule {}
