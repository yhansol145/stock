import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { StockModule } from './stock/stock.module';
import { MarketModule } from './market/market.module';
import { NewsModule } from './news/news.module';
import { RecommendationModule } from './recommendation/recommendation.module';
import { CronModule } from './cron/cron.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ServeStaticModule.forRoot({ rootPath: `${process.cwd()}/public` }),
    StockModule,
    MarketModule,
    NewsModule,
    RecommendationModule,
    CronModule,
  ],
})
export class AppModule {}
