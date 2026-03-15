export interface KrStock {
  ticker: string;
  name: string;
  market: 'KOSPI' | 'KOSDAQ';
  sector: string;
}

export const KR_STOCKS: KrStock[] = [
  // KOSPI
  { ticker: '005930.KS', name: '삼성전자',         market: 'KOSPI', sector: '반도체' },
  { ticker: '000660.KS', name: 'SK하이닉스',       market: 'KOSPI', sector: '반도체' },
  { ticker: '042700.KS', name: '한미반도체',       market: 'KOSPI', sector: '반도체' },
  { ticker: '373220.KS', name: 'LG에너지솔루션',   market: 'KOSPI', sector: '배터리' },
  { ticker: '207940.KS', name: '삼성바이오로직스', market: 'KOSPI', sector: '바이오' },
  { ticker: '005380.KS', name: '현대차',            market: 'KOSPI', sector: '자동차' },
  { ticker: '000270.KS', name: '기아',              market: 'KOSPI', sector: '자동차' },
  { ticker: '035420.KS', name: 'NAVER',            market: 'KOSPI', sector: 'IT' },
  { ticker: '035720.KS', name: '카카오',            market: 'KOSPI', sector: 'IT' },
  { ticker: '051910.KS', name: 'LG화학',           market: 'KOSPI', sector: '화학' },
  { ticker: '006400.KS', name: '삼성SDI',          market: 'KOSPI', sector: '배터리' },
  { ticker: '105560.KS', name: 'KB금융',           market: 'KOSPI', sector: '금융' },
  { ticker: '055550.KS', name: '신한지주',          market: 'KOSPI', sector: '금융' },
  { ticker: '068270.KS', name: '셀트리온',          market: 'KOSPI', sector: '바이오' },
  { ticker: '047050.KS', name: 'POSCO홀딩스',      market: 'KOSPI', sector: '철강' },
  { ticker: '096770.KS', name: 'SK이노베이션',      market: 'KOSPI', sector: '에너지' },
  // KOSDAQ
  { ticker: '247540.KQ', name: '에코프로비엠',      market: 'KOSDAQ', sector: '배터리소재' },
  { ticker: '086520.KQ', name: '에코프로',          market: 'KOSDAQ', sector: '배터리소재' },
  { ticker: '196170.KQ', name: '알테오젠',          market: 'KOSDAQ', sector: '바이오' },
  { ticker: '263750.KQ', name: '펄어비스',          market: 'KOSDAQ', sector: '게임' },
  { ticker: '112040.KQ', name: '위메이드',          market: 'KOSDAQ', sector: '게임' },
];
