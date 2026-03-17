import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { YahooFinanceService, StockQuote, HistoricalCandle } from './yahoo-finance.service';
import { TechnicalIndicatorService } from './technical-indicator.service';
import { KR_STOCKS } from '../constants/kr-stocks.constant';
import { StockSummary } from '../usecases/get-stock-list.usecase';

export interface StockDetailCache {
  quote: StockQuote;
  candles: HistoricalCandle[];
}

// Upstash Redis가 설정된 경우에만 import
let Redis: any;
try {
  Redis = require('@upstash/redis').Redis;
} catch {
  // 무시
}

const CACHE_KEY = 'stock:list';
const UPDATED_AT_KEY = 'stock:updatedAt';
const DETAIL_KEY = (ticker: string) => `stock:detail:${ticker.toUpperCase()}`;
const CACHE_TTL = 35 * 60;
const REFRESH_INTERVAL_MS = 30 * 60 * 1000;

@Injectable()
export class StockCacheService implements OnModuleInit {
  private readonly logger = new Logger(StockCacheService.name);

  // Redis 모드
  private redis: any | null = null;

  // 인메모리 폴백 (로컬 개발용)
  private memCache: StockSummary[] = [];
  private memDetailCache = new Map<string, StockDetailCache>();
  private memUpdatedAt: Date | null = null;

  constructor(
    private readonly yahooFinanceService: YahooFinanceService,
    private readonly technicalIndicatorService: TechnicalIndicatorService,
  ) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (Redis && url && token) {
      this.redis = new Redis({ url, token });
      this.logger.log('Redis 모드로 동작합니다.');
    } else {
      this.logger.log('인메모리 캐시 모드로 동작합니다. (로컬 개발)');
    }
  }

  async onModuleInit() {
    if (!this.redis) {
      // 인메모리 모드: 서버 시작 시 초기 로딩 + 30분 자동 갱신
      this.logger.log('서버 시작 — 주식 데이터 초기 로딩 시작');
      await this.refresh();
      setInterval(() => this.refresh(), REFRESH_INTERVAL_MS);
    }
    // Redis 모드: Vercel Cron이 /cron/refresh를 호출하므로 여기서 로딩 불필요
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
      10,
    );
    const historicalMap = new Map<string, HistoricalCandle[]>();
    for (const r of historicalResults) historicalMap.set(r.ticker, r.candles);

    const quotesMap = await this.yahooFinanceService.getMultipleQuotes(tickers);

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

    if (this.redis) {
      const pipeline = this.redis.pipeline();
      for (const [ticker, detail] of newDetailCache.entries()) {
        pipeline.set(DETAIL_KEY(ticker), JSON.stringify(detail), { ex: CACHE_TTL });
      }
      pipeline.set(CACHE_KEY, JSON.stringify(summaries), { ex: CACHE_TTL });
      pipeline.set(UPDATED_AT_KEY, new Date().toISOString(), { ex: CACHE_TTL });
      await pipeline.exec();
    } else {
      this.memCache = summaries;
      this.memDetailCache = newDetailCache;
      this.memUpdatedAt = new Date();
    }

    this.logger.log(`주식 데이터 갱신 완료 (${summaries.length}개)`);
  }

  async getCache(): Promise<{ stocks: StockSummary[]; updatedAt: string }> {
    if (this.redis) {
      const [stocksRaw, updatedAt] = await Promise.all([
        this.redis.get(CACHE_KEY) as Promise<string | null>,
        this.redis.get(UPDATED_AT_KEY) as Promise<string | null>,
      ]);
      const stocks: StockSummary[] = stocksRaw
        ? (typeof stocksRaw === 'string' ? JSON.parse(stocksRaw) : stocksRaw)
        : [];
      return { stocks, updatedAt: updatedAt ?? new Date().toISOString() };
    }

    return {
      stocks: this.memCache,
      updatedAt: (this.memUpdatedAt ?? new Date()).toISOString(),
    };
  }

  async getDetail(ticker: string): Promise<StockDetailCache | null> {
    if (this.redis) {
      const raw = await (this.redis.get(DETAIL_KEY(ticker)) as Promise<string | null>);
      if (!raw) return null;
      const cached: StockDetailCache = typeof raw === 'string' ? JSON.parse(raw) : raw;
      cached.candles = cached.candles.map((c: any) => ({ ...c, date: new Date(c.date) }));
      return cached;
    }

    return this.memDetailCache.get(ticker.toUpperCase()) ?? null;
  }

  async isReady(): Promise<boolean> {
    if (this.redis) {
      const exists = await this.redis.exists(CACHE_KEY);
      return exists > 0;
    }
    return this.memCache.length > 0;
  }
}
