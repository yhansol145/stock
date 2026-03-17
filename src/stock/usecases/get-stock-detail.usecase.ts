import { Injectable, NotFoundException } from '@nestjs/common';
import { YahooFinanceService } from '../services/yahoo-finance.service';
import { TechnicalIndicatorService, TechnicalIndicators } from '../services/technical-indicator.service';
import { StockCacheService } from '../services/stock-cache.service';
import { KR_STOCKS, KrStock } from '../constants/kr-stocks.constant';

export interface PricePoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface StockDetailResult {
  ticker: string;
  name: string;
  market: string;
  sector: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number | null;
  dayHigh: number | null;
  dayLow: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  indicators: TechnicalIndicators;
  recentPrices: PricePoint[];
  updatedAt: string;
}

@Injectable()
export class GetStockDetailUseCase {
  constructor(
    private readonly yahooFinanceService: YahooFinanceService,
    private readonly technicalIndicatorService: TechnicalIndicatorService,
    private readonly stockCacheService: StockCacheService,
  ) {}

  async execute(ticker: string): Promise<StockDetailResult> {
    const normalizedTicker = ticker.toUpperCase();
    const stockInfo: KrStock | undefined = KR_STOCKS.find(
      (s) => s.ticker.toUpperCase() === normalizedTicker,
    ) ?? { ticker: normalizedTicker, name: normalizedTicker, market: 'KOSPI', sector: '기타' };

    const cached = await this.stockCacheService.getDetail(normalizedTicker);
    let quote = cached?.quote ?? null;
    let candles = cached?.candles ?? null;

    if (!quote || !candles) {
      [quote, candles] = await Promise.all([
        this.yahooFinanceService.getQuote(normalizedTicker),
        this.yahooFinanceService.getHistorical(normalizedTicker),
      ]);
    }

    if (!quote) {
      throw new NotFoundException(`${ticker} 종목 데이터를 가져올 수 없습니다.`);
    }

    const indicators = this.technicalIndicatorService.calculate(candles, quote.regularMarketPrice);

    const recentPrices: PricePoint[] = candles.slice(-30).map((c) => ({
      date: c.date.toISOString().split('T')[0],
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume,
    }));

    return {
      ticker: normalizedTicker,
      name: stockInfo.name,
      market: stockInfo.market,
      sector: stockInfo.sector,
      price: quote.regularMarketPrice,
      change: Math.round(quote.regularMarketChange * 100) / 100,
      changePercent: Math.round(quote.regularMarketChangePercent * 100) / 100,
      volume: quote.regularMarketVolume,
      marketCap: quote.marketCap,
      dayHigh: quote.regularMarketDayHigh,
      dayLow: quote.regularMarketDayLow,
      fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: quote.fiftyTwoWeekLow,
      indicators,
      recentPrices,
      updatedAt: new Date().toISOString(),
    };
  }
}
