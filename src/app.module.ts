import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { StockModule } from './stock/stock.module';
import { MarketModule } from './market/market.module';
import { NewsModule } from './news/news.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ServeStaticModule.forRoot({ rootPath: join(__dirname, '..', 'public') }),
    StockModule,
    MarketModule,
    NewsModule,
  ],
})
export class AppModule {}

