import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { YahooFinanceService, StockQuote, HistoricalCandle } from './yahoo-finance.service';
import { TechnicalIndicatorService } from './technical-indicator.service';
import { KR_STOCKS } from '../constants/kr-stocks.constant';
import { StockSummary } from '../usecases/get-stock-list.usecase';

export interface StockDetailCache {
  quote: StockQuote;
  candles: HistoricalCandle[];
}

const REFRESH_INTERVAL_MS = 30 * 60 * 1000; // 30분

@Injectable()
export class StockCacheService implements OnModuleInit {
  private readonly logger = new Logger(StockCacheService.name);
  private cache: StockSummary[] = [];
  private detailCache = new Map<string, StockDetailCache>();
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

  private async runWithConcurrency<T>(tasks: (() => Promise<T>)[], limit: number): Promise<T[]> {
    const results: T[] = [];
    for (let i = 0; i < tasks.length; i += limit) {
      const batch = await Promise.allSettled(tasks.slice(i, i + limit).map((t) => t()));
      for (const r of batch) {
        if (r.status === 'fulfilled') results.push(r.value);
      }
    }
    return results;
  }

  async refresh() {
    this.logger.log(`주식 데이터 갱신 시작 (${KR_STOCKS.length}개 종목)`);
    const tickers = KR_STOCKS.map((s) => s.ticker);

    const historicalResults = await this.runWithConcurrency(
      tickers.map((ticker) => () =>
        this.yahooFinanceService.getHistorical(ticker).then((candles) => ({ ticker, candles })),
      ),
      10, // 동시 요청 10개로 제한
    );
    const historicalMap = new Map<string, any[]>();
    for (const r of historicalResults) historicalMap.set(r.ticker, r.candles);

    const [quotesMap] = await Promise.all([
      this.yahooFinanceService.getMultipleQuotes(tickers),
    ]);

    const summaries: StockSummary[] = [];
    const newDetailCache = new Map<string, StockDetailCache>();

    for (const stock of KR_STOCKS) {
      const quote = quotesMap.get(stock.ticker);
      const candles = historicalMap.get(stock.ticker) ?? [];
      if (!quote) continue;

      newDetailCache.set(stock.ticker.toUpperCase(), { quote, candles });

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
    this.detailCache = newDetailCache;
    this.updatedAt = new Date();
    this.logger.log(`주식 데이터 갱신 완료 (${summaries.length}개)`);
  }

  getCache(): { stocks: StockSummary[]; updatedAt: string } {
    return {
      stocks: this.cache,
      updatedAt: (this.updatedAt ?? new Date()).toISOString(),
    };
  }

  getDetail(ticker: string): StockDetailCache | null {
    return this.detailCache.get(ticker.toUpperCase()) ?? null;
  }

  isReady(): boolean {
    return this.cache.length > 0;
  }
}
