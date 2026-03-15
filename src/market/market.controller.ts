import { Controller, Get } from '@nestjs/common';
import { GetMarketOverviewUseCase } from './usecases/get-market-overview.usecase';

@Controller('market')
export class MarketController {
  constructor(private readonly getMarketOverviewUseCase: GetMarketOverviewUseCase) {}

  /**
   * GET /market
   * KOSPI, KOSDAQ 지수 현황 및 시장 상태
   */
  @Get()
  getOverview() {
    return this.getMarketOverviewUseCase.execute();
  }
}
