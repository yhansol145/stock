// ─── 글로벌 툴팁 ─────────────────────────────────────────
const gTooltip = document.getElementById('g-tooltip');
let tooltipTarget = null;

document.addEventListener('mouseover', (e) => {
  const el = e.target.closest('[data-tip]');
  if (!el) return;
  tooltipTarget = el;
  gTooltip.textContent = el.dataset.tip;
  gTooltip.classList.add('visible');
  _tipW = gTooltip.offsetWidth;
  _tipH = gTooltip.offsetHeight;
});

let _tipW = 0, _tipH = 0;
document.addEventListener('mousemove', (e) => {
  if (!tooltipTarget) return;
  const pad = 14;
  let x = e.clientX + pad;
  let y = e.clientY - _tipH - pad;
  if (x + _tipW > window.innerWidth - 8)  x = e.clientX - _tipW - pad;
  if (y < 8)                               y = e.clientY + pad;
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
let allStocks = [];
let currentMarket = 'ALL';
let currentQuery = '';
let currentPage = 1;
const PER_PAGE = 10;
let sortKey = 'volume';
let sortDir = 'desc';
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

const changeClass = (v) => v > 0 ? 'text-obs-primary' : v < 0 ? 'text-obs-secondary' : 'text-slate-500';

const SIGNAL_MAP = {
  strong_buy:  { label: '강력 매수', cls: 'sig-strong-buy' },
  buy:         { label: '매수',     cls: 'sig-buy' },
  neutral:     { label: '중립',     cls: 'sig-neutral' },
  sell:        { label: '매도',     cls: 'sig-sell' },
  strong_sell: { label: '강력 매도', cls: 'sig-strong-sell' },
};

const rsiClass = (v) => {
  if (v == null) return '';
  if (v < 30) return 'text-obs-tertiary';
  if (v < 40) return 'text-obs-tertiary/70';
  if (v < 60) return 'text-slate-400';
  if (v < 70) return 'text-obs-secondary/70';
  return 'text-obs-secondary';
};

const signalBadge = (signal) => {
  const s = SIGNAL_MAP[signal] ?? { label: signal, cls: 'sig-neutral' };
  return `<span class="inline-block text-[10px] font-black px-3 py-1 rounded-full ${s.cls}">${s.label}</span>`;
};

// ─── 사이드바 토글 ──────────────────────────────────────
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const isOpen = !sidebar.classList.contains('-translate-x-full');
  sidebar.classList.toggle('-translate-x-full', isOpen);
  overlay.classList.toggle('hidden', isOpen);
  document.body.style.overflow = isOpen ? '' : 'hidden';
}

// ─── 섹션 스크롤 ────────────────────────────────────────
function scrollToSection(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  // 모바일이면 사이드바 닫기
  if (window.innerWidth < 1024) {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar.classList.contains('-translate-x-full')) toggleSidebar();
  }
}

// ─── 뉴스 탭 전환 ──────────────────────────────────────
let _currentNewsTab = 'korean';
function switchNewsTab(tab, btn) {
  _currentNewsTab = tab;
  const korean = document.getElementById('news-korean');
  const global = document.getElementById('news-global');
  korean.classList.toggle('hidden', tab !== 'korean');
  global.classList.toggle('hidden', tab !== 'global');
  document.querySelectorAll('.news-tab').forEach(t => {
    if (t === btn) {
      t.className = 'news-tab text-[10px] font-bold text-obs-primary px-2 py-1 bg-obs-primary/10 rounded';
    } else {
      t.className = 'news-tab text-[10px] font-bold text-slate-400 px-2 py-1 hover:bg-white/5 rounded';
    }
  });
  updateTranslateBtnState();
}

// ─── 뉴스 번역 ──────────────────────────────────────────
// 탭별 원본/번역 캐시
const _newsCache = {
  korean: { original: null, translated: null, isTranslated: false },
  global: { original: null, translated: null, isTranslated: false },
};

function updateTranslateBtnState() {
  const label = document.getElementById('translate-btn-label');
  const btn = document.getElementById('translate-btn');
  const cache = _newsCache[_currentNewsTab];
  if (cache.isTranslated) {
    label.textContent = '원문';
    btn.classList.remove('text-slate-500');
    btn.classList.add('text-obs-primary', 'bg-obs-primary/10');
  } else {
    label.textContent = '번역';
    btn.classList.remove('text-obs-primary', 'bg-obs-primary/10');
    btn.classList.add('text-slate-500');
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
    const articles = cache.original.map(a => ({
      title: a.title,
      description: a.description || '',
    }));

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

// ─── 네비게이션 검색 동기화 ──────────────────────────────
function onNavSearch(value) {
  document.getElementById('search-input').value = value;
  onSearch(value);
  scrollToSection('screener-section');
}

// ─── 전체 로드 ───────────────────────────────────────────
async function loadAll() {
  document.getElementById('last-updated').textContent = '로딩 중...';
  await Promise.all([loadMarket(), loadStocks(), loadNews()]);
  document.getElementById('last-updated').textContent =
    new Date().toLocaleTimeString('ko-KR');
}

// ─── AI 종목 추천 ─────────────────────────────────────────
async function loadRecommendations() {
  const section = document.getElementById('rec-section');
  const grid    = document.getElementById('rec-grid');
  const summary = document.getElementById('rec-summary');
  const btn     = document.getElementById('rec-btn');

  btn.disabled = true;
  btn.textContent = '분석 중...';
  grid.innerHTML  = '<div class="col-span-full text-center py-8 text-slate-500 text-sm">AI가 주식 데이터와 뉴스를 분석하고 있습니다...</div>';
  summary.textContent = '';
  section.classList.remove('hidden');

  try {
    const res  = await fetch('/recommendations');
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || '추천 생성 실패');
    }
    const data = await res.json();

    summary.textContent = data.summary;
    window._recData = data.recommendations;

    grid.innerHTML = data.recommendations.map((r) => `
      <div class="bg-obs-s1 p-5 rounded-xl border border-obs-outline/10 hover:border-obs-primary/30 transition-all cursor-pointer group" onclick="openRecModal(${r.rank - 1})">
        <div class="flex justify-between items-start mb-3">
          <div class="w-8 h-8 rounded-full bg-gradient-to-br from-obs-primary to-emerald-400 text-[#003824] font-bold flex items-center justify-center text-sm flex-shrink-0">${r.rank}</div>
          <span class="text-[10px] font-bold text-obs-tertiary bg-obs-tertiary/10 px-2 py-0.5 rounded">${r.sector}</span>
        </div>
        <h4 class="text-sm font-bold mb-1">${r.name}</h4>
        <p class="text-[10px] text-slate-500 font-mono mb-2">${r.ticker}</p>
        <p class="text-[11px] text-slate-400 line-clamp-2 leading-relaxed mb-3">${r.reason}</p>
        <div class="text-[10px] text-obs-primary opacity-60 group-hover:opacity-100 transition-opacity">상세 분석 보기 →</div>
      </div>`).join('');

    const ts = new Date(data.generatedAt).toLocaleTimeString('ko-KR');
    document.getElementById('rec-time').textContent = `생성: ${ts}`;
  } catch (e) {
    grid.innerHTML = `<div class="col-span-full text-center py-8 text-obs-secondary text-sm">오류: ${e.message}</div>`;
  } finally {
    btn.disabled = false;
    btn.textContent = '↻ 다시 분석';
  }
}

// ─── 추천 상세 모달 ───────────────────────────────────────
function openRecModal(idx) {
  const r = (window._recData ?? [])[idx];
  if (!r) return;

  window._recCurrentTicker = r.ticker;

  document.getElementById('rec-modal-name').textContent      = r.name;
  document.getElementById('rec-modal-ticker').textContent    = r.ticker;
  document.getElementById('rec-modal-sector').textContent    = r.sector;
  document.getElementById('rec-modal-reason').textContent    = r.reason;
  document.getElementById('rec-modal-market').textContent    = r.detail?.marketAnalysis    ?? '-';
  document.getElementById('rec-modal-technical').textContent = r.detail?.technicalAnalysis ?? '-';
  document.getElementById('rec-modal-news').textContent      = r.detail?.newsImpact        ?? '-';
  document.getElementById('rec-modal-risk').textContent      = r.detail?.riskFactors       ?? '-';

  document.getElementById('rec-modal-overlay').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function openDetailFromRec() {
  const ticker = window._recCurrentTicker;
  if (!ticker) return;
  document.getElementById('rec-modal-overlay').classList.add('hidden');
  openDetail(ticker);
}

function closeRecModal(e) {
  if (e && e.target !== document.getElementById('rec-modal-overlay')) return;
  document.getElementById('rec-modal-overlay').classList.add('hidden');
  document.body.style.overflow = '';
}

// ─── 뉴스 ────────────────────────────────────────────────
async function loadNews() {
  const setLoading = (id) => {
    document.getElementById(id).innerHTML = '<div class="text-sm text-slate-500 py-4">로딩 중...</div>';
  };
  setLoading('news-korean');
  setLoading('news-global');

  try {
    const res  = await fetch('/news');
    const data = await res.json();
    // 원본 캐시 (번역 기능용)
    _newsCache.korean = { original: data.korean, translated: null, isTranslated: false };
    _newsCache.global = { original: data.global, translated: null, isTranslated: false };
    updateTranslateBtnState();
    renderNewsList('news-korean', data.korean);
    renderNewsList('news-global', data.global);
  } catch (e) {
    document.getElementById('news-korean').innerHTML = '<div class="text-sm text-slate-500 py-4">로드 실패</div>';
    document.getElementById('news-global').innerHTML = '<div class="text-sm text-slate-500 py-4">로드 실패</div>';
  }
}

function renderNewsList(id, articles) {
  const el = document.getElementById(id);
  if (!articles?.length) {
    el.innerHTML = '<div class="text-sm text-slate-500 py-4">뉴스 없음</div>';
    return;
  }
  el.innerHTML = articles.map(a => {
    const date = new Date(a.publishedAt).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    return `
      <div class="group cursor-pointer" onclick="window.open('${a.url}', '_blank')">
        <p class="text-[10px] font-bold uppercase tracking-widest mb-1 text-obs-primary">${a.source}</p>
        <h3 class="text-sm font-semibold group-hover:text-obs-primary transition-colors leading-snug">${a.title}</h3>
        ${a.description ? `<p class="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">${a.description}</p>` : ''}
        <p class="text-[10px] text-slate-600 mt-2">${date}</p>
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
    const indexOrder = ['KOSPI', 'KOSDAQ', 'KOSPI200'];
    grid.innerHTML = indexOrder.map(key => {
      const idx = data.indices[key];
      if (!idx) return '';
      const isUp = idx.change > 0;
      const isDown = idx.change < 0;
      const colorCls = isUp ? 'text-obs-primary' : isDown ? 'text-obs-secondary' : 'text-slate-500';
      const arrowIcon = isUp ? 'arrow_drop_up' : isDown ? 'arrow_drop_down' : '';
      const svgPath = isUp
        ? 'M0,35 Q10,32 20,34 T40,28 T60,20 T80,15 T100,10'
        : isDown
        ? 'M0,15 Q10,18 20,12 T40,22 T60,28 T80,25 T100,30'
        : 'M0,25 Q25,22 50,25 T75,23 T100,25';
      const svgColor = isUp ? '#4edea3' : isDown ? '#ffb3ad' : '#adc6ff';
      return `
        <div class="bg-obs-s2 rounded-2xl p-6 relative overflow-hidden group hover:bg-obs-s3 transition-colors">
          <div class="absolute inset-0 opacity-10 pointer-events-none">
            <svg class="w-full h-full" viewBox="0 0 100 40" preserveAspectRatio="none">
              <path d="${svgPath}" fill="none" stroke="${svgColor}" stroke-width="2"/>
            </svg>
          </div>
          <div class="relative z-10">
            <div class="flex justify-between items-start mb-2">
              <span class="text-xs font-bold text-slate-500 tracking-wider font-headline">${idx.name}</span>
              <span class="${colorCls} text-[10px] font-bold flex items-center gap-0.5">
                ${arrowIcon ? `<span class="material-symbols-outlined text-xs">${arrowIcon}</span>` : ''}
                ${fmtP(idx.changePercent)}
              </span>
            </div>
            <div class="text-2xl font-black font-headline">${fmt(idx.value)}</div>
            <div class="text-[10px] text-slate-500 mt-1">고가: ${fmt(idx.dayHigh)} • 저가: ${fmt(idx.dayLow)}</div>
          </div>
        </div>`;
    }).join('');
  } catch (e) {
    console.error('시장 데이터 로드 실패:', e);
  }
}

// ─── 종목 목록 ───────────────────────────────────────────
async function loadStocks() {
  const tbody = document.getElementById('stocks-tbody');
  tbody.innerHTML = '<tr><td colspan="8" class="text-center py-10 text-slate-500">데이터 로딩 중...</td></tr>';

  try {
    const res = await fetch('/stocks');
    const data = await res.json();
    allStocks = data.stocks ?? [];
    applyFilters();
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center py-10 text-obs-secondary">데이터 로드 실패: ${e.message}</td></tr>`;
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

let _searchTimer = null;
function onSearch(value) {
  currentQuery = value.trim();
  document.getElementById('search-clear').classList.toggle('hidden', !currentQuery);
  // 네비 검색 동기화
  const navInput = document.getElementById('nav-search-input');
  if (navInput && navInput.value !== value) navInput.value = value;
  clearTimeout(_searchTimer);
  _searchTimer = setTimeout(applyFilters, 200);
}

function clearSearch() {
  const input = document.getElementById('search-input');
  input.value = '';
  const navInput = document.getElementById('nav-search-input');
  if (navInput) navInput.value = '';
  onSearch('');
  input.focus();
}

function renderStocks(stocks) {
  const tbody = document.getElementById('stocks-tbody');
  if (!stocks.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center py-10 text-slate-500">데이터 없음</td></tr>';
    renderPagination(0);
    return;
  }

  const totalPages = Math.ceil(stocks.length / PER_PAGE);
  if (currentPage > totalPages) currentPage = totalPages;
  const start = (currentPage - 1) * PER_PAGE;
  const paged = stocks.slice(start, start + PER_PAGE);

  const stockRow = (s) => {
    const cc = changeClass(s.changePercent);
    const mktCls = s.market === 'KOSPI'
      ? 'bg-obs-tertiary/10 text-obs-tertiary'
      : 'bg-obs-primary/10 text-obs-primary';
    const maVs = s.ma20 ? (s.price > s.ma20 ? 'text-obs-primary' : 'text-obs-secondary') : '';
    const maLabel = s.ma20
      ? `<span class="${maVs}">${fmt(s.ma20)}</span>`
      : '<span class="text-slate-600">-</span>';
    const macdVal = s.macd != null
      ? `<span class="${s.macd > 0 ? 'text-obs-primary' : 'text-obs-secondary'} font-bold">${s.macd > 0 ? '+' : ''}${fmt(s.macd)}</span>`
      : '<span class="text-slate-600">-</span>';

    const rsiWidth = s.rsi != null ? s.rsi : 0;
    const rsiFillColor = s.rsi < 30 ? '#adc6ff' : s.rsi > 70 ? '#ffb3ad' : '#4edea3';

    return `
      <tr class="group hover:bg-obs-s3 transition-all cursor-pointer" onclick="openDetail('${s.ticker}')">
        <td class="px-4 py-3 rounded-l-xl bg-obs-s1 group-hover:bg-transparent">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-obs-s3 flex items-center justify-center font-bold text-[10px] text-slate-400 flex-shrink-0">${s.name.charAt(0)}</div>
            <div>
              <div class="font-bold text-sm">${s.name} <span class="text-[9px] font-semibold px-1.5 py-0.5 rounded ${mktCls}">${s.market}</span></div>
              <div class="text-[10px] text-slate-500">${s.sector}</div>
            </div>
          </div>
        </td>
        <td class="px-4 py-3 bg-obs-s1 group-hover:bg-transparent text-right font-bold tabular-nums">${fmt(s.price)}</td>
        <td class="px-4 py-3 bg-obs-s1 group-hover:bg-transparent text-right ${cc}">
          <div class="font-medium">${fmtP(s.changePercent)}</div>
          <div class="text-[10px]">${s.change > 0 ? '+' : ''}${fmt(s.change)}</div>
        </td>
        <td class="px-4 py-3 bg-obs-s1 group-hover:bg-transparent text-right text-xs text-slate-400">${fmtV(s.volume)}</td>
        <td class="px-4 py-3 bg-obs-s1 group-hover:bg-transparent text-center">
          <div class="w-16 h-1 bg-obs-s4 rounded-full overflow-hidden mx-auto">
            <div class="h-full rounded-full" style="width:${rsiWidth}%; background:${rsiFillColor}"></div>
          </div>
          <div class="text-[10px] mt-1 text-slate-500">${s.rsi ?? '-'}</div>
        </td>
        <td class="px-4 py-3 bg-obs-s1 group-hover:bg-transparent text-center text-xs">${macdVal}</td>
        <td class="px-4 py-3 bg-obs-s1 group-hover:bg-transparent text-right text-xs">${maLabel}</td>
        <td class="px-4 py-3 rounded-r-xl bg-obs-s1 group-hover:bg-transparent text-right">${signalBadge(s.signal)}</td>
      </tr>`;
  };

  if (!sortKey) {
    const groups = paged.reduce((acc, s) => {
      (acc[s.sector] = acc[s.sector] ?? []).push(s);
      return acc;
    }, {});
    tbody.innerHTML = Object.entries(groups).map(([sector, list]) =>
      `<tr><td colspan="8" class="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-600 bg-obs-s2">${sector}</td></tr>` +
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
    const active = i === currentPage
      ? 'bg-obs-s3 text-obs-primary border border-obs-primary/20'
      : 'bg-obs-s1 text-slate-400 hover:text-white hover:bg-obs-s3';
    pages += `<button class="px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${active}" onclick="goPage(${i})">${i}</button>`;
  }

  wrap.innerHTML = `
    <p class="text-xs text-slate-500 font-medium">${start}–${end} / ${total}개</p>
    <div class="flex gap-2">
      <button class="px-4 py-1.5 bg-obs-s1 hover:bg-obs-s3 rounded-xl text-xs font-bold text-slate-400 transition-colors" onclick="goPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled style="opacity:0.3;pointer-events:none"' : ''}>Previous</button>
      ${pages}
      <button class="px-4 py-1.5 bg-obs-s1 hover:bg-obs-s3 rounded-xl text-xs font-bold text-slate-400 transition-colors" onclick="goPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled style="opacity:0.3;pointer-events:none"' : ''}>Next</button>
    </div>`;
}

let _filteredStocks = [];
function goPage(page) {
  currentPage = page;
  renderStocks(_filteredStocks);
}

function filterMarket(market, btn) {
  currentMarket = market;
  document.querySelectorAll('.filter-tab').forEach(t => {
    if (t === btn) {
      t.className = 'filter-tab px-4 py-1.5 text-xs font-bold rounded-lg transition-colors bg-obs-s3 text-white shadow-lg';
    } else {
      t.className = 'filter-tab px-4 py-1.5 text-xs font-bold rounded-lg transition-colors text-slate-400 hover:text-white';
    }
  });
  applyFilters();
}

// ─── 종목 상세 모달 ──────────────────────────────────────
async function openDetail(ticker) {
  currentDetailTicker = ticker;
  document.getElementById('ai-analysis-result').classList.add('hidden');
  document.getElementById('ai-analysis-btn').textContent = '분석 시작';
  document.getElementById('modal-overlay').classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  const cached = allStocks.find(s => s.ticker === ticker);
  if (cached) {
    document.getElementById('modal-name').textContent = cached.name;
    document.getElementById('modal-ticker').textContent = cached.ticker;
    document.getElementById('modal-sector').textContent = cached.sector;
    document.getElementById('modal-price').textContent = fmt(cached.price) + '원';
    const cc = changeClass(cached.changePercent);
    const changeEl = document.getElementById('modal-change');
    changeEl.textContent = `${cached.change > 0 ? '▲' : cached.change < 0 ? '▼' : '─'} ${fmt(Math.abs(cached.change))} (${fmtP(cached.changePercent)})`;
    changeEl.className = cc;
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

  document.getElementById('modal-name').textContent = d.name;
  document.getElementById('modal-ticker').textContent = d.ticker;
  document.getElementById('modal-sector').textContent = d.sector;

  document.getElementById('modal-price').textContent = fmt(d.price) + '원';
  const changeEl = document.getElementById('modal-change');
  changeEl.textContent = `${d.change > 0 ? '▲' : d.change < 0 ? '▼' : '─'} ${fmt(Math.abs(d.change))} (${fmtP(d.changePercent)})`;
  changeEl.className = `text-lg font-semibold ${cc}`;

  document.getElementById('modal-day-high').textContent = fmt(d.dayHigh);
  document.getElementById('modal-day-low').textContent  = fmt(d.dayLow);
  document.getElementById('modal-52h').textContent = fmt(d.fiftyTwoWeekHigh);
  document.getElementById('modal-52l').textContent = fmt(d.fiftyTwoWeekLow);
  document.getElementById('modal-vol').textContent = fmtV(d.volume);

  const lo = d.fiftyTwoWeekLow ?? d.price;
  const hi = d.fiftyTwoWeekHigh ?? d.price;
  const pct = hi > lo ? ((d.price - lo) / (hi - lo)) * 100 : 50;
  document.getElementById('modal-52l-label').textContent = fmt(lo);
  document.getElementById('modal-52h-label').textContent = fmt(hi);
  document.getElementById('modal-range-dot').style.left = `${pct}%`;

  renderPriceChart(d.recentPrices);

  // RSI
  const rsi = ind.rsi;
  document.getElementById('ind-rsi').textContent = rsi ?? '-';
  const rsiColorCls = rsi == null ? '' : rsi < 30 ? 'text-obs-tertiary' : rsi > 70 ? 'text-obs-secondary' : rsi < 40 ? 'text-obs-tertiary/70' : rsi > 60 ? 'text-obs-secondary/70' : 'text-slate-300';
  document.getElementById('ind-rsi').className = `text-2xl font-bold mb-1 ${rsiColorCls}`;
  const rsiLabel = rsi == null ? '' : rsi < 30 ? '과매도' : rsi > 70 ? '과매수' : rsi < 40 ? '저평가' : rsi > 60 ? '고평가' : '중립';
  document.getElementById('ind-rsi-label').textContent = rsiLabel;
  if (rsi != null) {
    const fill = document.getElementById('rsi-bar-fill');
    const dot  = document.getElementById('rsi-bar-dot');
    const color = rsi < 30 ? '#adc6ff' : rsi > 70 ? '#ffb3ad' : '#4edea3';
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
    document.getElementById('ind-macd').className = `text-2xl font-bold mb-1 ${ind.macd.histogram > 0 ? 'text-obs-primary' : 'text-obs-secondary'}`;
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
    const vs = val ? (d.price > val ? 'text-obs-primary' : 'text-obs-secondary') : '';
    return `
      <div class="text-center bg-obs-s1 rounded-lg p-3">
        <div class="text-[10px] text-slate-500 mb-1">${label}</div>
        <div class="text-sm font-semibold ${vs}">${fmt(val)}</div>
        <div class="text-[10px] ${vs} mt-1">${val ? (d.price > val ? '▲ 상회' : '▼ 하회') : ''}</div>
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
    const borderCls = isBear ? 'border-l-obs-secondary' : isBull ? 'border-l-obs-primary' : 'border-l-obs-outline';
    return `<li class="text-xs px-3 py-2 rounded-lg bg-obs-s1 border-l-[3px] ${borderCls}">${r}</li>`;
  }).join('');
}

function renderPriceChart(prices) {
  const ctx = document.getElementById('price-chart').getContext('2d');
  if (priceChart) { priceChart.destroy(); priceChart = null; }

  if (!prices || !prices.length) return;

  const labels = prices.map(p => p.date.slice(5));
  const closes = prices.map(p => p.close);
  const first  = closes[0];
  const isUp   = closes[closes.length - 1] >= first;
  const color  = isUp ? '#4edea3' : '#ffb3ad';

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
          ticks: { color: '#64748b', maxTicksLimit: 8, font: { size: 11 } },
          grid:  { color: '#222a3d' },
        },
        y: {
          position: 'right',
          ticks: { color: '#64748b', font: { size: 11 }, callback: v => v.toLocaleString('ko-KR') },
          grid:  { color: '#222a3d' },
        },
      },
    },
  });
}

// ─── AI 심층 분석 ─────────────────────────────────────────
let currentDetailTicker = null;

const AI_OPINION_MAP = {
  '강력매수': { cls: 'sig-strong-buy' },
  '매수':     { cls: 'sig-buy' },
  '보유':     { cls: 'sig-neutral' },
  '매도':     { cls: 'sig-sell' },
  '강력매도': { cls: 'sig-strong-sell' },
};

async function loadAiAnalysis() {
  if (!currentDetailTicker) return;

  const btn    = document.getElementById('ai-analysis-btn');
  const result = document.getElementById('ai-analysis-result');

  btn.disabled = true;
  btn.textContent = '분석 중...';
  result.classList.add('hidden');

  try {
    const res = await fetch(`/stocks/${currentDetailTicker}/ai-analysis`);
    const d   = await res.json();
    if (d.statusCode) throw new Error(d.message);

    const opinionInfo = AI_OPINION_MAP[d.opinion] ?? { cls: 'sig-neutral' };
    const badge = document.getElementById('ai-opinion-badge');
    badge.textContent  = d.opinion;
    badge.className    = `ai-opinion-badge ${opinionInfo.cls}`;

    document.getElementById('ai-summary').textContent   = d.summary;
    document.getElementById('ai-technical').textContent = d.technical;
    document.getElementById('ai-short').textContent     = d.shortTermOutlook;
    document.getElementById('ai-mid').textContent       = d.midTermOutlook;
    document.getElementById('ai-risks').textContent     = d.risks;
    document.getElementById('ai-generated-at').textContent =
      '생성: ' + new Date(d.generatedAt).toLocaleString('ko-KR');

    result.classList.remove('hidden');
    btn.textContent = '다시 분석';
  } catch (e) {
    btn.textContent = '분석 실패 — 재시도';
    alert('AI 분석 중 오류가 발생했습니다: ' + e.message);
  } finally {
    btn.disabled = false;
  }
}

function closeModal(e) {
  if (e && e.target !== document.getElementById('modal-overlay')) return;
  document.getElementById('modal-overlay').classList.add('hidden');
  document.body.style.overflow = '';
  if (priceChart) { priceChart.destroy(); priceChart = null; }
  document.getElementById('ai-analysis-result').classList.add('hidden');
  document.getElementById('ai-analysis-btn').textContent = '분석 시작';
  currentDetailTicker = null;
}

// ESC 키로 모달 닫기
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeModal();
    closeRecModal();
  }
});

// ─── 초기 실행 ───────────────────────────────────────────
loadAll();
