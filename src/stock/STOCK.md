# 국내 주식 분석 서비스

Yahoo Finance API(v8)를 이용해 국내 주식 시세와 기술적 지표를 실시간으로 제공하는 NestJS 기반 분석 서비스입니다.

---

## API 엔드포인트

### 시장 현황

#### `GET /market`
KOSPI, KOSDAQ, KOSPI200 지수 현황과 시장 개폐장 상태를 반환합니다.

**Response**
```json
{
  "status": "open | closed | pre-market",
  "indices": {
    "KOSPI":    { "name": "KOSPI",     "value": 2650.5, "change": -15.3, "changePercent": -0.57, "dayHigh": 2665.0, "dayLow": 2640.0 },
    "KOSDAQ":   { "name": "KOSDAQ",    "value": 870.2,  "change":  -1.7, "changePercent": -0.19, "dayHigh":  875.0, "dayLow":  865.0 },
    "KOSPI200": { "name": "KOSPI 200", "value": 350.1,  "change":  -2.1, "changePercent": -0.60, "dayHigh":  352.0, "dayLow":  348.0 }
  },
  "summary": "KOSPI 2,650.5 (-0.57% 하락)",
  "updatedAt": "2026-03-14T09:30:00.000Z"
}
```

| 필드 | 설명 |
|---|---|
| `status` | `open` (장중) / `pre-market` (동시호가 09:00~09:30 KST) / `closed` (장 종료) |
| `indices` | 각 지수의 현재가, 전일 대비 변동, 당일 고/저가 |
| `summary` | 사람이 읽기 쉬운 KOSPI 요약 문자열 |

---

### 종목 목록

#### `GET /stocks`
추적 중인 전체 종목의 현재가, 기술적 신호, RSI, MA20을 반환합니다. `signalScore` 내림차순으로 정렬됩니다.

#### `GET /stocks?market=KOSPI`
#### `GET /stocks?market=KOSDAQ`
시장별 필터링을 지원합니다.

**Response**
```json
{
  "stocks": [
    {
      "ticker": "005930.KS",
      "name": "삼성전자",
      "market": "KOSPI",
      "sector": "반도체",
      "price": 75000,
      "change": 1500,
      "changePercent": 2.04,
      "volume": 15000000,
      "marketCap": null,
      "signal": "buy",
      "signalScore": 3,
      "rsi": 45.2,
      "ma20": 72000
    }
  ],
  "updatedAt": "2026-03-14T09:30:00.000Z"
}
```

---

### 종목 상세

#### `GET /stocks/:ticker`
특정 종목의 상세 지표, 최근 30일 캔들 데이터를 반환합니다.

**예시**
```
GET /stocks/005930.KS
GET /stocks/000660.KS
GET /stocks/247540.KQ
```

**Response**
```json
{
  "ticker": "005930.KS",
  "name": "삼성전자",
  "market": "KOSPI",
  "sector": "반도체",
  "price": 75000,
  "change": 1500,
  "changePercent": 2.04,
  "volume": 15000000,
  "marketCap": null,
  "dayHigh": 75500,
  "dayLow": 73200,
  "fiftyTwoWeekHigh": 88000,
  "fiftyTwoWeekLow": 53000,
  "indicators": {
    "rsi": 45.2,
    "macd": {
      "macd": 250.5,
      "signal": 200.1,
      "histogram": 50.4
    },
    "bollingerBands": {
      "upper": 80000,
      "middle": 74000,
      "lower": 68000,
      "bandwidth": 16.22
    },
    "movingAverages": {
      "ma5": 74500,
      "ma20": 72000,
      "ma60": 69000,
      "ma120": 65000
    },
    "signal": "buy",
    "signalScore": 3,
    "signalReasons": [
      "RSI 45.2 (저평가 구간)",
      "MACD 히스토그램 양수 (상승 모멘텀)",
      "MACD > Signal (골든크로스 신호)",
      "현재가 MA20(72,000) 상회",
      "현재가 MA60(69,000) 상회",
      "MA20 > MA60 (정배열)"
    ]
  },
  "recentPrices": [
    { "date": "2026-03-13", "open": 73500, "high": 75500, "low": 73200, "close": 75000, "volume": 15000000 }
  ],
  "updatedAt": "2026-03-14T09:30:00.000Z"
}
```

---

## 기술적 지표 설명

### RSI (Relative Strength Index) — 14일
상대강도지수. 최근 가격 변동의 속도와 크기를 측정합니다.

| 구간 | 해석 |
|---|---|
| < 30 | 과매도 — 반등 가능성 (매수 신호 +2점) |
| 30~40 | 저평가 구간 (매수 신호 +1점) |
| 40~60 | 중립 |
| 60~70 | 고평가 구간 (매도 신호 -1점) |
| > 70 | 과매수 — 조정 가능성 (매도 신호 -2점) |

### MACD (Moving Average Convergence Divergence)
12일/26일 지수이동평균의 차이. 추세 전환 시점을 포착합니다.

| 조건 | 해석 |
|---|---|
| 히스토그램 > 0 | 상승 모멘텀 (+1점) |
| 히스토그램 < 0 | 하락 모멘텀 (-1점) |
| MACD > Signal | 골든크로스 (매수 신호 +1점) |
| MACD < Signal | 데드크로스 (매도 신호 -1점) |

### 볼린저 밴드 (Bollinger Bands) — 20일, 2σ
가격의 변동성 범위를 상/중/하단 밴드로 표시합니다.

| 조건 | 해석 |
|---|---|
| 현재가 < 하단 | 하단 이탈 — 반등 가능 (+1점) |
| 현재가 > 상단 | 상단 이탈 — 조정 가능 (-1점) |
| `bandwidth` | 밴드폭(%). 값이 낮으면 변동성 수축 → 큰 움직임 예고 |

### 이동평균 (Moving Average)
| 기간 | 용도 |
|---|---|
| MA5 | 초단기 추세 |
| MA20 | 단기 추세 (볼린저 중심선) |
| MA60 | 중기 추세 |
| MA120 | 장기 추세 (6개월) |

| 조건 | 해석 |
|---|---|
| 현재가 > MA20 | 단기 상승 추세 (+1점) |
| 현재가 > MA60 | 중기 상승 추세 (+1점) |
| MA20 > MA60 | 정배열 — 상승 기조 (+1점) |
| MA20 < MA60 | 역배열 — 하락 기조 (-1점) |

### 종합 신호 (Signal)
위 지표들을 종합한 점수로 매매 신호를 산출합니다.

| Signal | 점수 범위 | 해석 |
|---|---|---|
| `strong_buy` | ≥ 5 | 강력 매수 |
| `buy` | 2 ~ 4 | 매수 |
| `neutral` | -1 ~ 1 | 중립 |
| `sell` | -4 ~ -2 | 매도 |
| `strong_sell` | ≤ -5 | 강력 매도 |

> **주의**: 이 신호는 기술적 지표만을 기반으로 한 참고 정보입니다. 실제 투자 결정에는 펀더멘털 분석, 시장 상황 등을 종합적으로 고려하세요.

---

## 추적 종목

### KOSPI (15개)
| 티커 | 종목명 | 섹터 |
|---|---|---|
| 005930.KS | 삼성전자 | 반도체 |
| 000660.KS | SK하이닉스 | 반도체 |
| 373220.KS | LG에너지솔루션 | 배터리 |
| 207940.KS | 삼성바이오로직스 | 바이오 |
| 005380.KS | 현대차 | 자동차 |
| 000270.KS | 기아 | 자동차 |
| 035420.KS | NAVER | IT |
| 035720.KS | 카카오 | IT |
| 051910.KS | LG화학 | 화학 |
| 006400.KS | 삼성SDI | 배터리 |
| 105560.KS | KB금융 | 금융 |
| 055550.KS | 신한지주 | 금융 |
| 068270.KS | 셀트리온 | 바이오 |
| 047050.KS | POSCO홀딩스 | 철강 |
| 096770.KS | SK이노베이션 | 에너지 |

### KOSDAQ (5개)
| 티커 | 종목명 | 섹터 |
|---|---|---|
| 247540.KQ | 에코프로비엠 | 배터리소재 |
| 086520.KQ | 에코프로 | 배터리소재 |
| 196170.KQ | 알테오젠 | 바이오 |
| 263750.KQ | 펄어비스 | 게임 |
| 112040.KQ | 위메이드 | 게임 |

종목 추가/제거는 [`constants/kr-stocks.constant.ts`](./constants/kr-stocks.constant.ts)에서 관리합니다.

---

## 프로젝트 구조

```
src/stock/
├── STOCK.md                              # 이 문서
├── constants/
│   └── kr-stocks.constant.ts            # 추적 종목 목록
├── services/
│   ├── yahoo-finance.service.ts         # Yahoo Finance API (axios) — 시세/캔들
│   └── technical-indicator.service.ts  # RSI, MACD, BB, MA 계산
├── usecases/
│   ├── get-stock-list.usecase.ts        # 종목 목록 + 신호 요약
│   └── get-stock-detail.usecase.ts     # 종목 상세 분석
├── stock.controller.ts                  # GET /stocks, /stocks/:ticker
└── stock.module.ts
```

### 데이터 흐름
```
HTTP 요청
   ↓
StockController
   ↓
UseCase (비즈니스 로직 조율)
   ↓                    ↓
YahooFinanceService   TechnicalIndicatorService
(시세 + 캔들 데이터)    (RSI / MACD / BB / MA 계산)
   ↓
Yahoo Finance Chart API (query1.finance.yahoo.com/v8/finance/chart)
```

### 아키텍처 특징
- **Clean Architecture**: Controller → UseCase → Service 3계층 분리
- **외부 의존성 격리**: Yahoo Finance 호출은 `YahooFinanceService`에만 집중. 데이터 소스 교체 시 이 파일만 수정하면 됩니다.
- **병렬 처리**: 여러 종목의 시세/히스토리 조회는 `Promise.allSettled`로 병렬 실행
- **Fail-safe**: 특정 종목 조회 실패 시 해당 종목만 제외하고 나머지 결과 반환

---

## 데이터 소스

- **Yahoo Finance Chart API** `v8` — 인증 불필요, 무료
  - 엔드포인트: `https://query1.finance.yahoo.com/v8/finance/chart/{ticker}`
  - KOSPI 종목: `.KS` suffix (예: `005930.KS`)
  - KOSDAQ 종목: `.KQ` suffix (예: `247540.KQ`)
  - 지수: `%5EKS11` (KOSPI), `%5EKQ11` (KOSDAQ)
  - `range=6mo&interval=1d`로 약 120거래일 일봉 데이터 수신

---

## 실행 방법

```bash
npm install
npm run start:dev   # http://localhost:3000
```
