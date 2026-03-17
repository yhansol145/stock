# CLAUDE.md — Stock Analysis API

## 프로젝트 개요

한국 주식시장(KOSPI/KOSDAQ) 실시간 분석 플랫폼. Yahoo Finance에서 100개 주요 종목 데이터를 수집하고, 기술적 지표를 계산하며, Groq LLaMA 3.3 70B AI로 투자 분석/추천을 제공한다.

- **버전:** 1.0.6
- **서버 포트:** 3000 (hardcoded in `src/main.ts`)
- **프론트엔드:** `public/` 정적 파일 (ServeStaticModule)

---

## 기술 스택

| 항목 | 내용 |
|------|------|
| 프레임워크 | NestJS 10.x |
| 언어 | TypeScript 5.x (strict mode) |
| AI/LLM | Groq SDK (LLaMA 3.3 70B), Google Gemini (설정됨, 미사용) |
| 주가 데이터 | Yahoo Finance API (비공식, axios) |
| 뉴스 | GNews API |
| 기술 지표 | `technicalindicators` 라이브러리 |
| DB | 없음 — 인메모리 캐시 (StockCacheService) |
| 환경변수 | `@nestjs/config` (ConfigModule.forRoot isGlobal) |

---

## 디렉터리 구조

```
src/
├── app.module.ts                  # 루트 모듈
├── main.ts                        # 진입점
├── stock/                         # 주식 분석 모듈
│   ├── stock.controller.ts
│   ├── services/
│   │   ├── yahoo-finance.service.ts       # 주가 데이터 API
│   │   ├── technical-indicator.service.ts # 지표 계산
│   │   └── stock-cache.service.ts         # 인메모리 캐시 (30분 자동 갱신)
│   └── usecases/
│       ├── get-stock-list.usecase.ts
│       ├── get-stock-detail.usecase.ts
│       ├── search-stocks.usecase.ts
│       └── get-stock-ai-analysis.usecase.ts
├── market/                        # 시장 지수 모듈 (KOSPI/KOSDAQ/KOSPI200)
├── news/                          # 뉴스 집계 모듈 (GNews)
└── recommendation/                # AI 종목 추천 모듈
    └── services/
        └── groq.service.ts        # Groq LLM 클라이언트
```

---

## 아키텍처 패턴

**레이어:** Controller → Usecase → Service → 외부 API

- **Controller:** HTTP 라우팅만 담당
- **Usecase:** 비즈니스 로직 (단일 책임)
- **Service:** 외부 API 통합, 캐시, 계산

**데이터 흐름 예시 (`GET /stocks/:ticker`):**
```
StockController → GetStockDetailUseCase
  → StockCacheService (캐시 확인)
  → YahooFinanceService (미스 시 API 호출)
  → TechnicalIndicatorService (RSI, MACD, BB, MA 계산)
  → StockDetailResult 반환
```

---

## API 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| GET | `/market` | KOSPI/KOSDAQ/KOSPI200 지수 + 시장 상태 |
| GET | `/stocks` | 전체 종목 목록 (`?market=KOSPI\|KOSDAQ`) |
| GET | `/stocks/search` | 종목명 검색 (`?query=삼성`) |
| GET | `/stocks/:ticker` | 개별 종목 기술 분석 |
| GET | `/stocks/:ticker/ai-analysis` | Groq AI 심층 분석 |
| GET | `/news` | 한국 시장 뉴스 + 글로벌 헤드라인 |
| GET | `/recommendations` | AI 종목 추천 8개 |

---

## 핵심 도메인 지식

**종목 수:** KOSPI 60개 + KOSDAQ 40개 = 100개

**티커 형식:**
- KOSPI: `XXXXXX.KS` (예: `005930.KS` 삼성전자)
- KOSDAQ: `XXXXXX.KQ`

**매매 신호 (5단계):**

| 신호 | 점수 |
|------|------|
| strong_buy | ≥ 5 |
| buy | 2 ~ 4 |
| neutral | -1 ~ 1 |
| sell | -2 ~ -4 |
| strong_sell | ≤ -5 |

**기술 지표:**
- RSI(14), MACD(12,26,9), Bollinger Bands(20,2), MA(5/20/60/120일)

**시장 운영시간:** 09:00~15:30 KST (UTC 00:00~06:30)

**캐시 전략:**
- `StockCacheService` — 서버 시작 시 초기 로드, 30분마다 자동 갱신
- 동시 API 요청 최대 10개 제한 (`runWithConcurrency`)
- `Promise.allSettled()` 사용 — 개별 종목 실패가 전체를 중단시키지 않음

---

## 환경변수

```
GNEWS_API_KEY=    # gnews.io (무료: 100 req/day)
GROQ_API_KEY=     # console.groq.com (무료)
GEMINI_API_KEY=   # Google Gemini (설정됨, 현재 미사용)
```

---

## 개발 명령어

```bash
npm run start:dev   # 개발 서버 (ts-node-dev, hot-reload)
npm run build       # TypeScript 컴파일 → dist/
npm start           # 프로덕션 실행 (dist/ 빌드 필요)
```

---

## AI/LLM 통합 패턴

- **Groq 서비스:** `src/recommendation/services/groq.service.ts`
- **응답 파싱:** 마크다운 코드블록(` ```json ``` `) 제거 후 JSON.parse
- **구조화 프롬프트:** role 정의 + 데이터 컨텍스트 + JSON 포맷 명세
- **AI 분석 결과 형식:**

```typescript
{
  opinion: '강력매수' | '매수' | '보유' | '매도' | '강력매도',
  summary, technical, shortTermOutlook, midTermOutlook, risks,
  generatedAt
}
```

---

## 주의사항 및 알려진 제약

- **테스트 없음:** 자동화 테스트(Jest 등) 미작성
- **인증 없음:** 모든 엔드포인트 공개
- **포트 하드코딩:** `main.ts`에 3000 고정
- **Regex 검색:** 사용자 입력을 `new RegExp()` 직접 사용 (try-catch로 보호됨)
- **GNews 무료 한도:** 100 req/day
- **캐시 워밍:** 서버 시작 시 약 10~30초 소요 (100개 종목 × Yahoo Finance API)

---

## 참고 문서

- `README.md` — 셋업, API 명세, 종목 목록, 신호 정의
- `AI_AGENT_DEV_GUIDE.md` — LLM 베스트 프랙티스, 툴 설계, 평가 프레임워크
