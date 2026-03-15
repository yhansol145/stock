import { Injectable } from '@nestjs/common';
import { YahooFinanceService } from '../services/yahoo-finance.service';
import { TechnicalIndicatorService } from '../services/technical-indicator.service';
import { KR_STOCKS } from '../constants/kr-stocks.constant';

export interface StockSummary {
  ticker: string;
  name: string;
  market: string;
  sector: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number | null;
  signal: string;
  signalScore: number;
  rsi: number | null;
  ma20: number | null;
}

export interface StockListResult {
  stocks: StockSummary[];
  updatedAt: string;
}

@Injectable()
export class GetStockListUseCase {
  constructor(
    private readonly yahooFinanceService: YahooFinanceService,
    private readonly technicalIndicatorService: TechnicalIndicatorService,
  ) {}

  async execute(market?: 'KOSPI' | 'KOSDAQ'): Promise<StockListResult> {
    const stocks = market ? KR_STOCKS.filter((s) => s.market === market) : KR_STOCKS;
    const tickers = stocks.map((s) => s.ticker);

    const [quotesMap, historicalMap] = await Promise.all([
      this.yahooFinanceService.getMultipleQuotes(tickers),
      Promise.all(
        tickers.map((ticker) =>
          this.yahooFinanceService.getHistorical(ticker).then((candles) => ({ ticker, candles })),
        ),
      ).then((results) => new Map(results.map((r) => [r.ticker, r.candles]))),
    ]);

    const summaries: StockSummary[] = [];

    for (const stock of stocks) {
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

    summaries.sort((a, b) => b.signalScore - a.signalScore);

    return { stocks: summaries, updatedAt: new Date().toISOString() };
  }
}
