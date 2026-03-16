import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { GroqService } from '../../recommendation/services/groq.service';
import { YahooFinanceService } from '../services/yahoo-finance.service';
import { TechnicalIndicatorService } from '../services/technical-indicator.service';
import { StockCacheService } from '../services/stock-cache.service';
import { KR_STOCKS } from '../constants/kr-stocks.constant';

export interface StockAiAnalysis {
  ticker: string;
  name: string;
  opinion: '강력매수' | '매수' | '보유' | '매도' | '강력매도';
  summary: string;
  technical: string;
  shortTermOutlook: string;
  midTermOutlook: string;
  risks: string;
  generatedAt: string;
}

@Injectable()
export class GetStockAiAnalysisUseCase {
  private readonly logger = new Logger(GetStockAiAnalysisUseCase.name);

  constructor(
    private readonly yahooFinanceService: YahooFinanceService,
    private readonly technicalIndicatorService: TechnicalIndicatorService,
    private readonly groqService: GroqService,
    private readonly stockCacheService: StockCacheService,
  ) {}

  async execute(ticker: string): Promise<StockAiAnalysis> {
    const normalizedTicker = ticker.toUpperCase();
    const stockInfo = KR_STOCKS.find(
      (s) => s.ticker.toUpperCase() === normalizedTicker,
    ) ?? { ticker: normalizedTicker, name: normalizedTicker, market: 'KOSPI', sector: '기타' };

    const cached = this.stockCacheService.getDetail(normalizedTicker);
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

    const recentPrices = candles.slice(-10).map((c) => ({
      date: c.date.toISOString().split('T')[0],
      close: c.close,
      volume: c.volume,
    }));

    const prompt = this.buildPrompt(stockInfo, quote, indicators, recentPrices);

    let rawText: string;
    try {
      rawText = await this.groqService.generateText(prompt);
    } catch (err) {
      this.logger.error('Groq API 호출 실패', err);
      throw err;
    }

    return this.parseResponse(rawText, normalizedTicker, stockInfo.name);
  }

  private buildPrompt(
    stockInfo: { name: string; sector: string },
    quote: { regularMarketPrice: number; regularMarketChange: number; regularMarketChangePercent: number; regularMarketVolume: number },
    indicators: any,
    recentPrices: { date: string; close: number; volume: number }[],
  ): string {
    const ma = indicators.movingAverages;
    const bb = indicators.bollingerBands;
    const macd = indicators.macd;

    return `당신은 한국 주식 시장 전문 애널리스트입니다. 아래 데이터를 바탕으로 "${stockInfo.name}" 종목을 심층 분석해주세요.

## 종목 정보
- 종목명: ${stockInfo.name}
- 섹터: ${stockInfo.sector}
- 현재가: ${quote.regularMarketPrice.toLocaleString()}원
- 전일대비: ${quote.regularMarketChange > 0 ? '+' : ''}${quote.regularMarketChange} (${quote.regularMarketChangePercent > 0 ? '+' : ''}${quote.regularMarketChangePercent}%)
- 거래량: ${quote.regularMarketVolume.toLocaleString()}

## 기술적 지표
- RSI(14): ${indicators.rsi ?? 'N/A'}
- MACD 히스토그램: ${macd?.histogram ?? 'N/A'} / Signal: ${macd?.signal ?? 'N/A'}
- 볼린저밴드: 상단 ${bb?.upper ?? 'N/A'} / 중간 ${bb?.middle ?? 'N/A'} / 하단 ${bb?.lower ?? 'N/A'} / 밴드폭 ${bb?.bandwidth ?? 'N/A'}%
- MA5: ${ma?.ma5 ?? 'N/A'} / MA20: ${ma?.ma20 ?? 'N/A'} / MA60: ${ma?.ma60 ?? 'N/A'} / MA120: ${ma?.ma120 ?? 'N/A'}
- 종합신호: ${indicators.signal} (점수: ${indicators.signalScore})
- 신호 근거: ${(indicators.signalReasons ?? []).join(', ')}

## 최근 10일 가격 추이
${recentPrices.map((p) => `${p.date}: ${p.close.toLocaleString()}원 (거래량 ${p.volume.toLocaleString()})`)
  .join('\n')}

## 응답 형식 (반드시 아래 JSON 형식으로만 응답하세요)
{
  "opinion": "강력매수 | 매수 | 보유 | 매도 | 강력매도 중 하나",
  "summary": "종목 한 줄 평가 (60자 이내)",
  "technical": "기술적 지표 종합 분석 — RSI·MACD·볼린저밴드·이동평균을 연결해서 설명 (200자 이내)",
  "shortTermOutlook": "단기(1~2주) 전망 및 주목할 가격대 (150자 이내)",
  "midTermOutlook": "중기(1~3개월) 추세 전망 (150자 이내)",
  "risks": "투자 시 유의할 리스크 요인 2~3가지 (150자 이내)"
}

JSON 외 다른 텍스트는 절대 포함하지 마세요.`;
  }

  private parseResponse(rawText: string, ticker: string, name: string): StockAiAnalysis {
    const cleaned = rawText
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    let parsed: Omit<StockAiAnalysis, 'ticker' | 'name' | 'generatedAt'>;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      this.logger.warn('Groq 응답 JSON 파싱 실패, 원문:', rawText);
      throw new Error('AI 응답을 파싱할 수 없습니다. 다시 시도해주세요.');
    }

    return {
      ticker,
      name,
      opinion: parsed.opinion,
      summary: parsed.summary,
      technical: parsed.technical,
      shortTermOutlook: parsed.shortTermOutlook,
      midTermOutlook: parsed.midTermOutlook,
      risks: parsed.risks,
      generatedAt: new Date().toISOString(),
    };
  }
}
