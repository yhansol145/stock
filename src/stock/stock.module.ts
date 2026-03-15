import { Module } from '@nestjs/common';
import { StockController } from './stock.controller';
import { YahooFinanceService } from './services/yahoo-finance.service';
import { TechnicalIndicatorService } from './services/technical-indicator.service';
import { StockCacheService } from './services/stock-cache.service';
import { GetStockListUseCase } from './usecases/get-stock-list.usecase';
import { GetStockDetailUseCase } from './usecases/get-stock-detail.usecase';
import { SearchStocksUseCase } from './usecases/search-stocks.usecase';

@Module({
  imports: [],
  controllers: [StockController],
  providers: [
    YahooFinanceService,
    TechnicalIndicatorService,
    StockCacheService,
    GetStockListUseCase,
    GetStockDetailUseCase,
    SearchStocksUseCase,
  ],
  exports: [GetStockListUseCase],
})
export class StockModule {}
