import { Module } from '@nestjs/common';
import { StockController } from './stock.controller';
import { YahooFinanceService } from './services/yahoo-finance.service';
import { TechnicalIndicatorService } from './services/technical-indicator.service';
import { GetStockListUseCase } from './usecases/get-stock-list.usecase';
import { GetStockDetailUseCase } from './usecases/get-stock-detail.usecase';

@Module({
  controllers: [StockController],
  providers: [
    YahooFinanceService,
    TechnicalIndicatorService,
    GetStockListUseCase,
    GetStockDetailUseCase,
  ],
})
export class StockModule {}
