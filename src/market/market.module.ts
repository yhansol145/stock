import { Module } from '@nestjs/common';
import { MarketController } from './market.controller';
import { MarketDataService } from './services/market-data.service';
import { GetMarketOverviewUseCase } from './usecases/get-market-overview.usecase';

@Module({
  controllers: [MarketController],
  providers: [MarketDataService, GetMarketOverviewUseCase],
})
export class MarketModule {}
