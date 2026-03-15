import { Controller, Get, Param, Query } from '@nestjs/common';
import { GetStockListUseCase } from './usecases/get-stock-list.usecase';
import { GetStockDetailUseCase } from './usecases/get-stock-detail.usecase';
import { SearchStocksUseCase } from './usecases/search-stocks.usecase';

@Controller('stocks')
export class StockController {
  constructor(
    private readonly getStockListUseCase: GetStockListUseCase,
    private readonly getStockDetailUseCase: GetStockDetailUseCase,
    private readonly searchStocksUseCase: SearchStocksUseCase,
  ) {}

  /**
   * GET /stocks
   * GET /stocks?market=KOSPI
   * GET /stocks?market=KOSDAQ
   * 주요 종목 목록 + 기술적 신호 요약
   */
  @Get()
  getStockList(@Query('market') market?: 'KOSPI' | 'KOSDAQ') {
    return this.getStockListUseCase.execute(market);
  }

  /**
   * GET /stocks/search?query=삼성
   * 종목명 regex 검색
   */
  @Get('search')
  searchStocks(@Query('query') query: string) {
    return this.searchStocksUseCase.execute(query);
  }

  /**
   * GET /stocks/:ticker
   * 예: GET /stocks/005930.KS
   * 종목 상세 분석 (RSI, MACD, 볼린저밴드, 이동평균 등)
   */
  @Get(':ticker')
  getStockDetail(@Param('ticker') ticker: string) {
    return this.getStockDetailUseCase.execute(ticker);
  }
}
