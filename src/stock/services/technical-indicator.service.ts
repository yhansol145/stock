import { Injectable } from '@nestjs/common';
import { RSI, MACD, BollingerBands, SMA } from 'technicalindicators';
import { HistoricalCandle } from './yahoo-finance.service';

export type TradingSignal = 'strong_buy' | 'buy' | 'neutral' | 'sell' | 'strong_sell';

export interface MacdResult {
  macd: number;
  signal: number;
  histogram: number;
}

export interface BollingerBandsResult {
  upper: number;
  middle: number;
  lower: number;
  bandwidth: number;
}

export interface MovingAverages {
  ma5: number | null;
  ma20: number | null;
  ma60: number | null;
  ma120: number | null;
}

export interface TechnicalIndicators {
  rsi: number | null;
  macd: MacdResult | null;
  bollingerBands: BollingerBandsResult | null;
  movingAverages: MovingAverages;
  signal: TradingSignal;
  signalScore: number;
  signalReasons: string[];
}

@Injectable()
export class TechnicalIndicatorService {
  calculate(candles: HistoricalCandle[], currentPrice: number): TechnicalIndicators {
    const closes = candles.map((c) => c.close);

    const rsi = this.calcRsi(closes);
    const macd = this.calcMacd(closes);
    const bb = this.calcBollingerBands(closes);
    const ma = this.calcMovingAverages(closes);

    const { score, reasons } = this.scoreSignal(rsi, macd, bb, ma, currentPrice);
    const signal = this.scoreToSignal(score);

    return { rsi, macd, bollingerBands: bb, movingAverages: ma, signal, signalScore: score, signalReasons: reasons };
  }

  private calcRsi(closes: number[]): number | null {
    if (closes.length < 15) return null;
    const values = RSI.calculate({ values: closes, period: 14 });
    return values.length > 0 ? Math.round(values[values.length - 1] * 100) / 100 : null;
  }

  private calcMacd(closes: number[]): MacdResult | null {
    if (closes.length < 27) return null;
    const values = MACD.calculate({
      values: closes,
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
      SimpleMAOscillator: false,
      SimpleMASignal: false,
    });
    if (values.length === 0) return null;
    const last = values[values.length - 1];
    return {
      macd: Math.round((last.MACD ?? 0) * 100) / 100,
      signal: Math.round((last.signal ?? 0) * 100) / 100,
      histogram: Math.round((last.histogram ?? 0) * 100) / 100,
    };
  }

  private calcBollingerBands(closes: number[]): BollingerBandsResult | null {
    if (closes.length < 20) return null;
    const values = BollingerBands.calculate({ values: closes, period: 20, stdDev: 2 });
    if (values.length === 0) return null;
    const last = values[values.length - 1];
    const bandwidth = last.upper - last.lower > 0
      ? Math.round(((last.upper - last.lower) / last.middle) * 10000) / 100
      : 0;
    return {
      upper: Math.round(last.upper),
      middle: Math.round(last.middle),
      lower: Math.round(last.lower),
      bandwidth,
    };
  }

  private calcMovingAverages(closes: number[]): MovingAverages {
    const calc = (period: number) => {
      if (closes.length < period) return null;
      const values = SMA.calculate({ values: closes, period });
      return values.length > 0 ? Math.round(values[values.length - 1]) : null;
    };
    return { ma5: calc(5), ma20: calc(20), ma60: calc(60), ma120: calc(120) };
  }

  private scoreSignal(
    rsi: number | null,
    macd: MacdResult | null,
    bb: BollingerBandsResult | null,
    ma: MovingAverages,
    price: number,
  ): { score: number; reasons: string[] } {
    let score = 0;
    const reasons: string[] = [];

    if (rsi !== null) {
      if (rsi < 30) { score += 2; reasons.push(`RSI ${rsi} (과매도 구간)`); }
      else if (rsi < 40) { score += 1; reasons.push(`RSI ${rsi} (저평가 구간)`); }
      else if (rsi > 70) { score -= 2; reasons.push(`RSI ${rsi} (과매수 구간)`); }
      else if (rsi > 60) { score -= 1; reasons.push(`RSI ${rsi} (고평가 구간)`); }
    }

    if (macd !== null) {
      if (macd.histogram > 0) { score += 1; reasons.push('MACD 히스토그램 양수 (상승 모멘텀)'); }
      else { score -= 1; reasons.push('MACD 히스토그램 음수 (하락 모멘텀)'); }
      if (macd.macd > macd.signal) { score += 1; reasons.push('MACD > Signal (골든크로스 신호)'); }
      else { score -= 1; reasons.push('MACD < Signal (데드크로스 신호)'); }
    }

    if (ma.ma20 !== null) {
      if (price > ma.ma20) { score += 1; reasons.push(`현재가 MA20(${ma.ma20.toLocaleString()}) 상회`); }
      else { score -= 1; reasons.push(`현재가 MA20(${ma.ma20.toLocaleString()}) 하회`); }
    }
    if (ma.ma60 !== null) {
      if (price > ma.ma60) { score += 1; reasons.push(`현재가 MA60(${ma.ma60.toLocaleString()}) 상회`); }
      else { score -= 1; reasons.push(`현재가 MA60(${ma.ma60.toLocaleString()}) 하회`); }
    }
    if (ma.ma20 !== null && ma.ma60 !== null) {
      if (ma.ma20 > ma.ma60) { score += 1; reasons.push('MA20 > MA60 (정배열)'); }
      else { score -= 1; reasons.push('MA20 < MA60 (역배열)'); }
    }

    if (bb !== null) {
      if (price < bb.lower) { score += 1; reasons.push('볼린저 하단 이탈 (반등 가능)'); }
      else if (price > bb.upper) { score -= 1; reasons.push('볼린저 상단 이탈 (조정 가능)'); }
    }

    return { score, reasons };
  }

  private scoreToSignal(score: number): TradingSignal {
    if (score >= 5) return 'strong_buy';
    if (score >= 2) return 'buy';
    if (score <= -5) return 'strong_sell';
    if (score <= -2) return 'sell';
    return 'neutral';
  }
}
