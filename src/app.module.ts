import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { StockModule } from './stock/stock.module';
import { MarketModule } from './market/market.module';

@Module({
  imports: [
    ServeStaticModule.forRoot({ rootPath: join(__dirname, '..', 'public') }),
    StockModule,
    MarketModule,
  ],
})
export class AppModule {}

