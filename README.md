# 국내 주식 분석 API

국내 주식 시장의 기술적 지표 및 매매 신호를 제공하는 NestJS 기반 REST API입니다.

## 주요 기능

- **실시간 주가 데이터** - Yahoo Finance API를 통한 현재 주가 및 6개월 히스토리 데이터 조회
- **기술적 지표 계산** - RSI, MACD, 볼린저 밴드, 이동평균선(5/20/60/120일)
- **매매 신호 생성** - 복합 점수 기반의 강력매수/매수/중립/매도/강력매도 신호
- **시장 지수 조회** - KOSPI, KOSDAQ, KOSPI200 지수 및 시장 개장 여부
- **국내 주요 20개 종목** - 삼성전자, SK하이닉스, LG에너지솔루션 등 주요 종목 추적

## 기술 스택

- **Runtime:** Node.js
- **Framework:** NestJS 10.x
- **Language:** TypeScript 5.x
- **HTTP Client:** Axios
- **Technical Analysis:** technicalindicators

## 프로젝트 구조

```
src/
├── main.ts
├── app.module.ts
├── stock/                          # 개별 종목 분석 모듈
│   ├── stock.module.ts
│   ├── stock.controller.ts
│   ├── constants/
│   │   └── kr-stocks.constant.ts  # 추적 종목 목록
│   ├── services/
│   │   ├── yahoo-finance.service.ts
│   │   └── technical-indicator.service.ts
│   └── usecases/
│       ├── get-stock-list.usecase.ts
│       └── get-stock-detail.usecase.ts
└── market/                         # 시장 지수 모듈
    ├── market.module.ts
    ├── market.controller.ts
    ├── services/
    │   └── market-data.service.ts
    └── usecases/
        └── get-market-overview.usecase.ts
```

## 설치 및 실행

```bash
# 의존성 설치
npm install

# 개발 서버 실행 (hot-reload)
npm run start:dev

# 빌드
npm run build

# 프로덕션 실행
npm start
```

서버는 기본적으로 **포트 3000**에서 실행됩니다.

## API 엔드포인트

### 시장 지수

| Method | Endpoint  | 설명 |
|--------|-----------|------|
| GET    | `/market` | KOSPI, KOSDAQ, KOSPI200 지수 및 시장 개장 여부 |

### 종목 분석

| Method | Endpoint          | 설명 |
|--------|-------------------|------|
| GET    | `/stocks`         | 전체 종목 목록 및 매매 신호 (쿼리: `?market=KOSPI\|KOSDAQ`) |
| GET    | `/stocks/:ticker` | 특정 종목 상세 분석 (예: `/stocks/005930.KS`) |

### 응답 예시 - 종목 상세

```json
{
  "ticker": "005930.KS",
  "name": "삼성전자",
  "price": 75000,
  "change": 500,
  "changePercent": 0.67,
  "signal": "buy",
  "signalScore": 3,
  "signalReasons": ["RSI 과매도 구간", "MACD 상승 전환"],
  "indicators": {
    "rsi": 42.5,
    "macd": { "macd": 150, "signal": 120, "histogram": 30 },
    "bollingerBands": { "upper": 78000, "middle": 74000, "lower": 70000 },
    "movingAverages": { "sma5": 74500, "sma20": 73000, "sma60": 71000, "sma120": 69000 }
  }
}
```

## 매매 신호 기준

| 신호 | 점수 범위 |
|------|----------|
| `strong_buy`  | 5점 이상  |
| `buy`         | 2점 이상  |
| `neutral`     | -2 ~ 2점  |
| `sell`        | -2점 이하 |
| `strong_sell` | -5점 이하 |

## 추적 종목

삼성전자, SK하이닉스, LG에너지솔루션, 삼성바이오로직스, 현대차, 기아, 셀트리온, POSCO홀딩스, 카카오, NAVER, 삼성SDI, 현대모비스, KB금융, 신한지주, LG화학, 한국전력, 두산에너빌리티, 에코프로비엠, 포스코퓨처엠, HLB
