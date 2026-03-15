import { Injectable } from '@nestjs/common';
import { StockCacheService } from '../services/stock-cache.service';

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
  constructor(private readonly stockCacheService: StockCacheService) {}

  async execute(market?: 'KOSPI' | 'KOSDAQ'): Promise<StockListResult> {
    const { stocks, updatedAt } = this.stockCacheService.getCache();
    const filtered = market ? stocks.filter((s) => s.market === market) : stocks;
    const sorted = [...filtered].sort((a, b) => b.signalScore - a.signalScore);
    return { stocks: sorted, updatedAt };
  }
}
