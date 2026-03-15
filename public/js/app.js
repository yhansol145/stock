// ─── 글로벌 툴팁 ─────────────────────────────────────────
const gTooltip = document.getElementById('g-tooltip');
let tooltipTarget = null;

document.addEventListener('mouseover', (e) => {
  const el = e.target.closest('[data-tip]');
  if (!el) return;
  tooltipTarget = el;
  gTooltip.textContent = el.dataset.tip;
  gTooltip.classList.add('visible');
});

document.addEventListener('mousemove', (e) => {
  if (!tooltipTarget) return;
  const pad = 14;
  const tw  = gTooltip.offsetWidth;
  const th  = gTooltip.offsetHeight;
  let x = e.clientX + pad;
  let y = e.clientY - th - pad;
  if (x + tw > window.innerWidth - 8)  x = e.clientX - tw - pad;
  if (y < 8)                            y = e.clientY + pad;
  gTooltip.style.left = x + 'px';
  gTooltip.style.top  = y + 'px';
});

document.addEventListener('mouseout', (e) => {
  if (!tooltipTarget) return;
  if (!tooltipTarget.contains(e.relatedTarget)) {
    gTooltip.classList.remove('visible');
    tooltipTarget = null;
  }
});

document.addEventListener('scroll', () => {
  gTooltip.classList.remove('visible');
  tooltipTarget = null;
}, true);

// ─── 상태 ───────────────────────────────────────────────
let allStocks = [];       // 서버에서 받은 전체 종목 (필터 전)
let currentMarket = 'ALL';
let currentQuery = '';
let currentPage = 1;
const PER_PAGE = 10;
let sortKey = 'volume';   // 'name' | 'price' | 'changePercent' | 'volume'
let sortDir = 'desc';     // 'asc' | 'desc'
let priceChart = null;

// ─── 유틸 ────────────────────────────────────────────────
const fmt  = (n) => n == null ? '-' : Number(n).toLocaleString('ko-KR');
const fmtP = (n) => n == null ? '-' : `${n > 0 ? '+' : ''}${n.toFixed(2)}%`;
const fmtV = (n) => {
  if (n == null) return '-';
  if (n >= 1e8) return (n / 1e8).toFixed(1) + '억';
  if (n >= 1e4) return (n / 1e4).toFixed(0) + '만';
  return n.toLocaleString();
};

const changeClass = (v) => v > 0 ? 'up' : v < 0 ? 'down' : 'flat';

const SIGNAL_MAP = {
  strong_buy:  { label: '강력 매수', cls: 'sig-strong-buy' },
  buy:         { label: '매수',     cls: 'sig-buy' },
  neutral:     { label: '중립',     cls: 'sig-neutral' },
  sell:        { label: '매도',     cls: 'sig-sell' },
  strong_sell: { label: '강력 매도', cls: 'sig-strong-sell' },
};

const rsiClass = (v) => {
  if (v == null) return 'rsi-mid';
  if (v < 30) return 'rsi-os';
  if (v < 40) return 'rsi-low';
  if (v < 60) return 'rsi-mid';
  if (v < 70) return 'rsi-high';
  return 'rsi-ob';
};

const signalBadge = (signal, extraCls = 'signal-badge') => {
  const s = SIGNAL_MAP[signal] ?? { label: signal, cls: 'sig-neutral' };
  return `<span class="${extraCls} ${s.cls}">${s.label}</span>`;
};

// ─── 전체 로드 ───────────────────────────────────────────
async function loadAll() {
  document.getElementById('last-updated').textContent = '로딩 중...';
  await Promise.all([loadMarket(), loadStocks(), loadNews()]);
  document.getElementById('last-updated').textContent =
    '업데이트: ' + new Date().toLocaleTimeString('ko-KR');
}

// ─── 뉴스 ────────────────────────────────────────────────
async function loadNews() {
  const setLoading = (id) => {
    document.getElementById(id).innerHTML = '<div class="news-loading">로딩 중...</div>';
  };
  setLoading('news-korean');
  setLoading('news-global');

  try {
    const res  = await fetch('/news');
    const data = await res.json();
    renderNewsList('news-korean', data.korean);
    renderNewsList('news-global', data.global);
  } catch (e) {
    document.getElementById('news-korean').innerHTML = '<div class="news-loading">로드 실패</div>';
    document.getElementById('news-global').innerHTML = '<div class="news-loading">로드 실패</div>';
  }
}

function renderNewsList(id, articles) {
  const el = document.getElementById(id);
  if (!articles?.length) {
    el.innerHTML = '<div class="news-loading">뉴스 없음</div>';
    return;
  }
  el.innerHTML = articles.map(a => {
    const date = new Date(a.publishedAt).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    return `
      <div class="news-item">
        <div class="news-meta">
          <span class="news-source">${a.source}</span>
          <span class="news-date">${date}</span>
        </div>
        <div class="news-title">${a.title}</div>
        ${a.description ? `<div class="news-desc">${a.description}</div>` : ''}
        <a class="news-link" href="${a.url}" target="_blank" rel="noopener">기사 보기 →</a>
      </div>`;
  }).join('');
}

// ─── 시장 현황 ───────────────────────────────────────────
async function loadMarket() {
  try {
    const res = await fetch('/market');
    const data = await res.json();

    // 상태 배지
    const badge = document.getElementById('market-status-badge');
    const statusLabels = { open: '장중', closed: '장 종료', 'pre-market': '동시호가' };
    const statusCls    = { open: 'open', closed: 'closed', 'pre-market': 'pre' };
    badge.textContent = statusLabels[data.status] ?? data.status;
    badge.className = `status-badge ${statusCls[data.status] ?? ''}`;

    // 지수 카드
    const grid = document.getElementById('indices-grid');
    grid.innerHTML = '';
    const indexOrder = ['KOSPI', 'KOSDAQ', 'KOSPI200'];
    for (const key of indexOrder) {
      const idx = data.indices[key];
      if (!idx) continue;
      const cc = changeClass(idx.change);
      grid.innerHTML += `
        <div class="index-card">
          <div class="idx-name">${idx.name}</div>
          <div class="idx-value">${fmt(idx.value)}</div>
          <div class="idx-change ${cc}">
            ${idx.change > 0 ? '▲' : idx.change < 0 ? '▼' : '─'}
            ${fmt(Math.abs(idx.change))} (${fmtP(idx.changePercent)})
          </div>
          <div class="idx-range">고 ${fmt(idx.dayHigh)} / 저 ${fmt(idx.dayLow)}</div>
        </div>`;
    }
  } catch (e) {
    console.error('시장 데이터 로드 실패:', e);
  }
}

// ─── 종목 목록 ───────────────────────────────────────────
async function loadStocks() {
  const tbody = document.getElementById('stocks-tbody');
  tbody.innerHTML = '<tr><td colspan="8" class="loading-row">데이터 로딩 중...</td></tr>';

  try {
    const res = await fetch('/stocks');
    const data = await res.json();
    allStocks = data.stocks ?? [];
    applyFilters();
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="8" class="loading-row" style="color:var(--red)">데이터 로드 실패: ${e.message}</td></tr>`;
  }
}

function applyFilters() {
  let filtered = allStocks;

  if (currentMarket !== 'ALL') {
    filtered = filtered.filter(s => s.market === currentMarket);
  }

  if (currentQuery) {
    try {
      const regex = new RegExp(currentQuery, 'i');
      filtered = filtered.filter(s => regex.test(s.name));
    } catch {
      // 유효하지 않은 regex는 무시
    }
  }

  if (sortKey) {
    filtered = [...filtered].sort((a, b) => {
      const av = a[sortKey] ?? (sortDir === 'asc' ? Infinity : -Infinity);
      const bv = b[sortKey] ?? (sortDir === 'asc' ? Infinity : -Infinity);
      if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === 'asc' ? av - bv : bv - av;
    });
  }

  currentPage = 1;
  _filteredStocks = filtered;
  updateSortHeaders();
  renderStocks(filtered);
}

function toggleSort(key) {
  if (sortKey === key) {
    sortDir = sortDir === 'asc' ? 'desc' : 'asc';
  } else {
    sortKey = key;
    sortDir = 'desc';
  }
  updateSortHeaders();
  applyFilters();
}

function updateSortHeaders() {
  document.querySelectorAll('th[data-sort]').forEach(th => {
    const key = th.dataset.sort;
    th.classList.toggle('sort-active', key === sortKey);
    const icon = th.querySelector('.sort-icon');
    if (icon) icon.textContent = key !== sortKey ? '↕' : sortDir === 'asc' ? '↑' : '↓';
  });
}

function onSearch(value) {
  currentQuery = value.trim();
  document.getElementById('search-clear').classList.toggle('hidden', !currentQuery);
  applyFilters();
}

function clearSearch() {
  const input = document.getElementById('search-input');
  input.value = '';
  onSearch('');
  input.focus();
}

function renderStocks(stocks) {
  const tbody = document.getElementById('stocks-tbody');
  if (!stocks.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="loading-row">데이터 없음</td></tr>';
    renderPagination(0);
    return;
  }

  const totalPages = Math.ceil(stocks.length / PER_PAGE);
  if (currentPage > totalPages) currentPage = totalPages;
  const start = (currentPage - 1) * PER_PAGE;
  const paged = stocks.slice(start, start + PER_PAGE);

  const stockRow = (s) => {
    const cc  = changeClass(s.changePercent);
    const mktTag = `<span class="market-tag ${s.market.toLowerCase()}">${s.market}</span>`;
    const maVs = s.ma20 ? (s.price > s.ma20 ? 'up' : 'down') : '';
    const maLabel = s.ma20
      ? `<span class="${maVs}">${fmt(s.ma20)}</span>`
      : '<span style="color:var(--text-muted)">-</span>';
    const macdVal = s.macd != null
      ? `<span class="${s.macd > 0 ? 'macd-pos' : 'macd-neg'}">${s.macd > 0 ? '+' : ''}${fmt(s.macd)}</span>`
      : '<span style="color:var(--text-muted)">-</span>';
    return `
      <tr onclick="openDetail('${s.ticker}')">
        <td>
          <div class="stock-name">${s.name}${mktTag}</div>
          <div class="stock-sector">${s.sector}</div>
        </td>
        <td class="right price-cell">${fmt(s.price)}</td>
        <td class="right change-cell ${cc}">${fmtP(s.changePercent)}<br><small>${fmt(s.change)}</small></td>
        <td class="right" style="color:var(--text-muted)">${fmtV(s.volume)}</td>
        <td class="center"><span class="rsi-badge ${rsiClass(s.rsi)}">${s.rsi ?? '-'}</span></td>
        <td class="center">${macdVal}</td>
        <td class="right">${maLabel}</td>
        <td class="center">${signalBadge(s.signal)}</td>
      </tr>`;
  };

  // 정렬 미적용 시 sector 그룹핑, 정렬 적용 시 flat 리스트
  if (!sortKey) {
    const groups = paged.reduce((acc, s) => {
      (acc[s.sector] = acc[s.sector] ?? []).push(s);
      return acc;
    }, {});
    tbody.innerHTML = Object.entries(groups).map(([sector, list]) =>
      `<tr class="group-header"><td colspan="8">${sector}</td></tr>` +
      list.map(stockRow).join('')
    ).join('');
  } else {
    tbody.innerHTML = paged.map(stockRow).join('');
  }

  renderPagination(stocks.length);
}

function renderPagination(total) {
  const wrap = document.getElementById('pagination');
  if (!wrap) return;

  const totalPages = Math.ceil(total / PER_PAGE);
  if (totalPages <= 1) { wrap.innerHTML = ''; return; }

  const start = (currentPage - 1) * PER_PAGE + 1;
  const end   = Math.min(currentPage * PER_PAGE, total);

  let pages = '';
  for (let i = 1; i <= totalPages; i++) {
    pages += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="goPage(${i})">${i}</button>`;
  }

  wrap.innerHTML = `
    <span class="page-info">${start}–${end} / ${total}개</span>
    <button class="page-btn" onclick="goPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>‹</button>
    ${pages}
    <button class="page-btn" onclick="goPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>›</button>`;
}

let _filteredStocks = [];
function goPage(page) {
  currentPage = page;
  renderStocks(_filteredStocks);
}

function filterMarket(market, btn) {
  currentMarket = market;
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  applyFilters();
}

// ─── 종목 상세 모달 ──────────────────────────────────────
async function openDetail(ticker) {
  document.getElementById('modal-overlay').classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  // allStocks에서 기본 정보 즉시 표시
  const cached = allStocks.find(s => s.ticker === ticker);
  if (cached) {
    document.getElementById('modal-name').textContent = cached.name;
    document.getElementById('modal-ticker').textContent = cached.ticker;
    document.getElementById('modal-sector').textContent = cached.sector;
    document.getElementById('modal-price').textContent = fmt(cached.price) + '원';
    const cc = changeClass(cached.changePercent);
    const changeEl = document.getElementById('modal-change');
    changeEl.textContent = `${cached.change > 0 ? '▲' : cached.change < 0 ? '▼' : '─'} ${fmt(Math.abs(cached.change))} (${fmtP(cached.changePercent)})`;
    changeEl.className = `modal-change ${cc}`;
  } else {
    document.getElementById('modal-name').textContent = '로딩 중...';
    document.getElementById('modal-price').textContent = '';
    document.getElementById('modal-change').textContent = '';
  }

  try {
    const res = await fetch(`/stocks/${ticker}`);
    const d = await res.json();
    if (d.statusCode) throw new Error(d.message);
    renderDetail(d);
  } catch (e) {
    document.getElementById('modal-name').textContent = '오류: ' + e.message;
  }
}

function renderDetail(d) {
  const ind = d.indicators;
  const cc  = changeClass(d.changePercent);

  // 헤더
  document.getElementById('modal-name').textContent = d.name;
  document.getElementById('modal-ticker').textContent = d.ticker;
  document.getElementById('modal-sector').textContent = d.sector;

  // 가격
  document.getElementById('modal-price').textContent = fmt(d.price) + '원';
  const changeEl = document.getElementById('modal-change');
  changeEl.textContent = `${d.change > 0 ? '▲' : d.change < 0 ? '▼' : '─'} ${fmt(Math.abs(d.change))} (${fmtP(d.changePercent)})`;
  changeEl.className = `modal-change ${cc}`;

  // 메타
  document.getElementById('modal-day-high').textContent = fmt(d.dayHigh);
  document.getElementById('modal-day-low').textContent  = fmt(d.dayLow);
  document.getElementById('modal-52h').textContent = fmt(d.fiftyTwoWeekHigh);
  document.getElementById('modal-52l').textContent = fmt(d.fiftyTwoWeekLow);
  document.getElementById('modal-vol').textContent = fmtV(d.volume);

  // 52주 바
  const lo = d.fiftyTwoWeekLow ?? d.price;
  const hi = d.fiftyTwoWeekHigh ?? d.price;
  const pct = hi > lo ? ((d.price - lo) / (hi - lo)) * 100 : 50;
  document.getElementById('modal-52l-label').textContent = fmt(lo);
  document.getElementById('modal-52h-label').textContent = fmt(hi);
  document.getElementById('modal-range-dot').style.left = `${pct}%`;

  // 차트
  renderPriceChart(d.recentPrices);

  // RSI
  const rsi = ind.rsi;
  document.getElementById('ind-rsi').textContent = rsi ?? '-';
  document.getElementById('ind-rsi').className = `ind-value ${rsiClass(rsi)}`;
  const rsiLabel = rsi == null ? '' : rsi < 30 ? '과매도' : rsi > 70 ? '과매수' : rsi < 40 ? '저평가' : rsi > 60 ? '고평가' : '중립';
  document.getElementById('ind-rsi-label').textContent = rsiLabel;
  if (rsi != null) {
    const fill = document.getElementById('rsi-bar-fill');
    const dot  = document.getElementById('rsi-bar-dot');
    const color = rsi < 30 ? 'var(--blue)' : rsi > 70 ? 'var(--red)' : 'var(--green)';
    fill.style.width = `${rsi}%`;
    fill.style.background = color;
    dot.style.left = `${rsi}%`;
    dot.style.background = color;

    const zone = rsi < 30 ? '과매도 구간 — 반등 가능성'
               : rsi < 40 ? '저평가 구간'
               : rsi < 60 ? '중립 구간'
               : rsi < 70 ? '고평가 구간'
               : '과매수 구간 — 조정 가능성';
    document.getElementById('ind-rsi-bar').setAttribute(
      'data-tip',
      `RSI 위치: ${rsi} / 100\n\n현재 구간: ${zone}\n\n← 과매도(0)  ·····  중립  ·····  과매수(100) →`
    );
    document.getElementById('ind-rsi-bar').classList.add('has-tip');
  }

  // MACD
  if (ind.macd) {
    document.getElementById('ind-macd').textContent = fmt(ind.macd.histogram);
    document.getElementById('ind-macd').className = `ind-value ${ind.macd.histogram > 0 ? 'up' : 'down'}`;
    document.getElementById('ind-macd-signal').textContent = `Signal: ${fmt(ind.macd.signal)}`;
    document.getElementById('ind-macd-hist').textContent   = `MACD: ${fmt(ind.macd.macd)}`;
  }

  // 볼린저
  if (ind.bollingerBands) {
    const bb = ind.bollingerBands;
    document.getElementById('ind-bb-upper').textContent = `상단: ${fmt(bb.upper)}`;
    document.getElementById('ind-bb-mid').textContent   = fmt(bb.middle);
    document.getElementById('ind-bb-lower').textContent = `하단: ${fmt(bb.lower)}`;
    document.getElementById('ind-bb-bw').textContent    = `밴드폭: ${bb.bandwidth}%`;
  }

  // 이동평균
  const ma = ind.movingAverages;
  const maGrid = document.getElementById('ma-grid');
  maGrid.innerHTML = [
    { label: 'MA 5',   val: ma.ma5 },
    { label: 'MA 20',  val: ma.ma20 },
    { label: 'MA 60',  val: ma.ma60 },
    { label: 'MA 120', val: ma.ma120 },
  ].map(({ label, val }) => {
    const vs = val ? (d.price > val ? 'up' : 'down') : '';
    return `
      <div class="ma-item">
        <div class="ma-period">${label}</div>
        <div class="ma-value ${vs}">${fmt(val)}</div>
        <div class="ma-vs ${vs}">${val ? (d.price > val ? '▲ 상회' : '▼ 하회') : ''}</div>
      </div>`;
  }).join('');

  // 신호
  const sigInfo = SIGNAL_MAP[ind.signal] ?? { label: ind.signal, cls: 'sig-neutral' };
  document.getElementById('modal-signal-badge').textContent  = sigInfo.label;
  document.getElementById('modal-signal-badge').className    = `signal-badge-lg ${sigInfo.cls}`;
  document.getElementById('modal-signal-score').textContent  = `점수: ${ind.signalScore > 0 ? '+' : ''}${ind.signalScore}`;

  const reasonsList = document.getElementById('signal-reasons');
  reasonsList.innerHTML = (ind.signalReasons ?? []).map(r => {
    const isBull = r.includes('상회') || r.includes('양수') || r.includes('골든') || r.includes('정배열') || r.includes('매도') === false && r.includes('과매도') || r.includes('반등');
    const isBear = r.includes('하회') || r.includes('음수') || r.includes('데드') || r.includes('역배열') || r.includes('과매수') || r.includes('조정');
    const cls = isBear ? 'neg' : isBull ? 'pos' : '';
    return `<li class="${cls}">${r}</li>`;
  }).join('');
}

function renderPriceChart(prices) {
  const ctx = document.getElementById('price-chart').getContext('2d');
  if (priceChart) { priceChart.destroy(); priceChart = null; }

  if (!prices || !prices.length) return;

  const labels = prices.map(p => p.date.slice(5));  // MM-DD
  const closes = prices.map(p => p.close);
  const first  = closes[0];
  const isUp   = closes[closes.length - 1] >= first;
  const color  = isUp ? '#3fb950' : '#f85149';

  priceChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: '종가',
        data: closes,
        borderColor: color,
        backgroundColor: color + '18',
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
        fill: true,
        tension: 0.3,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => `₩${ctx.parsed.y.toLocaleString('ko-KR')}`,
          },
        },
      },
      scales: {
        x: {
          ticks: { color: '#8b949e', maxTicksLimit: 8, font: { size: 11 } },
          grid:  { color: '#21262d' },
        },
        y: {
          position: 'right',
          ticks: { color: '#8b949e', font: { size: 11 }, callback: v => v.toLocaleString('ko-KR') },
          grid:  { color: '#21262d' },
        },
      },
    },
  });
}

function closeModal(e) {
  if (e && e.target !== document.getElementById('modal-overlay')) return;
  document.getElementById('modal-overlay').classList.add('hidden');
  document.body.style.overflow = '';
  if (priceChart) { priceChart.destroy(); priceChart = null; }
}

// ESC 키로 모달 닫기
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
});

// ─── 초기 실행 ───────────────────────────────────────────
loadAll();
