import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export interface IndexQuote {
  name: string;
  value: number;
  change: number;
  changePercent: number;
  dayHigh: number | null;
  dayLow: number | null;
}

const INDICES = [
  { key: 'KOSPI', ticker: '%5EKS11', name: 'KOSPI' },
  { key: 'KOSDAQ', ticker: '%5EKQ11', name: 'KOSDAQ' },
  { key: 'KOSPI200', ticker: '%5EKS200', name: 'KOSPI 200' },
];

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  Accept: 'application/json',
};

@Injectable()
export class MarketDataService {
  private readonly logger = new Logger(MarketDataService.name);

  async getIndices(): Promise<Record<string, IndexQuote>> {
    const settled = await Promise.allSettled(
      INDICES.map(async ({ key, ticker, name }) => {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}`;
        const { data } = await axios.get(url, {
          params: { interval: '1d', range: '5d' },
          headers: HEADERS,
          timeout: 10000,
        });
        const meta = data?.chart?.result?.[0]?.meta;
        if (!meta) throw new Error('No data');

        const change = meta.regularMarketPrice - meta.chartPreviousClose;
        const changePercent = meta.chartPreviousClose
          ? (change / meta.chartPreviousClose) * 100
          : 0;

        return {
          key,
          data: {
            name,
            value: Math.round(meta.regularMarketPrice * 100) / 100,
            change: Math.round(change * 100) / 100,
            changePercent: Math.round(changePercent * 100) / 100,
            dayHigh: meta.regularMarketDayHigh ?? null,
            dayLow: meta.regularMarketDayLow ?? null,
          } as IndexQuote,
        };
      }),
    );

    const indices: Record<string, IndexQuote> = {};
    for (const r of settled) {
      if (r.status === 'fulfilled') {
        indices[r.value.key] = r.value.data;
      } else {
        this.logger.warn(`Index fetch failed: ${r.reason}`);
      }
    }
    return indices;
  }

  getMarketStatus(): 'open' | 'closed' | 'pre-market' {
    // 한국 주식시장: KST 09:00~15:30 = UTC 00:00~06:30
    const now = new Date();
    const day = now.getUTCDay(); // 0=일, 6=토
    if (day === 0 || day === 6) return 'closed';

    const minutes = now.getUTCHours() * 60 + now.getUTCMinutes();
    if (minutes >= 0 && minutes < 30) return 'pre-market';   // 09:00~09:30 KST
    if (minutes >= 30 && minutes < 390) return 'open';        // 09:30~15:30 KST
    return 'closed';
  }
}
