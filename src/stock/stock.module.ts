import { Module } from '@nestjs/common';
import { StockController } from './stock.controller';
import { YahooFinanceService } from './services/yahoo-finance.service';
import { TechnicalIndicatorService } from './services/technical-indicator.service';
import { StockCacheService } from './services/stock-cache.service';
import { GetStockListUseCase } from './usecases/get-stock-list.usecase';
import { GetStockDetailUseCase } from './usecases/get-stock-detail.usecase';
import { SearchStocksUseCase } from './usecases/search-stocks.usecase';
import { GetStockAiAnalysisUseCase } from './usecases/get-stock-ai-analysis.usecase';
import { GroqService } from '../recommendation/services/groq.service';

@Module({
  imports: [],
  controllers: [StockController],
  providers: [
    YahooFinanceService,
    TechnicalIndicatorService,
    StockCacheService,
    GroqService,
    GetStockListUseCase,
    GetStockDetailUseCase,
    SearchStocksUseCase,
    GetStockAiAnalysisUseCase,
  ],
  exports: [GetStockListUseCase, StockCacheService],
})
export class StockModule {}
