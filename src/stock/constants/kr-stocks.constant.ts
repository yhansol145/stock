export interface KrStock {
  ticker: string;
  name: string;
  market: 'KOSPI' | 'KOSDAQ';
  sector: string;
}

export const KR_STOCKS: KrStock[] = [
  // ── KOSPI (60) ──────────────────────────────────────────
  // 반도체
  { ticker: '005930.KS', name: '삼성전자',         market: 'KOSPI', sector: '반도체' },
  { ticker: '000660.KS', name: 'SK하이닉스',       market: 'KOSPI', sector: '반도체' },
  { ticker: '042700.KS', name: '한미반도체',       market: 'KOSPI', sector: '반도체' },
  { ticker: '009150.KS', name: '삼성전기',         market: 'KOSPI', sector: '반도체' },
  // 배터리
  { ticker: '373220.KS', name: 'LG에너지솔루션',  market: 'KOSPI', sector: '배터리' },
  { ticker: '006400.KS', name: '삼성SDI',         market: 'KOSPI', sector: '배터리' },
  { ticker: '009830.KS', name: '한화솔루션',       market: 'KOSPI', sector: '배터리' },
  // 바이오/제약
  { ticker: '207940.KS', name: '삼성바이오로직스', market: 'KOSPI', sector: '바이오' },
  { ticker: '068270.KS', name: '셀트리온',         market: 'KOSPI', sector: '바이오' },
  { ticker: '000100.KS', name: '유한양행',         market: 'KOSPI', sector: '제약' },
  { ticker: '128940.KS', name: '한미약품',         market: 'KOSPI', sector: '제약' },
  // 자동차
  { ticker: '005380.KS', name: '현대차',           market: 'KOSPI', sector: '자동차' },
  { ticker: '000270.KS', name: '기아',             market: 'KOSPI', sector: '자동차' },
  { ticker: '012330.KS', name: '현대모비스',       market: 'KOSPI', sector: '자동차부품' },
  { ticker: '086280.KS', name: '현대글로비스',     market: 'KOSPI', sector: '물류' },
  // IT
  { ticker: '035420.KS', name: 'NAVER',           market: 'KOSPI', sector: 'IT' },
  { ticker: '035720.KS', name: '카카오',           market: 'KOSPI', sector: 'IT' },
  { ticker: '323410.KS', name: '카카오뱅크',       market: 'KOSPI', sector: 'IT' },
  { ticker: '377300.KS', name: '카카오페이',       market: 'KOSPI', sector: 'IT' },
  { ticker: '259960.KS', name: '크래프톤',         market: 'KOSPI', sector: '게임' },
  // 전자
  { ticker: '066570.KS', name: 'LG전자',          market: 'KOSPI', sector: '전자' },
  { ticker: '021240.KS', name: '코웨이',           market: 'KOSPI', sector: '전자' },
  // 금융
  { ticker: '105560.KS', name: 'KB금융',          market: 'KOSPI', sector: '금융' },
  { ticker: '055550.KS', name: '신한지주',         market: 'KOSPI', sector: '금융' },
  { ticker: '086790.KS', name: '하나금융지주',     market: 'KOSPI', sector: '금융' },
  { ticker: '316140.KS', name: '우리금융지주',     market: 'KOSPI', sector: '금융' },
  { ticker: '000810.KS', name: '삼성화재',         market: 'KOSPI', sector: '보험' },
  { ticker: '032830.KS', name: '삼성생명',         market: 'KOSPI', sector: '보험' },
  { ticker: '005830.KS', name: 'DB손해보험',       market: 'KOSPI', sector: '보험' },
  // 화학
  { ticker: '051910.KS', name: 'LG화학',          market: 'KOSPI', sector: '화학' },
  { ticker: '011170.KS', name: '롯데케미칼',       market: 'KOSPI', sector: '화학' },
  // 지주
  { ticker: '028260.KS', name: '삼성물산',         market: 'KOSPI', sector: '지주' },
  { ticker: '034730.KS', name: 'SK(주)',           market: 'KOSPI', sector: '지주' },
  { ticker: '003550.KS', name: 'LG(주)',           market: 'KOSPI', sector: '지주' },
  { ticker: '078930.KS', name: 'GS(주)',           market: 'KOSPI', sector: '지주' },
  // 에너지
  { ticker: '096770.KS', name: 'SK이노베이션',     market: 'KOSPI', sector: '에너지' },
  { ticker: '034020.KS', name: '두산에너빌리티',   market: 'KOSPI', sector: '에너지' },
  { ticker: '015760.KS', name: '한국전력',         market: 'KOSPI', sector: '전력' },
  // 조선
  { ticker: '329180.KS', name: 'HD현대중공업',     market: 'KOSPI', sector: '조선' },
  { ticker: '010140.KS', name: '삼성중공업',       market: 'KOSPI', sector: '조선' },
  { ticker: '009540.KS', name: 'HD한국조선해양',   market: 'KOSPI', sector: '조선' },
  // 방산
  { ticker: '012450.KS', name: '한화에어로스페이스', market: 'KOSPI', sector: '방산' },
  { ticker: '047810.KS', name: '한국항공우주',     market: 'KOSPI', sector: '방산' },
  // 철강/금속
  { ticker: '047050.KS', name: 'POSCO홀딩스',     market: 'KOSPI', sector: '철강' },
  { ticker: '004020.KS', name: '현대제철',         market: 'KOSPI', sector: '철강' },
  { ticker: '010130.KS', name: '고려아연',         market: 'KOSPI', sector: '비철금속' },
  // 통신
  { ticker: '017670.KS', name: 'SK텔레콤',        market: 'KOSPI', sector: '통신' },
  { ticker: '030200.KS', name: 'KT',              market: 'KOSPI', sector: '통신' },
  { ticker: '032640.KS', name: 'LG유플러스',       market: 'KOSPI', sector: '통신' },
  // 건설
  { ticker: '000720.KS', name: '현대건설',         market: 'KOSPI', sector: '건설' },
  { ticker: '006360.KS', name: 'GS건설',          market: 'KOSPI', sector: '건설' },
  // 해운/항공
  { ticker: '011200.KS', name: 'HMM',             market: 'KOSPI', sector: '해운' },
  { ticker: '003490.KS', name: '대한항공',         market: 'KOSPI', sector: '항공' },
  // 식품/유통
  { ticker: '097950.KS', name: 'CJ제일제당',       market: 'KOSPI', sector: '식품' },
  { ticker: '271560.KS', name: '오리온',           market: 'KOSPI', sector: '식품' },
  { ticker: '000080.KS', name: '하이트진로',       market: 'KOSPI', sector: '음료' },
  { ticker: '139480.KS', name: '이마트',           market: 'KOSPI', sector: '유통' },
  { ticker: '069960.KS', name: '현대백화점',       market: 'KOSPI', sector: '유통' },
  { ticker: '008770.KS', name: '호텔신라',         market: 'KOSPI', sector: '유통' },
  // 화장품
  { ticker: '090430.KS', name: '아모레퍼시픽',     market: 'KOSPI', sector: '화장품' },

  // ── KOSDAQ (40) ─────────────────────────────────────────
  // 배터리소재
  { ticker: '247540.KQ', name: '에코프로비엠',     market: 'KOSDAQ', sector: '배터리소재' },
  { ticker: '086520.KQ', name: '에코프로',         market: 'KOSDAQ', sector: '배터리소재' },
  { ticker: '066970.KQ', name: '엘앤에프',         market: 'KOSDAQ', sector: '배터리소재' },
  { ticker: '278280.KQ', name: '천보',             market: 'KOSDAQ', sector: '배터리소재' },
  // 바이오
  { ticker: '196170.KQ', name: '알테오젠',         market: 'KOSDAQ', sector: '바이오' },
  { ticker: '028300.KQ', name: 'HLB',             market: 'KOSDAQ', sector: '바이오' },
  { ticker: '214450.KQ', name: '파마리서치',       market: 'KOSDAQ', sector: '바이오' },
  { ticker: '145020.KQ', name: '휴젤',             market: 'KOSDAQ', sector: '바이오' },
  { ticker: '237690.KQ', name: '에스티팜',         market: 'KOSDAQ', sector: '바이오' },
  { ticker: '039200.KQ', name: '오스코텍',         market: 'KOSDAQ', sector: '바이오' },
  { ticker: '328130.KQ', name: '루닛',             market: 'KOSDAQ', sector: '바이오' },
  { ticker: '141080.KQ', name: '레고켐바이오',     market: 'KOSDAQ', sector: '바이오' },
  // 반도체/장비
  { ticker: '357780.KQ', name: '솔브레인',         market: 'KOSDAQ', sector: '반도체소재' },
  { ticker: '058470.KQ', name: '리노공업',         market: 'KOSDAQ', sector: '반도체부품' },
  { ticker: '403870.KQ', name: 'HPSP',            market: 'KOSDAQ', sector: '반도체장비' },
  { ticker: '240810.KQ', name: '원익IPS',          market: 'KOSDAQ', sector: '반도체장비' },
  { ticker: '039030.KQ', name: '이오테크닉스',     market: 'KOSDAQ', sector: '반도체장비' },
  { ticker: '183300.KQ', name: '코미코',           market: 'KOSDAQ', sector: '반도체부품' },
  { ticker: '089030.KQ', name: '테크윙',           market: 'KOSDAQ', sector: '반도체장비' },
  // 게임
  { ticker: '263750.KQ', name: '펄어비스',         market: 'KOSDAQ', sector: '게임' },
  { ticker: '112040.KQ', name: '위메이드',         market: 'KOSDAQ', sector: '게임' },
  { ticker: '293490.KQ', name: '카카오게임즈',     market: 'KOSDAQ', sector: '게임' },
  // 의료기기
  { ticker: '145720.KQ', name: '덴티움',           market: 'KOSDAQ', sector: '의료기기' },
  { ticker: '214150.KQ', name: '클래시스',         market: 'KOSDAQ', sector: '의료기기' },
  // IT/로봇
  { ticker: '022100.KQ', name: '포스코DX',        market: 'KOSDAQ', sector: 'IT서비스' },
  { ticker: '277810.KQ', name: '레인보우로보틱스', market: 'KOSDAQ', sector: '로봇' },
  { ticker: '053800.KQ', name: '안랩',             market: 'KOSDAQ', sector: 'IT보안' },
  { ticker: '067160.KQ', name: '아프리카TV',       market: 'KOSDAQ', sector: '미디어' },
  // 엔터
  { ticker: '041510.KQ', name: 'SM엔터테인먼트',   market: 'KOSDAQ', sector: '엔터' },
  { ticker: '035900.KQ', name: 'JYP엔터테인먼트', market: 'KOSDAQ', sector: '엔터' },
  { ticker: '122870.KQ', name: '와이지엔터테인먼트', market: 'KOSDAQ', sector: '엔터' },
  // 화장품/유통
  { ticker: '257720.KQ', name: '실리콘투',         market: 'KOSDAQ', sector: '화장품유통' },
  // 전자부품
  { ticker: '091700.KQ', name: '파트론',           market: 'KOSDAQ', sector: '전자부품' },
  { ticker: '232140.KQ', name: '와이솔',           market: 'KOSDAQ', sector: '전자부품' },
  // 제약
  { ticker: '091990.KQ', name: '셀트리온제약',     market: 'KOSDAQ', sector: '제약' },
  { ticker: '131970.KQ', name: '두산테스나',       market: 'KOSDAQ', sector: '반도체' },
  { ticker: '095700.KQ', name: '제넥신',           market: 'KOSDAQ', sector: '바이오' },
  // AI/신기술
  { ticker: '900140.KQ', name: 'ENF테크놀로지',   market: 'KOSDAQ', sector: '소재' },
  { ticker: '060310.KQ', name: '3S',              market: 'KOSDAQ', sector: '반도체' },
  { ticker: '036830.KQ', name: '솔브레인홀딩스',   market: 'KOSDAQ', sector: '지주' },
];
