// ─── 글로벌 툴팁 ─────────────────────────────────────────
const gTooltip = document.getElementById('g-tooltip');
let tooltipTarget = null;
let _tipW = 0, _tipH = 0;

document.addEventListener('mouseover', (e) => {
  const el = e.target.closest('[data-tip]');
  if (!el) return;
  tooltipTarget = el;
  gTooltip.textContent = el.dataset.tip;
  gTooltip.classList.add('visible');
  _tipW = gTooltip.offsetWidth;
  _tipH = gTooltip.offsetHeight;
});

document.addEventListener('mousemove', (e) => {
  if (!tooltipTarget) return;
  const pad = 14;
  let x = e.clientX + pad;
  let y = e.clientY - _tipH - pad;
  if (x + _tipW > window.innerWidth - 8) x = e.clientX - _tipW - pad;
  if (y < 8) y = e.clientY + pad;
  gTooltip.style.left = x + 'px';
  gTooltip.style.top = y + 'px';
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

// ─── 상태 ────────────────────────────────────────────────
let allStocks = [];
let _filteredStocks = [];
let currentMarket = 'ALL';
let currentQuery = '';
let currentPage = 1;
const PER_PAGE = 10;
let sortKey = 'volume';
let sortDir = 'desc';
let priceChart = null;
let currentDetailTicker = null;

// ─── 유틸 ────────────────────────────────────────────────
const fmt  = (n) => n == null ? '-' : Number(n).toLocaleString('ko-KR');
const fmtP = (n) => n == null ? '-' : `${n > 0 ? '+' : ''}${n.toFixed(2)}%`;
const fmtV = (n) => {
  if (n == null) return '-';
  if (n >= 1e8) return (n / 1e8).toFixed(1) + '억';
  if (n >= 1e4) return (n / 1e4).toFixed(0) + '만';
  return n.toLocaleString();
};

// 한국식: 상승=빨강, 하락=초록
const changeClass = (v) => v > 0 ? 'up' : v < 0 ? 'down' : '';
const trendIcon   = (v) => v > 0 ? 'arrow_drop_up' : v < 0 ? 'arrow_drop_down' : 'remove';

const SIGNAL_MAP = {
  strong_buy:  { label: '강력 매수', cls: 'sig-strong-buy' },
  buy:         { label: '매수',     cls: 'sig-buy' },
  neutral:     { label: '중립',     cls: 'sig-neutral' },
  sell:        { label: '매도',     cls: 'sig-sell' },
  strong_sell: { label: '강력 매도', cls: 'sig-strong-sell' },
};

// ─── 라우팅 ─────────────────────────────────────────────
function showView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
  const v = document.getElementById(`${name}-view`);
  if (v) v.classList.remove('hidden');
  window.scrollTo(0, 0);
}

function navigateDetail(ticker) {
  location.hash = `#stock/${encodeURIComponent(ticker)}`;
}

function goHome() {
  if (priceChart) { priceChart.destroy(); priceChart = null; }
  currentDetailTicker = null;
  if (location.hash) location.hash = '';
  else showView('home');
}

function handleRoute() {
  const m = location.hash.match(/^#stock\/(.+)$/);
  if (m) {
    showView('detail');
    openDetail(decodeURIComponent(m[1]));
  } else {
    showView('home');
  }
}
window.addEventListener('hashchange', handleRoute);

// ─── 뉴스 탭 ────────────────────────────────────────────
let _currentNewsTab = 'korean';
const _newsCache = {
  korean: { original: null, translated: null, isTranslated: false },
  global: { original: null, translated: null, isTranslated: false },
};

function switchNewsTab(tab, btn) {
  _currentNewsTab = tab;
  document.getElementById('news-korean').classList.toggle('hidden', tab !== 'korean');
  document.getElementById('news-global').classList.toggle('hidden', tab !== 'global');
  document.querySelectorAll('.news-tab').forEach(t => {
    t.dataset.active = (t === btn) ? 'true' : 'false';
  });
  updateTranslateBtnState();
}

function updateTranslateBtnState() {
  const label = document.getElementById('translate-btn-label');
  const btn = document.getElementById('translate-btn');
  const cache = _newsCache[_currentNewsTab];
  if (cache.isTranslated) {
    label.textContent = '원문';
    btn.classList.remove('text-on-surface-variant');
    btn.classList.add('text-primary', 'bg-primary-container');
  } else {
    label.textContent = '번역';
    btn.classList.remove('text-primary', 'bg-primary-container');
    btn.classList.add('text-on-surface-variant');
  }
}

async function toggleTranslate() {
  const tab = _currentNewsTab;
  const cache = _newsCache[tab];
  const elId = tab === 'korean' ? 'news-korean' : 'news-global';

  if (cache.isTranslated) {
    cache.isTranslated = false;
    renderNewsList(elId, cache.original);
    updateTranslateBtnState();
    return;
  }
  if (cache.translated) {
    cache.isTranslated = true;
    renderNewsList(elId, cache.translated);
    updateTranslateBtnState();
    return;
  }
  if (!cache.original?.length) return;

  const btn = document.getElementById('translate-btn');
  const label = document.getElementById('translate-btn-label');
  btn.disabled = true;
  label.textContent = '번역 중...';

  try {
    const articles = cache.original.map(a => ({ title: a.title, description: a.description || '' }));
    const res = await fetch('/news/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ articles }),
    });
    if (!res.ok) throw new Error('번역 실패');
    const translated = await res.json();
    cache.translated = cache.original.map((a, i) => ({
      ...a,
      title: translated[i]?.title || a.title,
      description: translated[i]?.description || a.description,
    }));
    cache.isTranslated = true;
    renderNewsList(elId, cache.translated);
    updateTranslateBtnState();
  } catch (e) {
    console.error('번역 실패:', e);
    label.textContent = '번역 실패';
    setTimeout(() => { label.textContent = '번역'; }, 2000);
  } finally {
    btn.disabled = false;
  }
}

// ─── 전체 로드 ─────────────────────────────────────────
async function loadAll() {
  const updEl = document.getElementById('last-updated');
  if (updEl) updEl.textContent = '로딩 중...';
  await Promise.all([loadMarket(), loadStocks(), loadNews()]);
  if (updEl) updEl.textContent = new Date().toLocaleTimeString('ko-KR');
}

// ─── 시장 ──────────────────────────────────────────────
async function loadMarket() {
  try {
    const res = await fetch('/market');
    const data = await res.json();

    const labels = { open: '장중', closed: '장 종료', 'pre-market': '동시호가' };
    const cls = { open: 'open', closed: 'closed', 'pre-market': 'pre' };
    const text = labels[data.status] ?? data.status;
    const klass = cls[data.status] ?? '';
    const homeBadge = document.getElementById('market-status-badge');
    if (homeBadge) {
      homeBadge.textContent = text;
      homeBadge.className = `status-badge ${klass}`;
    }
    const detailBadge = document.getElementById('detail-status-badge');
    if (detailBadge) {
      detailBadge.textContent = text;
      detailBadge.className = `status-badge ${klass} flex-shrink-0`;
    }

    const grid = document.getElementById('indices-grid');
    const indexOrder = ['KOSPI', 'KOSDAQ', 'KOSPI200'];
    grid.innerHTML = indexOrder.map(key => {
      const idx = data.indices[key];
      if (!idx) return '';
      const isUp = idx.change > 0, isDown = idx.change < 0;
      const cc = isUp ? 'up' : isDown ? 'down' : '';
      const strokeColor = isUp ? '#ba1a1a' : isDown ? '#006c4a' : '#76777d';
      const fillBg = isUp ? 'rgba(255,218,214,.4)' : isDown ? 'rgba(108,248,187,.3)' : 'rgba(225,226,228,.4)';
      const svgPath = isUp
        ? 'M0,35 Q20,30 40,32 T80,10 T100,5'
        : isDown
        ? 'M0,5 Q25,8 50,18 T100,38'
        : 'M0,20 Q30,15 60,25 T100,22';
      const arrow = isUp ? 'arrow_drop_up' : isDown ? 'arrow_drop_down' : '';
      return `
        <div class="min-w-[180px] md:min-w-0 bg-white border border-outline-variant rounded-xl p-4 shadow-sm">
          <p class="text-[11px] text-on-surface-variant mb-1">${idx.name}</p>
          <div class="flex items-baseline gap-1">
            <span class="font-headline text-[18px] font-bold ${cc}">${fmt(idx.value)}</span>
            <span class="text-[10px] font-bold ${cc} flex items-center">
              ${arrow ? `<span class="material-symbols-outlined text-[14px]" style="font-variation-settings:'FILL' 1;">${arrow}</span>` : ''}
              ${fmtP(idx.changePercent)}
            </span>
          </div>
          <div class="h-10 mt-2 rounded-lg overflow-hidden" style="background:${fillBg}">
            <svg class="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 40">
              <path d="${svgPath}" fill="none" stroke="${strokeColor}" stroke-width="2" stroke-linecap="round" />
            </svg>
          </div>
          <div class="text-[10px] text-on-surface-variant mt-2">고가: ${fmt(idx.dayHigh)} · 저가: ${fmt(idx.dayLow)}</div>
        </div>`;
    }).join('');
  } catch (e) {
    console.error('시장 데이터 로드 실패:', e);
  }
}

// ─── 종목 리스트 ────────────────────────────────────────
async function loadStocks() {
  const list = document.getElementById('stocks-list');
  list.innerHTML = '<div class="text-center py-10 text-on-surface-variant text-sm">데이터 로딩 중...</div>';
  try {
    const res = await fetch('/stocks');
    const data = await res.json();
    allStocks = data.stocks ?? [];
    applyFilters();
  } catch (e) {
    list.innerHTML = `<div class="text-center py-10 text-error text-sm">로드 실패: ${e.message}</div>`;
  }
}

function applyFilters() {
  let filtered = allStocks;
  if (currentMarket !== 'ALL') filtered = filtered.filter(s => s.market === currentMarket);
  if (currentQuery) {
    try {
      const regex = new RegExp(currentQuery, 'i');
      filtered = filtered.filter(s => regex.test(s.name));
    } catch { /* invalid regex ignored */ }
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
  renderStocks(filtered);
}

let _searchTimer = null;
function onSearch(value) {
  currentQuery = value.trim();
  document.getElementById('search-clear').classList.toggle('hidden', !currentQuery);
  clearTimeout(_searchTimer);
  _searchTimer = setTimeout(applyFilters, 200);
}

function clearSearch() {
  const input = document.getElementById('search-input');
  input.value = '';
  onSearch('');
  input.focus();
}

function setSort(value) {
  const [k, d] = value.split(':');
  sortKey = k; sortDir = d;
  applyFilters();
}

function filterMarket(market, btn) {
  currentMarket = market;
  document.querySelectorAll('.filter-tab').forEach(t => {
    t.dataset.active = (t === btn) ? 'true' : 'false';
  });
  applyFilters();
}

function renderStocks(stocks) {
  const list = document.getElementById('stocks-list');
  if (!stocks.length) {
    list.innerHTML = '<div class="text-center py-10 text-on-surface-variant text-sm">데이터 없음</div>';
    renderPagination(0);
    return;
  }
  const totalPages = Math.ceil(stocks.length / PER_PAGE);
  if (currentPage > totalPages) currentPage = totalPages;
  const start = (currentPage - 1) * PER_PAGE;
  const paged = stocks.slice(start, start + PER_PAGE);

  list.innerHTML = paged.map(s => {
    const cc = changeClass(s.changePercent);
    const icon = trendIcon(s.changePercent);
    const sigInfo = SIGNAL_MAP[s.signal] ?? { label: s.signal, cls: 'sig-neutral' };
    const mktCls = s.market === 'KOSPI'
      ? 'bg-primary-container text-primary'
      : 'bg-secondary-container text-secondary';
    const tickerShort = s.ticker.replace(/\.(KS|KQ)$/, '');
    return `
      <div class="flex items-center justify-between p-4 hover:bg-surface-container-low active:bg-surface-container-high transition-colors cursor-pointer" onclick="navigateDetail('${s.ticker}')">
        <div class="flex items-center gap-3 min-w-0 flex-1">
          <div class="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center font-bold text-primary flex-shrink-0">${s.name.charAt(0)}</div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2 flex-wrap">
              <p class="text-[14px] font-bold truncate">${s.name}</p>
              <span class="text-[9px] font-bold px-1.5 py-0.5 rounded ${mktCls}">${s.market}</span>
            </div>
            <p class="text-[11px] text-on-surface-variant truncate">${tickerShort}${s.sector ? ' · ' + s.sector : ''}</p>
          </div>
        </div>
        <div class="text-right flex flex-col items-end gap-1 flex-shrink-0 ml-3">
          <p class="font-headline text-[15px] font-bold tabular-nums">${fmt(s.price)}</p>
          <div class="flex items-center justify-end ${cc}">
            ${icon !== 'remove' ? `<span class="material-symbols-outlined text-[14px]" style="font-variation-settings:'FILL' 1;">${icon}</span>` : ''}
            <p class="text-[11px] font-bold">${fmtP(s.changePercent)}</p>
          </div>
          <span class="signal-badge-lg ${sigInfo.cls}" style="font-size:9px;padding:2px 8px;">${sigInfo.label}</span>
        </div>
      </div>`;
  }).join('');

  renderPagination(stocks.length);
}

function renderPagination(total) {
  const wrap = document.getElementById('pagination');
  if (!wrap) return;
  const totalPages = Math.ceil(total / PER_PAGE);
  if (totalPages <= 1) { wrap.innerHTML = ''; return; }

  const start = (currentPage - 1) * PER_PAGE + 1;
  const end = Math.min(currentPage * PER_PAGE, total);

  // 페이지 버튼: 최대 5개 + 양 끝
  const maxButtons = 5;
  let from = Math.max(1, currentPage - Math.floor(maxButtons / 2));
  let to = Math.min(totalPages, from + maxButtons - 1);
  if (to - from < maxButtons - 1) from = Math.max(1, to - maxButtons + 1);

  let pages = '';
  for (let i = from; i <= to; i++) {
    const active = i === currentPage
      ? 'bg-primary text-white'
      : 'bg-white text-on-surface border border-outline-variant hover:bg-surface-container-low';
    pages += `<button class="w-9 h-9 rounded-full text-xs font-bold transition-colors ${active}" onclick="goPage(${i})">${i}</button>`;
  }

  wrap.innerHTML = `
    <p class="text-[12px] text-on-surface-variant font-medium">${start}–${end} / ${total}개</p>
    <div class="flex gap-2 items-center flex-wrap justify-center">
      <button class="w-9 h-9 rounded-full bg-white border border-outline-variant text-sm font-bold hover:bg-surface-container-low transition-colors" onclick="goPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled style="opacity:.3;pointer-events:none"' : ''}>‹</button>
      ${pages}
      <button class="w-9 h-9 rounded-full bg-white border border-outline-variant text-sm font-bold hover:bg-surface-container-low transition-colors" onclick="goPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled style="opacity:.3;pointer-events:none"' : ''}>›</button>
    </div>`;
}

function goPage(page) {
  currentPage = page;
  renderStocks(_filteredStocks);
  document.getElementById('screener-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ─── 뉴스 ──────────────────────────────────────────────
async function loadNews() {
  const setLoading = (id) => {
    document.getElementById(id).innerHTML = '<div class="text-sm text-on-surface-variant py-4">로딩 중...</div>';
  };
  setLoading('news-korean');
  setLoading('news-global');
  try {
    const res = await fetch('/news');
    const data = await res.json();
    _newsCache.korean = { original: data.korean, translated: null, isTranslated: false };
    _newsCache.global = { original: data.global, translated: null, isTranslated: false };
    updateTranslateBtnState();
    renderNewsList('news-korean', data.korean);
    renderNewsList('news-global', data.global);
  } catch (e) {
    document.getElementById('news-korean').innerHTML = '<div class="text-sm text-on-surface-variant py-4">로드 실패</div>';
    document.getElementById('news-global').innerHTML = '<div class="text-sm text-on-surface-variant py-4">로드 실패</div>';
  }
}

function renderNewsList(id, articles) {
  const el = document.getElementById(id);
  if (!articles?.length) {
    el.innerHTML = '<div class="text-sm text-on-surface-variant py-4">뉴스 없음</div>';
    return;
  }
  el.innerHTML = articles.map(a => {
    const date = new Date(a.publishedAt).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    const thumb = a.image
      ? `<img class="w-24 h-24 rounded-lg object-cover flex-shrink-0 bg-surface-container-low" src="${a.image}" alt="" loading="lazy" onerror="this.outerHTML='<div class=\\'w-24 h-24 rounded-lg bg-primary-container flex items-center justify-center flex-shrink-0\\'><span class=\\'material-symbols-outlined text-primary\\'>newspaper</span></div>'" />`
      : `<div class="w-24 h-24 rounded-lg bg-primary-container flex items-center justify-center flex-shrink-0"><span class="material-symbols-outlined text-primary">newspaper</span></div>`;
    return `
      <article class="flex gap-4 group cursor-pointer bg-white border border-outline-variant rounded-xl p-4 hover:border-primary/30 transition-colors" onclick="window.open('${a.url}', '_blank')">
        <div class="flex-1 min-w-0">
          <h4 class="text-[14px] font-semibold leading-snug line-clamp-2 group-hover:text-primary transition-colors">${a.title}</h4>
          ${a.description ? `<p class="text-[11px] text-on-surface-variant mt-1 line-clamp-2 leading-relaxed">${a.description}</p>` : ''}
          <div class="flex items-center gap-2 mt-2">
            <span class="text-[11px] text-on-surface-variant font-medium">${a.source}</span>
            <span class="w-1 h-1 bg-outline-variant rounded-full"></span>
            <span class="text-[11px] text-on-surface-variant">${date}</span>
          </div>
        </div>
        ${thumb}
      </article>`;
  }).join('');
}

// ─── AI 추천 ─────────────────────────────────────────────
async function loadRecommendations() {
  const section = document.getElementById('rec-section');
  const grid = document.getElementById('rec-grid');
  const summary = document.getElementById('rec-summary');
  const btn = document.getElementById('rec-btn');

  btn.disabled = true;
  btn.textContent = '분석 중...';
  grid.innerHTML = '<div class="col-span-full text-center py-8 text-on-surface-variant text-sm">AI가 주식 데이터와 뉴스를 분석하고 있습니다...</div>';
  summary.textContent = '';
  section.classList.remove('hidden');

  try {
    const res = await fetch('/recommendations');
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || '추천 생성 실패');
    }
    const data = await res.json();
    summary.textContent = data.summary;
    window._recData = data.recommendations;
    grid.innerHTML = data.recommendations.map((r) => `
      <div class="bg-white border border-outline-variant hover:border-primary rounded-xl p-4 transition-all cursor-pointer group" onclick="openRecModal(${r.rank - 1})">
        <div class="flex justify-between items-start mb-3">
          <div class="w-8 h-8 rounded-full bg-primary text-white font-bold flex items-center justify-center text-sm">${r.rank}</div>
          <span class="text-[10px] font-bold text-primary bg-primary-container px-2 py-0.5 rounded-full">${r.sector}</span>
        </div>
        <h4 class="text-[14px] font-bold mb-1 truncate">${r.name}</h4>
        <p class="text-[10px] text-on-surface-variant font-mono mb-2">${r.ticker}</p>
        <p class="text-[11px] text-on-surface-variant line-clamp-2 leading-relaxed mb-3">${r.reason}</p>
        <div class="text-[10px] text-primary font-bold">상세 분석 보기 →</div>
      </div>`).join('');
    const ts = new Date(data.generatedAt).toLocaleTimeString('ko-KR');
    document.getElementById('rec-time').textContent = `생성: ${ts}`;
    btn.textContent = '↻ 다시 분석';
  } catch (e) {
    grid.innerHTML = `<div class="col-span-full text-center py-8 text-error text-sm">오류: ${e.message}</div>`;
    btn.textContent = '추천 종목 확인하기';
  } finally {
    btn.disabled = false;
  }
}

// ─── 추천 상세 모달 ─────────────────────────────────────
function openRecModal(idx) {
  const r = (window._recData ?? [])[idx];
  if (!r) return;
  window._recCurrentTicker = r.ticker;
  document.getElementById('rec-modal-name').textContent = r.name;
  document.getElementById('rec-modal-ticker').textContent = r.ticker;
  document.getElementById('rec-modal-sector').textContent = r.sector;
  document.getElementById('rec-modal-reason').textContent = r.reason;
  document.getElementById('rec-modal-market').textContent = r.detail?.marketAnalysis ?? '-';
  document.getElementById('rec-modal-technical').textContent = r.detail?.technicalAnalysis ?? '-';
  document.getElementById('rec-modal-news').textContent = r.detail?.newsImpact ?? '-';
  document.getElementById('rec-modal-risk').textContent = r.detail?.riskFactors ?? '-';
  document.getElementById('rec-modal-overlay').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeRecModal(e) {
  if (e && e.target !== document.getElementById('rec-modal-overlay')) return;
  document.getElementById('rec-modal-overlay').classList.add('hidden');
  document.body.style.overflow = '';
}

function openDetailFromRec() {
  const ticker = window._recCurrentTicker;
  if (!ticker) return;
  document.getElementById('rec-modal-overlay').classList.add('hidden');
  document.body.style.overflow = '';
  navigateDetail(ticker);
}

// ─── 종목 상세 ───────────────────────────────────────────
async function openDetail(ticker) {
  currentDetailTicker = ticker;
  document.getElementById('ai-analysis-result').classList.add('hidden');
  document.getElementById('ai-analysis-btn').textContent = '분석 시작';

  const cached = allStocks.find(s => s.ticker === ticker);
  if (cached) {
    setBasicHeader(cached);
  } else {
    document.getElementById('detail-title').textContent = '...';
    document.getElementById('detail-name').textContent = '로딩 중...';
    document.getElementById('detail-sub').textContent = '';
    document.getElementById('detail-price').textContent = '-';
    document.getElementById('detail-change').innerHTML = '';
  }

  try {
    const res = await fetch(`/stocks/${ticker}`);
    const d = await res.json();
    if (d.statusCode) throw new Error(d.message);
    renderDetail(d);
  } catch (e) {
    document.getElementById('detail-name').textContent = '오류: ' + e.message;
  }
}

function setBasicHeader(d) {
  document.getElementById('detail-title').textContent = d.name;
  document.getElementById('detail-name').textContent = d.name;
  const tickerShort = d.ticker ? d.ticker.replace(/\.(KS|KQ)$/, '') : '';
  document.getElementById('detail-sub').textContent =
    `${tickerShort}${d.market ? ' · ' + d.market : ''}${d.sector ? ' · ' + d.sector : ''}`;
  document.getElementById('detail-price').textContent = fmt(d.price);
  const cc = changeClass(d.changePercent);
  const icon = trendIcon(d.changePercent);
  const ce = document.getElementById('detail-change');
  ce.className = `flex items-center gap-1 mt-2 font-bold ${cc}`;
  const arrowHtml = icon !== 'remove'
    ? `<span class="material-symbols-outlined text-[20px]" style="font-variation-settings:'FILL' 1;">${icon}</span>`
    : '';
  ce.innerHTML = `${arrowHtml}<span class="text-[16px]">${d.change > 0 ? '+' : ''}${fmt(d.change)} (${fmtP(d.changePercent)})</span>`;
}

function renderDetail(d) {
  setBasicHeader(d);

  document.getElementById('detail-volume').textContent = fmtV(d.volume);
  document.getElementById('detail-day-range').textContent = `${fmt(d.dayHigh)} / ${fmt(d.dayLow)}`;
  document.getElementById('detail-52h').textContent = `최고 ${fmt(d.fiftyTwoWeekHigh)}`;
  document.getElementById('detail-52l').textContent = `최저 ${fmt(d.fiftyTwoWeekLow)}`;
  const lo = d.fiftyTwoWeekLow ?? d.price;
  const hi = d.fiftyTwoWeekHigh ?? d.price;
  const pct = hi > lo ? ((d.price - lo) / (hi - lo)) * 100 : 50;
  document.getElementById('detail-range-dot').style.left = `${pct}%`;

  renderPriceChart(d.recentPrices);

  const ind = d.indicators;

  // RSI
  const rsi = ind.rsi;
  const rsiEl = document.getElementById('ind-rsi');
  rsiEl.textContent = rsi ?? '-';
  if (rsi != null) {
    const colorVar = rsi < 30 ? 'var(--primary)' : rsi > 70 ? 'var(--error)' : 'var(--secondary)';
    rsiEl.style.color = colorVar;
    const fill = document.getElementById('rsi-bar-fill');
    const dot = document.getElementById('rsi-bar-dot');
    fill.style.width = `${rsi}%`;
    fill.style.background = colorVar;
    dot.style.left = `${rsi}%`;
    dot.style.background = colorVar;
    document.getElementById('ind-rsi-label').textContent =
      rsi < 30 ? '과매도 — 반등 가능성'
      : rsi < 40 ? '저평가 구간'
      : rsi < 60 ? '중립'
      : rsi < 70 ? '고평가 구간'
      : '과매수 — 조정 가능성';
  }

  // MACD
  if (ind.macd) {
    const m = ind.macd;
    const macdEl = document.getElementById('ind-macd');
    macdEl.textContent = fmt(m.histogram);
    macdEl.className = `font-headline text-[24px] font-bold mb-1 ${m.histogram > 0 ? 'up' : m.histogram < 0 ? 'down' : ''}`;
    document.getElementById('ind-macd-signal').textContent = `Signal: ${fmt(m.signal)}`;
    document.getElementById('ind-macd-hist').textContent = `MACD: ${fmt(m.macd)}`;
  }

  // 볼린저
  if (ind.bollingerBands) {
    const bb = ind.bollingerBands;
    document.getElementById('ind-bb-upper').textContent = `상단: ${fmt(bb.upper)}`;
    document.getElementById('ind-bb-mid').textContent = fmt(bb.middle);
    document.getElementById('ind-bb-lower').textContent = `하단: ${fmt(bb.lower)}`;
    document.getElementById('ind-bb-bw').textContent = `밴드폭: ${bb.bandwidth}%`;
  }

  // 이동평균
  const ma = ind.movingAverages;
  document.getElementById('ma-grid').innerHTML = [
    { label: 'MA 5', val: ma.ma5 },
    { label: 'MA 20', val: ma.ma20 },
    { label: 'MA 60', val: ma.ma60 },
    { label: 'MA 120', val: ma.ma120 },
  ].map(({ label, val }) => {
    const cls = val ? (d.price > val ? 'up' : 'down') : '';
    return `
      <div class="text-center bg-surface-container-low rounded-lg p-3">
        <div class="text-[10px] text-on-surface-variant mb-1">${label}</div>
        <div class="text-[14px] font-bold ${cls}">${fmt(val)}</div>
        <div class="text-[10px] ${cls} mt-1">${val ? (d.price > val ? '▲ 상회' : '▼ 하회') : ''}</div>
      </div>`;
  }).join('');

  // 종합 신호
  const sigInfo = SIGNAL_MAP[ind.signal] ?? { label: ind.signal, cls: 'sig-neutral' };
  const sb = document.getElementById('modal-signal-badge');
  sb.textContent = sigInfo.label;
  sb.className = `signal-badge-lg ${sigInfo.cls}`;
  document.getElementById('modal-signal-score').textContent = `점수: ${ind.signalScore > 0 ? '+' : ''}${ind.signalScore}`;
  const reasonsList = document.getElementById('signal-reasons');
  reasonsList.innerHTML = (ind.signalReasons ?? []).map(r => {
    const isBull = r.includes('상회') || r.includes('양수') || r.includes('골든') || r.includes('정배열') || r.includes('과매도') || r.includes('반등');
    const isBear = r.includes('하회') || r.includes('음수') || r.includes('데드') || r.includes('역배열') || r.includes('과매수') || r.includes('조정');
    const borderCls = isBull ? 'border-l-error' : isBear ? 'border-l-secondary' : 'border-l-outline';
    return `<li class="text-[12px] px-3 py-2 rounded-lg bg-surface-container-low border-l-[3px] ${borderCls}">${r}</li>`;
  }).join('');
}

function renderPriceChart(prices) {
  const ctx = document.getElementById('price-chart').getContext('2d');
  if (priceChart) { priceChart.destroy(); priceChart = null; }
  if (!prices || !prices.length) return;
  const labels = prices.map(p => p.date.slice(5));
  const closes = prices.map(p => p.close);
  const isUp = closes[closes.length - 1] >= closes[0];
  const color = isUp ? '#ba1a1a' : '#006c4a';
  priceChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: '종가',
        data: closes,
        borderColor: color,
        backgroundColor: color + '22',
        borderWidth: 2.5,
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
        tooltip: { callbacks: { label: ctx => `₩${ctx.parsed.y.toLocaleString('ko-KR')}` } },
      },
      scales: {
        x: { ticks: { color: '#76777d', maxTicksLimit: 8, font: { size: 11 } }, grid: { color: '#f2f4f6' } },
        y: { position: 'right', ticks: { color: '#76777d', font: { size: 11 }, callback: v => v.toLocaleString('ko-KR') }, grid: { color: '#f2f4f6' } },
      },
    },
  });
}

// ─── AI 심층 분석 ────────────────────────────────────────
const AI_OPINION_MAP = {
  '강력매수': 'sig-strong-buy',
  '매수':     'sig-buy',
  '보유':     'sig-neutral',
  '매도':     'sig-sell',
  '강력매도': 'sig-strong-sell',
};

async function loadAiAnalysis() {
  if (!currentDetailTicker) return;
  const btn = document.getElementById('ai-analysis-btn');
  const result = document.getElementById('ai-analysis-result');
  btn.disabled = true;
  btn.textContent = '분석 중...';
  result.classList.add('hidden');
  try {
    const res = await fetch(`/stocks/${currentDetailTicker}/ai-analysis`);
    const d = await res.json();
    if (d.statusCode) throw new Error(d.message);
    const cls = AI_OPINION_MAP[d.opinion] ?? 'sig-neutral';
    const badge = document.getElementById('ai-opinion-badge');
    badge.textContent = d.opinion;
    badge.className = `signal-badge-lg ${cls}`;
    document.getElementById('ai-summary').textContent = d.summary;
    document.getElementById('ai-technical').textContent = d.technical;
    document.getElementById('ai-short').textContent = d.shortTermOutlook;
    document.getElementById('ai-mid').textContent = d.midTermOutlook;
    document.getElementById('ai-risks').textContent = d.risks;
    document.getElementById('ai-generated-at').textContent = '생성: ' + new Date(d.generatedAt).toLocaleString('ko-KR');
    result.classList.remove('hidden');
    btn.textContent = '다시 분석';
  } catch (e) {
    btn.textContent = '분석 실패 — 재시도';
    alert('AI 분석 중 오류: ' + e.message);
  } finally {
    btn.disabled = false;
  }
}

// ─── ESC 키 ──────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeRecModal({ target: document.getElementById('rec-modal-overlay') });
  }
});

// ─── 초기 실행 ──────────────────────────────────────────
loadAll().then(() => handleRoute());
handleRoute();
