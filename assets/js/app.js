/* ============================================================
   오렌지 라이브 허브 — 공통 스크립트
   의존: assets/js/data.js (window.OLH)
   ============================================================ */
(function () {
  'use strict';

  var D = window.OLH || {};
  var CFG = D.config || {};
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- 유틸 ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function today() { var d = new Date(); d.setHours(0, 0, 0, 0); return d; }

  function parseDate(iso) {
    var p = String(iso).split('-');
    return new Date(+p[0], +p[1] - 1, +p[2]);
  }

  function dday(iso) {
    return Math.ceil((parseDate(iso) - today()) / 86400000);
  }

  function fmtDate(iso) {
    var p = String(iso).split('-');
    return p[1] + '.' + p[2];
  }

  function fmtDateLong(iso) {
    var d = parseDate(iso);
    var dw = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()];
    return d.getFullYear() + '년 ' + (d.getMonth() + 1) + '월 ' + d.getDate() + '일 (' + dw + ')';
  }

  /* 방송 상태 계산 — 날짜 기준 (오픈 전에는 전부 예정) */
  function calcStatus(b) {
    var n = new Date();
    var s = parseDate(b.date); s.setHours(+b.start.split(':')[0], +b.start.split(':')[1], 0, 0);
    var e = parseDate(b.date); e.setHours(+b.end.split(':')[0], +b.end.split(':')[1], 0, 0);
    if (n >= s && n <= e) return 'live';
    if (n > e) return 'ended';
    return 'scheduled';
  }

  var ST = {
    live: { cls: 'state--live', txt: 'LIVE 진행 중' },
    scheduled: { cls: 'state--soon', txt: '방송 예정' },
    ended: { cls: 'state--end', txt: '방송 종료' }
  };

  function stateBadge(st) {
    var m = ST[st] || ST.scheduled;
    return '<span class="state ' + m.cls + '"><i class="state__dot"></i>' + m.txt + '</span>';
  }

  function planBadge() {
    return '<span class="state state--plan">계획</span>';
  }

  /* 채널 칩 — 링크가 확정되지 않으면 비활성 (LVC-001) */
  var CH_SHORT = { naver: '네이버', youtube: '유튜브', kakao: '카카오', tiktok: '틱톡' };

  function chChip(key, compact) {
    var c = (D.channels || {})[key];
    if (!c) return '';
    var label = compact ? (CH_SHORT[key] || c.name) : c.name;
    var ready = CFG.channelLinksReady && c.url;
    var mark = '<span class="pill__ch" style="background:' + c.color + (c.textDark ? ';color:#0D1B2A' : '') + '">' + c.short + '</span>';
    if (ready) {
      return '<a class="pill pill--on" href="' + esc(c.url) + '" target="_blank" rel="noopener">' + mark + esc(label) + '</a>';
    }
    return '<span class="pill pill--off" title="' + esc(c.name) + ' · 채널 계정 확정 후 공개됩니다">' + mark + esc(label) + '</span>';
  }

  function chChipSmall(key) { return chChip(key, true); }

  /* ---------- 헤더 / 모바일 메뉴 ---------- */
  function initNav() {
    var b = $('#burger'), m = $('#mnav');
    if (!b || !m) return;
    b.addEventListener('click', function () {
      var open = m.classList.toggle('is-open');
      b.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    $$('a', m).forEach(function (a) {
      a.addEventListener('click', function () { m.classList.remove('is-open'); b.setAttribute('aria-expanded', 'false'); });
    });
  }

  /* ---------- 오픈 D-day ---------- */
  function initDday() {
    var n = dday(CFG.openDate);
    var txt = n > 0 ? 'D-' + n : (n === 0 ? 'D-DAY' : '오픈');
    $$('[data-dday]').forEach(function (el) { el.textContent = txt; });
    $$('[data-opendate]').forEach(function (el) { el.textContent = fmtDateLong(CFG.openDate); });
    $$('[data-asof]').forEach(function (el) { el.textContent = CFG.asOf; });
  }

  /* ---------- 스크롤 리빌 ---------- */
  function initReveal() {
    var els = $$('.rv');
    if (!els.length) return;
    if (!('IntersectionObserver' in window)) { els.forEach(function (e) { e.classList.add('is-in'); }); return; }
    var io = new IntersectionObserver(function (en) {
      en.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: .08 });
    els.forEach(function (e) { io.observe(e); });
  }

  /* ---------- 아코디언 ---------- */
  function initAcc(root) {
    $$('.acc__q', root || document).forEach(function (q) {
      q.addEventListener('click', function () {
        var i = q.closest('.acc__i');
        var open = i.classList.toggle('is-open');
        q.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    });
  }

  /* ---------- 편성 레일 (홈 시그니처) ---------- */
  function initRail() {
    var box = $('#rail');
    if (!box) return;
    var list = (D.broadcasts || []).slice(0, 8);
    box.innerHTML = list.map(function (b) {
      var st = calcStatus(b);
      return '<article class="slot slot--' + (st === 'live' ? 'live' : 'soon') + '">' +
        '<span class="slot__lamp" aria-hidden="true"></span>' +
        '<div class="slot__time">' + esc(b.start) + '</div>' +
        '<div class="slot__date">' + esc(b.date.slice(5).replace('-', '.')) + ' ' + esc(b.dow) + '</div>' +
        '<h3 class="slot__title"><a href="broadcast.html?id=' + esc(b.id) + '">' + esc(b.title) + '</a></h3>' +
        '<div class="slot__meta">' + esc(b.cat) + '<i></i>' + esc(b.studio) + '</div>' +
        '<div class="slot__st">' + stateBadge(st) + '</div>' +
        '</article>';
    }).join('');
  }

  /* ---------- 방송 카드 ---------- */
  function bcard(b) {
    var st = calcStatus(b);
    return '<article class="card card--link">' +
      '<a href="broadcast.html?id=' + esc(b.id) + '" aria-label="' + esc(b.title) + ' 방송 상세 보기">' +
      '<div class="card__media">' +
      '<img src="assets/img/' + esc(b.thumb) + '" alt="' + esc(b.title) + ' 방송 이미지" loading="lazy" width="1000" height="563">' +
      '<div class="card__badges">' + stateBadge(st) + '</div>' +
      '<div class="card__time"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>' +
      esc(fmtDate(b.date)) + ' ' + esc(b.dow) + ' · ' + esc(b.start) + '</div>' +
      '</div></a>' +
      '<div class="card__body">' +
      '<span class="card__cat">' + esc(b.cat) + '</span>' +
      '<h3 class="card__title"><a href="broadcast.html?id=' + esc(b.id) + '">' + esc(b.title) + '</a></h3>' +
      '<p class="card__desc">' + esc(b.lineup.join(' · ')) + '</p>' +
      '<div class="card__foot">' +
      '<span class="card__host">' + esc(b.host) + ' · ' + esc(b.studio) + '</span>' +
      '</div>' +
      '<div class="card__foot" style="border:0;padding-top:2px;gap:5px">' + b.channels.map(chChipSmall).join('') + '</div>' +
      '</div></article>';
  }

  /* ---------- 방송 행 (편성표 러다운) ---------- */
  function brow(b) {
    var st = calcStatus(b);
    return '<article class="row">' +
      '<div class="row__time"><b>' + esc(b.start) + '</b><span>– ' + esc(b.end) + '</span></div>' +
      '<a class="row__thumb" href="broadcast.html?id=' + esc(b.id) + '" tabindex="-1" aria-hidden="true">' +
      '<img src="assets/img/' + esc(b.thumb) + '" alt="" loading="lazy" width="1000" height="563"></a>' +
      '<div class="row__main">' +
      '<span class="row__cat">' + esc(b.cat) + '</span>' +
      '<h3 class="row__t"><a href="broadcast.html?id=' + esc(b.id) + '">' + esc(b.title) + '</a></h3>' +
      '<p class="row__d">' + esc(b.lineup.join(' · ')) + '</p>' +
      '<div class="row__sub">' + esc(b.host) + '<i></i>' + esc(b.studio) + '<i></i>' + esc(b.seller) + '</div>' +
      '</div>' +
      '<div class="row__side">' + stateBadge(st) +
      '<div class="row__ch">' + b.channels.map(chChipSmall).join('') + '</div>' +
      '</div>' +
      (b.note ? '<div class="row__note"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v4h1"/></svg><span>' + esc(b.note) + '</span></div>' : '') +
      '</article>';
  }

  /* ---------- 홈: 이번 주 편성 ---------- */
  function initHomeSchedule() {
    var box = $('#homeSchedule');
    if (!box) return;
    box.innerHTML = (D.broadcasts || []).slice(0, 4).map(bcard).join('');
  }

  /* ---------- 편성표 페이지 ---------- */
  function initSchedule() {
    var box = $('#scheduleList');
    if (!box) return;
    var state = { cat: 'all', ch: 'all', st: 'all' };

    function apply() {
      var list = (D.broadcasts || []).filter(function (b) {
        if (state.cat !== 'all' && b.cat !== state.cat) return false;
        if (state.ch !== 'all' && b.channels.indexOf(state.ch) < 0) return false;
        if (state.st !== 'all' && calcStatus(b) !== state.st) return false;
        return true;
      });

      var cnt = $('#scheduleCount');
      if (cnt) cnt.innerHTML = '<b>' + list.length + '</b>건';

      if (!list.length) {
        box.className = '';
        box.innerHTML =
          '<div class="empty">' +
          '<img src="assets/img/mascot.webp" alt="" width="82" height="82">' +
          '<h3>조건에 맞는 방송이 없습니다</h3>' +
          '<p>선택한 카테고리와 채널 조합으로 잡힌 편성이 아직 없습니다. 조건을 지우고 오픈 첫 주 편성을 전체로 확인해 보세요.</p>' +
          '<button type="button" class="btn btn--line btn--sm" id="resetFilter">조건 지우기</button>' +
          '</div>';
        var r = $('#resetFilter');
        if (r) r.addEventListener('click', function () {
          state = { cat: 'all', ch: 'all', st: 'all' };
          $$('.chipbtn').forEach(function (c) { c.setAttribute('aria-pressed', c.dataset.v === 'all' ? 'true' : 'false'); });
          apply();
        });
        return;
      }

      // 날짜별 그룹 → 편성 러다운
      var groups = {};
      list.forEach(function (b) { (groups[b.date] = groups[b.date] || []).push(b); });
      box.className = 'rows';
      box.innerHTML = Object.keys(groups).sort().map(function (d) {
        var dw = fmtDateLong(d).split('(')[1].replace(')', '');
        var head = '<div class="rowdate"><h2>' + esc(d.replace(/-/g, '.')) + '</h2>' +
          '<span>' + esc(dw) + '요일</span><em>' + groups[d].length + '개 방송</em></div>';
        return head + groups[d].sort(function (a, b) { return a.start < b.start ? -1 : 1; }).map(brow).join('');
      }).join('');
    }

    // 로딩 스켈레톤 → 렌더 (실제 API 연동 시 fetch 대기 구간)
    box.className = 'rows';
    box.innerHTML = Array(5).join('x').split('x').map(function () {
      return '<div class="row"><div class="skel" style="height:34px"></div>' +
        '<div class="skel" style="aspect-ratio:16/9"></div>' +
        '<div><div class="skel" style="height:14px;width:22%"></div>' +
        '<div class="skel" style="height:20px;margin-top:8px"></div>' +
        '<div class="skel" style="height:14px;width:64%;margin-top:8px"></div></div>' +
        '<div class="skel" style="height:28px"></div></div>';
    }).join('');

    setTimeout(apply, 320);

    $$('.chipbtn').forEach(function (c) {
      c.addEventListener('click', function () {
        var k = c.dataset.k, v = c.dataset.v;
        state[k] = v;
        $$('.chipbtn[data-k="' + k + '"]').forEach(function (o) { o.setAttribute('aria-pressed', o === c ? 'true' : 'false'); });
        apply();
      });
    });
  }

  /* ---------- 방송 상세 ---------- */
  function initBroadcast() {
    var box = $('#bcDetail');
    if (!box) return;
    var id = new URLSearchParams(location.search).get('id');
    var b = (D.broadcasts || []).filter(function (x) { return x.id === id; })[0];

    if (!b) {
      box.innerHTML =
        '<div class="empty" style="padding-block:80px">' +
        '<img src="assets/img/mascot.webp" alt="" width="82" height="82">' +
        '<h3>방송을 찾을 수 없습니다</h3>' +
        '<p>주소가 잘못되었거나 편성이 변경된 방송입니다. 편성표에서 다시 확인해 주세요.</p>' +
        '<a class="btn btn--primary btn--sm" href="schedule.html">편성표로 이동</a>' +
        '</div>';
      return;
    }

    var st = calcStatus(b);
    document.title = b.title + ' — 오렌지 라이브 허브';
    var t = $('#bcCrumb'); if (t) t.textContent = b.title;

    box.innerHTML =
      '<div class="split" style="align-items:flex-start;gap:48px">' +
      '<div class="split__media">' +
      '<img src="assets/img/' + esc(b.thumb) + '" alt="' + esc(b.title) + ' 방송 이미지" width="1000" height="625">' +
      '<span class="split__cap">' + esc(b.studio) + ' · 브랜드 컨셉 이미지</span>' +
      '</div>' +
      '<div>' +
      '<div class="btn-row" style="gap:8px">' + stateBadge(st) + planBadge() + '<span class="tag">' + esc(b.cat) + '</span></div>' +
      '<h1 style="font-size:clamp(26px,3.4vw,36px);font-weight:800;letter-spacing:-.04em;line-height:1.3;margin-top:18px">' + esc(b.title) + '</h1>' +
      '<dl class="hero__meta" style="margin-top:26px;padding-top:22px">' +
      '<div class="hero__stat"><dt>방송일</dt><dd class="mono" style="font-size:19px">' + esc(b.date.replace(/-/g, '.')) + ' <span>' + esc(b.dow) + '</span></dd></div>' +
      '<div class="hero__stat"><dt>방송 시간</dt><dd class="mono" style="font-size:19px">' + esc(b.start) + '–' + esc(b.end) + '</dd></div>' +
      '<div class="hero__stat"><dt>진행</dt><dd style="font-family:var(--f-sans);font-size:19px">' + esc(b.host) + '</dd></div>' +
      '</dl>' +
      '<div class="mt-32"><h2 style="font-size:15px;font-weight:700;margin-bottom:12px">시청 채널</h2>' +
      '<div class="btn-row" style="gap:8px">' + b.channels.map(chChip).join('') + '</div>' +
      '<p style="font-size:13.5px;color:var(--ink-3);margin-top:12px">' +
      (CFG.channelLinksReady ? '채널을 누르면 해당 플랫폼으로 이동합니다.' : '채널 계정이 확정되면 링크가 열립니다. 방송 시작 30분 전부터 이동할 수 있습니다.') +
      '</p></div>' +
      '<div class="btn-row mt-32"><a class="btn btn--primary" href="support.html?type=broadcast">방송 알림 신청</a>' +
      '<a class="btn btn--line" href="schedule.html">전체 편성표</a></div>' +
      '</div></div>' +

      '<div class="grid g-2 mt-56" style="gap:32px">' +
      '<div><h2 class="sec__title" style="font-size:22px">편성 상품</h2>' +
      '<ul class="track__list mt-16">' + b.lineup.map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('') + '</ul>' +
      '<div class="note mt-24"><svg class="note__ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v4h1"/></svg>' +
      '<div>가격·재고·쿠폰은 방송이 열리는 채널에서 공개됩니다. 승인되지 않은 가격을 미리 표시하지 않는 것이 <b>오렌지 라이브 허브의 원칙</b>입니다.</div></div>' +
      '</div>' +
      '<div><h2 class="sec__title" style="font-size:22px">방송 정보</h2>' +
      '<div class="tbl mt-16"><table><tbody>' +
      '<tr><th style="width:34%">방송 번호</th><td class="mono">' + esc(b.id) + '</td></tr>' +
      '<tr><th>스튜디오</th><td>' + esc(b.studio) + '</td></tr>' +
      '<tr><th>진행</th><td>' + esc(b.host) + ' (' + esc(b.hostRole) + ')</td></tr>' +
      '<tr><th>참여 셀러</th><td>' + esc(b.seller) + '</td></tr>' +
      '<tr><th>데이터 기준</th><td class="mono">' + esc(CFG.asOf) + '</td></tr>' +
      '</tbody></table></div>' +
      (b.note ? '<div class="note note--orange mt-16"><svg class="note__ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 3l9 16H3z"/><path d="M12 9v4M12 16h.01"/></svg><div>' + esc(b.note) + '</div></div>' : '') +
      '</div></div>';
  }

  /* ---------- 상품·기획전 ---------- */
  function initCollections() {
    var box = $('#collectionList');
    if (!box) return;
    box.innerHTML = (D.collections || []).map(function (c) {
      return '<article class="card card--link">' +
        '<div class="card__media"><img src="assets/img/' + esc(c.thumb) + '" alt="' + esc(c.name) + ' 기획전 이미지" loading="lazy" width="1000" height="563">' +
        '<div class="card__badges"><span class="state state--plan">편성 예정</span></div></div>' +
        '<div class="card__body">' +
        '<span class="card__cat">' + esc(c.cat) + ' · ' + esc(c.period) + '</span>' +
        '<h3 class="card__title">' + esc(c.name) + '</h3>' +
        '<p class="card__desc">' + esc(c.desc) + '</p>' +
        '<div class="card__foot"><span class="tag">' + esc(c.benefit) + '</span>' +
        '<span class="card__host mono" style="margin-left:auto">' + c.count + '개 방송</span></div>' +
        '</div></article>';
    }).join('');
  }

  /* ---------- 다시보기 (오픈 후 공개) ---------- */
  function initReplay() {
    var box = $('#replayList');
    if (!box) return;
    var list = D.replays || [];
    if (!list.length) {
      box.innerHTML =
        '<div class="empty" style="padding-block:76px">' +
        '<img src="assets/img/mascot-alt.webp" alt="" width="82" height="82">' +
        '<h3>아직 다시볼 방송이 없습니다</h3>' +
        '<p>다시보기는 정식 오픈 이후 첫 방송이 끝나면 차례로 올라옵니다. 오픈 알림을 신청해 두면 첫 영상이 올라올 때 알려드립니다.</p>' +
        '<div class="btn-row" style="justify-content:center"><a class="btn btn--primary btn--sm" href="support.html?type=broadcast">오픈 알림 신청</a>' +
        '<a class="btn btn--line btn--sm" href="schedule.html">오픈 첫 주 편성 보기</a></div>' +
        '</div>';
    }
  }

  /* ---------- FAQ ---------- */
  function initFaq() {
    var box = $('#faqList');
    if (!box) return;
    var cats = ['전체'].concat(Object.keys((D.faqs || []).reduce(function (a, f) { a[f.cat] = 1; return a; }, {})));
    var bar = $('#faqTabs');
    if (bar) {
      bar.innerHTML = cats.map(function (c, i) {
        return '<button type="button" role="tab" data-c="' + esc(c) + '" aria-selected="' + (i === 0) + '">' + esc(c) + '</button>';
      }).join('');
    }

    function render(cat) {
      var list = (D.faqs || []).filter(function (f) { return cat === '전체' || f.cat === cat; });
      box.innerHTML = list.map(function (f, i) {
        return '<div class="acc__i">' +
          '<button type="button" class="acc__q" aria-expanded="false">' +
          '<span class="acc__k">Q' + String(i + 1).padStart(2, '0') + '</span>' +
          '<span>' + esc(f.q) + '</span><span class="acc__sign" aria-hidden="true"></span></button>' +
          '<div class="acc__a">' + f.a.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') + '</div>' +
          '</div>';
      }).join('');
      initAcc(box);
    }
    render('전체');

    if (bar) {
      bar.addEventListener('click', function (e) {
        var b = e.target.closest('button'); if (!b) return;
        $$('button', bar).forEach(function (o) { o.setAttribute('aria-selected', o === b ? 'true' : 'false'); });
        render(b.dataset.c);
      });
    }
  }

  /* ---------- 홈 FAQ 발췌 ---------- */
  function initFaqHome() {
    var box = $('#faqHome');
    if (!box) return;
    box.innerHTML = (D.faqs || []).slice(0, 4).map(function (f, i) {
      return '<div class="acc__i">' +
        '<button type="button" class="acc__q" aria-expanded="false">' +
        '<span class="acc__k">Q' + String(i + 1).padStart(2, '0') + '</span>' +
        '<span>' + esc(f.q) + '</span><span class="acc__sign" aria-hidden="true"></span></button>' +
        '<div class="acc__a">' + f.a.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') + '</div>' +
        '</div>';
    }).join('');
    initAcc(box);
  }

  /* ---------- 탭 ---------- */
  function initTabs() {
    $$('[data-tabs]').forEach(function (bar) {
      function select(b) {
        $$('button', bar).forEach(function (o) { o.setAttribute('aria-selected', o === b ? 'true' : 'false'); });
        $$('[data-panel]').forEach(function (p) {
          p.classList.toggle('hidden', p.dataset.panel !== b.dataset.tab);
        });
      }
      bar.addEventListener('click', function (e) {
        var b = e.target.closest('button'); if (b) select(b);
      });
      // seller.html#brand 처럼 해시로 바로 들어온 경우 해당 탭을 연다
      var h = (location.hash || '').replace('#', '');
      if (h) {
        var t = $$('button', bar).filter(function (o) { return o.dataset.tab === h; })[0];
        if (t) {
          select(t);
          setTimeout(function () {
            var el = document.getElementById(h);
            if (el) el.scrollIntoView({ block: 'start', behavior: 'smooth' });
          }, 60);
        }
      }
    });
  }

  /* ---------- 폼 검증 + 제출 ---------- */
  function initForms() {
    $$('form[data-validate]').forEach(function (f) {
      f.setAttribute('novalidate', '');
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        var bad = null;

        $$('.field', f).forEach(function (fd) { fd.classList.remove('is-err'); });

        $$('[required]', f).forEach(function (el) {
          var fd = el.closest('.field') || el.closest('.chk');
          var ok = el.type === 'checkbox' ? el.checked : String(el.value).trim() !== '';
          if (ok && el.type === 'email') ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(el.value);
          if (ok && el.dataset.tel) ok = /^[0-9\-+() ]{9,20}$/.test(el.value);
          if (!ok) {
            if (fd && fd.classList.contains('field')) fd.classList.add('is-err');
            else if (fd) { var er = fd.parentNode.querySelector('.err'); if (er) er.style.display = 'flex'; }
            if (!bad) bad = el;
          }
        });

        if (bad) {
          bad.focus();
          bad.scrollIntoView({ block: 'center', behavior: 'smooth' });
          var live = $('#formLive', f.closest('section') || document);
          if (live) live.textContent = '입력하지 않은 필수 항목이 있습니다. 표시된 항목을 확인해 주세요.';
          return;
        }

        // 실제 연동 시: fetch(CFG.apiBase + '/v1/public/leads', {method:'POST', body: new FormData(f)})
        var no = f.dataset.prefix + '-' + new Date().toISOString().slice(2, 10).replace(/-/g, '') + '-' +
          String(Math.floor(Math.random() * 9000) + 1000);
        var done = $('#' + f.dataset.done);
        if (done) {
          var slot = $('[data-no]', done);
          if (slot) slot.textContent = '접수번호 ' + no;
          f.classList.add('hidden');
          done.classList.add('is-on');
          done.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
      });
    });
  }

  /* ---------- 문의 유형 프리셋 (?type=) ---------- */
  function initTypePreset() {
    var sel = $('#inqType');
    if (!sel) return;
    var t = new URLSearchParams(location.search).get('type');
    if (t && $$('option', sel).some(function (o) { return o.value === t; })) sel.value = t;
  }

  /* ---------- 스튜디오 요금표 ---------- */
  function initStudio() {
    var box = $('#studioRooms');
    if (box) {
      box.innerHTML = (D.studio.rooms || []).map(function (r, i) {
        return '<article class="track">' +
          '<div class="track__media"><img src="assets/img/' + esc(r.thumb) + '" alt="' + esc(r.name) + ' 이미지" loading="lazy" width="1000" height="625">' +
          '<span class="track__no">' + String(i + 1).padStart(2, '0') + '</span></div>' +
          '<div class="track__body">' +
          '<span class="mono" style="font-size:12px;font-weight:700;letter-spacing:.12em;color:var(--o-600)">' + esc(r.code) + '</span>' +
          '<h3 class="track__title">' + esc(r.name) + '</h3>' +
          '<p class="track__desc">' + esc(r.fit) + '</p>' +
          '<ul class="track__list">' +
          '<li>면적 ' + esc(r.size) + '</li><li>' + esc(r.cam) + '</li><li>' + esc(r.light) + '</li>' +
          '<li>' + esc(r.audio) + '</li><li>' + esc(r.set) + '</li><li>지원 인력 ' + esc(r.crew) + '</li>' +
          '</ul></div></article>';
      }).join('');
    }

    var fee = $('#studioFees');
    if (fee) {
      fee.innerHTML = '<div class="tbl__scroll"><table>' +
        '<thead><tr><th>공간</th><th>시간당</th><th>반일 패키지</th><th>종일 패키지</th></tr></thead><tbody>' +
        (D.studio.fees || []).map(function (r) {
          return '<tr><td><b>' + esc(r.room) + '</b></td><td class="num">' + esc(r.hour) + '</td>' +
            '<td class="num">' + esc(r.half) + '</td><td class="num">' + esc(r.day) + '</td></tr>';
        }).join('') + '</tbody></table></div>';
    }

    var opt = $('#studioOptions');
    if (opt) {
      opt.innerHTML = '<div class="tbl__scroll"><table>' +
        '<thead><tr><th>제작 옵션</th><th>내용</th><th>안내 요금</th></tr></thead><tbody>' +
        (D.studio.options || []).map(function (r) {
          return '<tr><td><b>' + esc(r.name) + '</b></td><td>' + esc(r.desc) + '</td><td class="num">' + esc(r.price) + '</td></tr>';
        }).join('') + '</tbody></table></div>';
    }
  }

  /* ---------- 물류 5단계 ---------- */
  function initFulfillment() {
    var box = $('#ffSteps');
    if (!box) return;
    box.innerHTML = (D.fulfillment || []).map(function (s) {
      return '<div class="step"><div class="step__no">' + esc(s.no) + '</div>' +
        '<h3>' + esc(s.name) + '</h3><p>' + esc(s.desc) + '</p></div>';
    }).join('');
  }

  /* ---------- 오픈 로드맵 ---------- */
  function initRoadmap() {
    var box = $('#roadmap');
    if (!box) return;
    box.innerHTML = (D.roadmap || []).map(function (r) {
      var cls = r.state === 'done' ? 'tl__i--done' : (r.state === 'now' ? 'tl__i--now' : '');
      return '<div class="tl__i ' + cls + '"><span class="tl__dot" aria-hidden="true"></span>' +
        '<div class="tl__when">' + esc(r.when) + (r.state === 'now' ? ' · 진행 중' : (r.state === 'done' ? ' · 완료' : '')) + '</div>' +
        '<h3 class="tl__t">' + esc(r.title) + '</h3><p class="tl__d">' + esc(r.desc) + '</p></div>';
    }).join('');
  }

  /* ---------- 셀러 혜택 ---------- */
  function initSellerBenefits() {
    var box = $('#sellerBenefits');
    if (!box) return;
    box.innerHTML = (D.sellerBenefits || []).map(function (b, i) {
      return '<div class="vcard"><div class="vcard__ico mono" style="font-weight:700;font-size:15px">' + String(i + 1).padStart(2, '0') + '</div>' +
        '<h3>' + esc(b.title) + '</h3><p>' + esc(b.desc) + '</p></div>';
    }).join('');
  }

  /* ---------- 외부 연동 상태 안내 ---------- */
  function initChannelNotice() {
    if (CFG.channelLinksReady) return;
    $$('[data-channel-notice]').forEach(function (el) { el.classList.remove('hidden'); });
  }

  /* ---------- 부팅 ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    initNav(); initDday(); initReveal(); initAcc();
    initRail(); initHomeSchedule(); initSchedule(); initBroadcast();
    initCollections(); initReplay(); initFaq(); initFaqHome();
    initTabs(); initForms(); initTypePreset(); initStudio();
    initFulfillment(); initRoadmap(); initSellerBenefits(); initChannelNotice();
    var y = document.getElementById('year');
    if (y) y.textContent = new Date().getFullYear();
  });
})();
