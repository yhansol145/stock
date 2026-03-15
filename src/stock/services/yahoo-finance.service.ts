import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export interface StockQuote {
  symbol: string;
  shortName: string;
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  regularMarketVolume: number;
  marketCap: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  regularMarketDayHigh: number | null;
  regularMarketDayLow: number | null;
}

export interface HistoricalCandle {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface ChartMeta {
  symbol: string;
  shortName?: string;
  longName?: string;
  regularMarketPrice: number;
  chartPreviousClose: number;
  regularMarketVolume: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
  marketCap?: number;
}

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  Accept: 'application/json',
};

@Injectable()
export class YahooFinanceService {
  private readonly logger = new Logger(YahooFinanceService.name);

  private async fetchChart(ticker: string, range = '6mo'): Promise<{ meta: ChartMeta; timestamps: number[]; ohlcv: any } | null> {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}`;
      const { data } = await axios.get(url, {
        params: { interval: '1d', range },
        headers: HEADERS,
        timeout: 10000,
      });
      const result = data?.chart?.result?.[0];
      if (!result) return null;
      return {
        meta: result.meta as ChartMeta,
        timestamps: result.timestamp ?? [],
        ohlcv: result.indicators?.quote?.[0] ?? {},
      };
    } catch (error) {
      this.logger.warn(`Chart fetch failed for ${ticker}: ${(error as Error).message}`);
      return null;
    }
  }

  async getQuote(ticker: string): Promise<StockQuote | null> {
    const chart = await this.fetchChart(ticker, '5d');
    if (!chart) return null;

    const { meta } = chart;
    const change = meta.regularMarketPrice - meta.chartPreviousClose;
    const changePercent = meta.chartPreviousClose
      ? (change / meta.chartPreviousClose) * 100
      : 0;

    return {
      symbol: meta.symbol,
      shortName: meta.shortName ?? meta.longName ?? ticker,
      regularMarketPrice: meta.regularMarketPrice,
      regularMarketChange: Math.round(change * 100) / 100,
      regularMarketChangePercent: Math.round(changePercent * 100) / 100,
      regularMarketVolume: meta.regularMarketVolume,
      marketCap: meta.marketCap ?? null,
      fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh ?? null,
      fiftyTwoWeekLow: meta.fiftyTwoWeekLow ?? null,
      regularMarketDayHigh: meta.regularMarketDayHigh ?? null,
      regularMarketDayLow: meta.regularMarketDayLow ?? null,
    };
  }

  async getHistorical(ticker: string): Promise<HistoricalCandle[]> {
    const chart = await this.fetchChart(ticker, '6mo');
    if (!chart) return [];

    const { timestamps, ohlcv } = chart;
    const candles: HistoricalCandle[] = [];

    for (let i = 0; i < timestamps.length; i++) {
      const close = ohlcv.close?.[i];
      if (close == null) continue;
      candles.push({
        date: new Date(timestamps[i] * 1000),
        open: ohlcv.open?.[i] ?? close,
        high: ohlcv.high?.[i] ?? close,
        low: ohlcv.low?.[i] ?? close,
        close,
        volume: ohlcv.volume?.[i] ?? 0,
      });
    }
    return candles;
  }

  async getMultipleQuotes(tickers: string[]): Promise<Map<string, StockQuote>> {
    const settled = await Promise.allSettled(
      tickers.map((ticker) => this.getQuote(ticker).then((quote) => ({ ticker, quote }))),
    );
    const map = new Map<string, StockQuote>();
    for (const r of settled) {
      if (r.status === 'fulfilled' && r.value.quote) {
        map.set(r.value.ticker, r.value.quote);
      }
    }
    return map;
  }
}
