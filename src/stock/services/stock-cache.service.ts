import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { YahooFinanceService } from './yahoo-finance.service';
import { TechnicalIndicatorService } from './technical-indicator.service';
import { KR_STOCKS } from '../constants/kr-stocks.constant';
import { StockSummary } from '../usecases/get-stock-list.usecase';

const REFRESH_INTERVAL_MS = 30 * 60 * 1000; // 30분

@Injectable()
export class StockCacheService implements OnModuleInit {
  private readonly logger = new Logger(StockCacheService.name);
  private cache: StockSummary[] = [];
  private updatedAt: Date | null = null;

  constructor(
    private readonly yahooFinanceService: YahooFinanceService,
    private readonly technicalIndicatorService: TechnicalIndicatorService,
  ) {}

  async onModuleInit() {
    this.logger.log('서버 시작 — 주식 데이터 초기 로딩 시작');
    await this.refresh();
    setInterval(() => this.refresh(), REFRESH_INTERVAL_MS);
  }

  async refresh() {
    this.logger.log(`주식 데이터 갱신 시작 (${KR_STOCKS.length}개 종목)`);
    const tickers = KR_STOCKS.map((s) => s.ticker);

    const [quotesMap, historicalMap] = await Promise.all([
      this.yahooFinanceService.getMultipleQuotes(tickers),
      Promise.allSettled(
        tickers.map((ticker) =>
          this.yahooFinanceService.getHistorical(ticker).then((candles) => ({ ticker, candles })),
        ),
      ).then((results) => {
        const map = new Map<string, any[]>();
        for (const r of results) {
          if (r.status === 'fulfilled') map.set(r.value.ticker, r.value.candles);
        }
        return map;
      }),
    ]);

    const summaries: StockSummary[] = [];
    for (const stock of KR_STOCKS) {
      const quote = quotesMap.get(stock.ticker);
      const candles = historicalMap.get(stock.ticker) ?? [];
      if (!quote) continue;

      const indicators = this.technicalIndicatorService.calculate(candles, quote.regularMarketPrice);
      summaries.push({
        ticker: stock.ticker,
        name: stock.name,
        market: stock.market,
        sector: stock.sector,
        price: quote.regularMarketPrice,
        change: Math.round(quote.regularMarketChange * 100) / 100,
        changePercent: Math.round(quote.regularMarketChangePercent * 100) / 100,
        volume: quote.regularMarketVolume,
        marketCap: quote.marketCap,
        signal: indicators.signal,
        signalScore: indicators.signalScore,
        rsi: indicators.rsi,
        ma20: indicators.movingAverages.ma20,
      });
    }

    this.cache = summaries;
    this.updatedAt = new Date();
    this.logger.log(`주식 데이터 갱신 완료 (${summaries.length}개)`);
  }

  getCache(): { stocks: StockSummary[]; updatedAt: string } {
    return {
      stocks: this.cache,
      updatedAt: (this.updatedAt ?? new Date()).toISOString(),
    };
  }

  isReady(): boolean {
    return this.cache.length > 0;
  }
}
