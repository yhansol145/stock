import { Injectable } from '@nestjs/common';
import { MarketDataService, IndexQuote } from '../services/market-data.service';

export interface MarketOverviewResult {
  status: 'open' | 'closed' | 'pre-market';
  indices: Record<string, IndexQuote>;
  summary: string;
  updatedAt: string;
}

@Injectable()
export class GetMarketOverviewUseCase {
  constructor(private readonly marketDataService: MarketDataService) {}

  async execute(): Promise<MarketOverviewResult> {
    const [status, indices] = await Promise.all([
      this.marketDataService.getMarketStatus(),
      this.marketDataService.getIndices(),
    ]);

    const kospi = indices['KOSPI'];
    let summary = '';
    if (kospi) {
      const direction = kospi.changePercent > 0 ? '상승' : kospi.changePercent < 0 ? '하락' : '보합';
      summary = `KOSPI ${kospi.value.toLocaleString()} (${kospi.changePercent > 0 ? '+' : ''}${kospi.changePercent}% ${direction})`;
    }

    return {
      status,
      indices,
      summary,
      updatedAt: new Date().toISOString(),
    };
  }
}
