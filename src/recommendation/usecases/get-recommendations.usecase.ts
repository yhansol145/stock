import { Injectable, Logger } from '@nestjs/common';
import { GroqService } from '../services/groq.service';
import { GetStockListUseCase, StockSummary } from '../../stock/usecases/get-stock-list.usecase';
import { GNewsService } from '../../news/services/gnews.service';

export interface StockRecommendation {
  rank: number;
  ticker: string;
  name: string;
  sector: string;
  reason: string;
  detail: {
    marketAnalysis: string;
    technicalAnalysis: string;
    newsImpact: string;
    riskFactors: string;
  };
}

export interface RecommendationResult {
  recommendations: StockRecommendation[];
  summary: string;
  generatedAt: string;
}

@Injectable()
export class GetRecommendationsUseCase {
  private readonly logger = new Logger(GetRecommendationsUseCase.name);

  constructor(
    private readonly geminiService: GroqService,
    private readonly getStockListUseCase: GetStockListUseCase,
    private readonly gnewsService: GNewsService,
  ) {}

  async execute(): Promise<RecommendationResult> {
    const [stockResult, koreanNews, globalNews] = await Promise.all([
      this.getStockListUseCase.execute(),
      this.gnewsService.getKoreanMarketNews(),
      this.gnewsService.getGlobalNews(),
    ]);

    const prompt = this.buildPrompt(stockResult.stocks, koreanNews, globalNews);

    let rawText: string;
    try {
      rawText = await this.geminiService.generateText(prompt);
    } catch (err) {
      this.logger.error('Gemini API 호출 실패', err);
      throw err;
    }

    return this.parseResponse(rawText);
  }

  private buildPrompt(
    stocks: StockSummary[],
    koreanNews: { title: string; description: string }[],
    globalNews: { title: string; description: string }[],
  ): string {
    const stockLines = stocks
      .map(
        (s) =>
          `- ${s.name}(${s.ticker}) | 섹터:${s.sector} | 현재가:${s.price.toLocaleString()}원 | 등락률:${s.changePercent}% | RSI:${s.rsi ?? 'N/A'} | 신호:${s.signal}(${s.signalScore})`,
      )
      .join('\n');

    const koreanNewsLines = koreanNews
      .map((n) => `- ${n.title}: ${n.description}`)
      .join('\n');

    const globalNewsLines = globalNews
      .map((n) => `- ${n.title}: ${n.description}`)
      .join('\n');

    return `당신은 한국 주식 시장 전문 애널리스트입니다. 아래 데이터를 분석하여 투자 유망 종목 9개를 추천해주세요.

## 현재 주식 데이터
${stockLines}

## 한국 증시 뉴스
${koreanNewsLines || '뉴스 없음'}

## 글로벌 뉴스
${globalNewsLines || '뉴스 없음'}

## 응답 형식 (반드시 아래 JSON 형식으로만 응답하세요)
{
  "summary": "현재 시장 상황 한 줄 요약 (50자 이내)",
  "recommendations": [
    {
      "rank": 1,
      "ticker": "종목코드",
      "name": "종목명",
      "sector": "섹터",
      "reason": "한 줄 추천 요약 (50자 이내)",
      "detail": {
        "marketAnalysis": "현재 증시 상황 및 이 종목과의 연관성 (150자 이내)",
        "technicalAnalysis": "RSI·MACD·이동평균 등 기술적 지표 분석 (150자 이내)",
        "newsImpact": "관련 뉴스가 이 종목에 미치는 영향 (150자 이내)",
        "riskFactors": "투자 시 유의해야 할 리스크 요인 (100자 이내)"
      }
    }
  ]
}

JSON 외 다른 텍스트는 절대 포함하지 마세요.`;
  }

  private parseResponse(rawText: string): RecommendationResult {
    const cleaned = rawText
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    let parsed: { summary: string; recommendations: StockRecommendation[] };
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      this.logger.warn('Gemini 응답 JSON 파싱 실패, 원문:', rawText);
      throw new Error('AI 응답을 파싱할 수 없습니다. 다시 시도해주세요.');
    }

    return {
      recommendations: parsed.recommendations ?? [],
      summary: parsed.summary ?? '',
      generatedAt: new Date().toISOString(),
    };
  }
}
