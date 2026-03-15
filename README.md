# 국내 주식 분석 대시보드

국내 주식 시장의 기술적 지표, 매매 신호, 글로벌 뉴스를 제공하는 NestJS 기반 REST API + 웹 대시보드입니다.

## 주요 기능

- **실시간 주가 데이터** - Yahoo Finance API를 통한 현재 주가 및 6개월 히스토리 데이터 조회
- **기술적 지표 계산** - RSI, MACD, 볼린저 밴드, 이동평균선(5/20/60/120일)
- **매매 신호 생성** - 복합 점수 기반의 강력매수/매수/중립/매도/강력매도 신호
- **시장 지수 조회** - KOSPI, KOSDAQ, KOSPI200 지수 및 시장 개장 여부
- **종목 검색** - 종목명 regex 검색 지원
- **시장 뉴스** - GNews API를 통한 한국 증시 뉴스 및 글로벌 이슈 제공
- **웹 대시보드** - 주가, 지표, 뉴스를 한눈에 볼 수 있는 UI

## 기술 스택

- **Runtime:** Node.js
- **Framework:** NestJS 10.x
- **Language:** TypeScript 5.x
- **HTTP Client:** Axios
- **Technical Analysis:** technicalindicators
- **News:** GNews API
- **Config:** @nestjs/config

## 환경 변수

프로젝트 루트에 `.env` 파일을 생성하고 아래 값을 설정합니다.

```
GNEWS_API_KEY=your_gnews_api_key
```

GNews API 키는 [gnews.io](https://gnews.io)에서 무료로 발급받을 수 있습니다. (무료 플랜: 하루 100건)

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
│       ├── get-stock-detail.usecase.ts
│       └── search-stocks.usecase.ts
├── market/                         # 시장 지수 모듈
│   ├── market.module.ts
│   ├── market.controller.ts
│   ├── services/
│   │   └── market-data.service.ts
│   └── usecases/
│       └── get-market-overview.usecase.ts
└── news/                           # 뉴스 모듈
    ├── news.module.ts
    ├── news.controller.ts
    ├── services/
    │   └── gnews.service.ts
    └── usecases/
        └── get-news.usecase.ts
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
대시보드는 브라우저에서 `http://localhost:3000` 으로 접속합니다.

## API 엔드포인트

### 시장 지수

| Method | Endpoint  | 설명 |
|--------|-----------|------|
| GET    | `/market` | KOSPI, KOSDAQ, KOSPI200 지수 및 시장 개장 여부 |

### 종목 분석

| Method | Endpoint              | 설명 |
|--------|-----------------------|------|
| GET    | `/stocks`             | 전체 종목 목록 및 매매 신호 (쿼리: `?market=KOSPI\|KOSDAQ`) |
| GET    | `/stocks/search`      | 종목명 검색 (쿼리: `?query=삼성`, regex 지원) |
| GET    | `/stocks/:ticker`     | 특정 종목 상세 분석 (예: `/stocks/005930.KS`) |

### 뉴스

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET    | `/news`  | 한국 증시 뉴스(korean) + 글로벌 이슈(global) |

### 응답 예시 - 뉴스

```json
{
  "korean": [
    {
      "title": "KOSPI rises as semiconductor stocks rally",
      "description": "...",
      "url": "https://...",
      "source": "Reuters",
      "publishedAt": "2026-03-15T08:00:00Z"
    }
  ],
  "global": [...],
  "fetchedAt": "2026-03-15T09:00:00Z"
}
```

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
    "movingAverages": { "ma5": 74500, "ma20": 73000, "ma60": 71000, "ma120": 69000 }
  }
}
```

## 매매 신호 기준

| 신호 | 점수 범위 |
|------|----------|
| `strong_buy`  | 5점 이상  |
| `buy`         | 2 ~ 4점   |
| `neutral`     | -1 ~ 1점  |
| `sell`        | -2 ~ -4점 |
| `strong_sell` | -5점 이하 |

## 추적 종목

**KOSPI (15종목)**
삼성전자, SK하이닉스, LG에너지솔루션, 삼성바이오로직스, 현대차, 기아, NAVER, 카카오, LG화학, 삼성SDI, KB금융, 신한지주, 셀트리온, POSCO홀딩스, SK이노베이션

**KOSDAQ (5종목)**
에코프로비엠, 에코프로, 알테오젠, 펄어비스, 위메이드
