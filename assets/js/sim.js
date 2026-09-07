/* ============================================================
   오렌지 라이브커머스 — 셀러 매출 시뮬레이터
   ------------------------------------------------------------
   ※ 이 계산은 "추정"이며 실적을 보증하지 않습니다.
     화면에도 같은 문구를 표시하고, 계수 근거를 모두 공개합니다.

   근거
     · 라이브 쇼핑 구매전환율 업계 평균 5~10% (15% 이상은 상위권)
       → 본 모델은 보수적으로 4 / 7 / 11% 3개 시나리오 사용
     · 채널 도달은 신규 셀러 초기 방송 기준으로 낮게 잡았습니다.
       인지도가 쌓인 셀러는 이 값을 크게 웃돌 수 있습니다.
     · 소상공인 실측 예시: 시청자 50명 × 전환 10% × 객단가 3만원
       = 회당 15만원, 주 2회 시 월 120만원 수준
     · 제작비는 data.js 의 studio.fees / studio.options 실제 요금 기준
   ============================================================ */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- 모델 계수 ---------- */
  var MODEL = {
    // 채널별 1회 평균 '고유 시청자' 추정치 — 신규 셀러 초기 방송 기준.
    // 업계 실측에서 소상공인 라이브는 회당 50명 안팎에서 출발하는 경우가 많아
    // 그 수준을 기준선으로 잡고 채널 특성만큼만 차등을 뒀습니다.
    reach: { naver: 90, tiktok: 70, youtube: 55, kakao: 40 },

    // 카테고리 계수 — 식품·뷰티가 라이브 전환에 유리하다는 업계 통설 반영
    cat: {
      '신선식품': 1.25, '뷰티': 1.15, '생활·주방': 1.10,
      '건강식품': 1.00, '패션·잡화': 0.95, '가전·디지털': 0.80
    },

    // 진행 방식 계수
    mode: {
      self: { k: 1.00, cost: 90000, label: '셀러가 직접 진행', desc: 'BOOTH C 2시간' },
      together: { k: 1.15, cost: 620000, label: '호스트와 함께', desc: 'STUDIO B 2시간 + 호스트' },
      host: { k: 1.30, cost: 720000, label: '전문 호스트 전담', desc: 'STUDIO A 2시간 + 호스트' }
    },

    hubBoost: 1.12,        // 편성·알림 구독 유입 보정
    // 채널을 늘려도 시청자가 그대로 더해지지는 않습니다(중복 시청·관심 분산).
    // 도달이 큰 채널부터 정렬해 0.65씩 체감시킵니다.
    chDecay: 0.65,
    // 같은 시간대에 꾸준히 하면 단골이 쌓입니다. 월 1회 대비 최대 +35%.
    freqStep: 0.02, freqCap: 0.35,
    cvr: { low: 0.04, base: 0.07, high: 0.11 },
    feeRate: 0.12,         // 채널 수수료 + 플랫폼 수수료 통합 예시
    logisticsPerOrder: 3000
  };

  var CH_NAME = { naver: '네이버', youtube: '유튜브', kakao: '카카오', tiktok: '틱톡' };

  /* ---------- 상태 ---------- */
  var S = {
    cat: '신선식품',
    price: 30000,
    perMonth: 8,
    channels: ['naver', 'youtube'],
    mode: 'together'
  };

  function won(n) {
    return Math.round(n).toLocaleString('ko-KR');
  }

  function reachSum() {
    return S.channels
      .map(function (c) { return MODEL.reach[c] || 0; })
      .sort(function (a, b) { return b - a; })
      .reduce(function (a, v, i) { return a + v * Math.pow(MODEL.chDecay, i); }, 0);
  }

  function freqFactor() {
    return 1 + Math.min(MODEL.freqCap, (S.perMonth - 1) * MODEL.freqStep);
  }

  function calc(cvr) {
    var m = MODEL.mode[S.mode];
    var viewers = reachSum() * (MODEL.cat[S.cat] || 1) * m.k * MODEL.hubBoost * freqFactor();
    var orders = viewers * cvr;
    var gmv = orders * S.price;
    var fee = gmv * MODEL.feeRate;
    var prod = m.cost;
    var logi = orders * MODEL.logisticsPerOrder;
    var net = gmv - fee - prod - logi;
    return {
      viewers: viewers, orders: orders, gmv: gmv,
      fee: fee, prod: prod, logi: logi, net: net,
      mGmv: gmv * S.perMonth, mNet: net * S.perMonth
    };
  }

  // 손익분기 시청자 수 (해당 전환율에서 회당 순수익 0이 되는 지점)
  function breakEven(cvr) {
    var m = MODEL.mode[S.mode];
    var perViewer = cvr * (S.price * (1 - MODEL.feeRate) - MODEL.logisticsPerOrder);
    if (perViewer <= 0) return null;
    return m.cost / perViewer;
  }

  /* ---------- 렌더 ---------- */
  function render() {
    var lo = calc(MODEL.cvr.low), bs = calc(MODEL.cvr.base), hi = calc(MODEL.cvr.high);
    var be = breakEven(MODEL.cvr.base);
    var m = MODEL.mode[S.mode];

    // 요약 숫자
    $('#simViewers').textContent = won(bs.viewers);
    $('#simOrders').textContent = won(bs.orders);
    $('#simGmv').textContent = won(bs.gmv);
    $('#simNet').textContent = won(bs.net);
    $('#simMonthGmv').textContent = won(bs.mGmv);
    $('#simMonthNet').textContent = won(bs.mNet);

    var netEl = $('#simNet').closest('.simfig');
    netEl.classList.toggle('simfig--neg', bs.net < 0);
    $('#simMonthNet').closest('.simsum__row').classList.toggle('is-neg', bs.mNet < 0);

    // 시나리오 막대
    var max = Math.max(Math.abs(lo.mNet), Math.abs(bs.mNet), Math.abs(hi.mNet), 1);
    var rows = [
      { k: '보수', cvr: MODEL.cvr.low, d: lo },
      { k: '기준', cvr: MODEL.cvr.base, d: bs, on: true },
      { k: '상향', cvr: MODEL.cvr.high, d: hi }
    ];
    $('#simScenarios').innerHTML = rows.map(function (r) {
      var w = Math.max(4, Math.abs(r.d.mNet) / max * 100);
      return '<div class="scen' + (r.on ? ' scen--on' : '') + (r.d.mNet < 0 ? ' scen--neg' : '') + '">' +
        '<div class="scen__k">' + r.k + '<span class="mono">전환 ' + (r.cvr * 100).toFixed(0) + '%</span></div>' +
        '<div class="scen__bar"><i style="width:' + w + '%"></i></div>' +
        '<div class="scen__v mono">' + (r.d.mNet < 0 ? '−' : '') + won(Math.abs(r.d.mNet)) + '원</div>' +
        '</div>';
    }).join('');

    // 회당 손익 분해
    $('#simBreak').innerHTML =
      '<tr><td>라이브 매출 (GMV)</td><td class="num">' + won(bs.gmv) + '원</td></tr>' +
      '<tr><td>채널·플랫폼 수수료 <span class="mono">' + (MODEL.feeRate * 100) + '%</span></td><td class="num neg">−' + won(bs.fee) + '원</td></tr>' +
      '<tr><td>제작비 <span class="mono">' + m.desc + '</span></td><td class="num neg">−' + won(bs.prod) + '원</td></tr>' +
      '<tr><td>물류비 <span class="mono">주문당 3,000원</span></td><td class="num neg">−' + won(bs.logi) + '원</td></tr>' +
      '<tr class="tot"><td><b>회당 순수익</b></td><td class="num"><b>' + (bs.net < 0 ? '−' : '') + won(Math.abs(bs.net)) + '원</b></td></tr>';

    // 손익분기 안내
    var beEl = $('#simBE');
    if (!be) {
      beEl.className = 'note note--warn';
      beEl.innerHTML = '<div>객단가가 너무 낮아 이 조건에서는 수수료와 물류비만으로 적자가 납니다. 객단가를 올리거나 묶음 구성을 검토해 보세요.</div>';
    } else if (bs.net < 0) {
      beEl.className = 'note note--warn';
      beEl.innerHTML = '<div><b>이 조건에서는 회당 시청자 ' + won(be) + '명부터 흑자로 돌아섭니다.</b> ' +
        '지금 추정 시청자는 ' + won(bs.viewers) + '명입니다. 송출 채널을 늘리거나, 객단가가 높은 상품을 함께 편성하거나, ' +
        '진행 방식을 바꿔 제작비를 낮추는 방법을 검토해 보세요.</div>';
    } else {
      beEl.className = 'note note--orange';
      beEl.innerHTML = '<div><b>이 조건의 손익분기는 회당 시청자 ' + won(be) + '명입니다.</b> ' +
        '추정 시청자 ' + won(bs.viewers) + '명은 이 기준을 넘습니다. 다만 초기 몇 회는 추정치를 밑돌 수 있으니, ' +
        '첫 달은 보수 시나리오를 기준으로 재고와 예산을 잡으시길 권합니다.</div>';
    }
  }

  /* ---------- 컨트롤 ---------- */
  function bind() {
    // 카테고리
    $$('#simCat .opt input').forEach(function (el) {
      el.addEventListener('change', function () { S.cat = el.value; render(); });
    });
    // 진행 방식
    $$('#simMode .opt input').forEach(function (el) {
      el.addEventListener('change', function () { S.mode = el.value; render(); });
    });
    // 채널
    $$('#simCh input').forEach(function (el) {
      el.addEventListener('change', function () {
        S.channels = $$('#simCh input:checked').map(function (o) { return o.value; });
        if (!S.channels.length) { el.checked = true; S.channels = [el.value]; }
        $('#simChCount').textContent = S.channels.length;
        render();
      });
    });
    // 객단가
    var p = $('#simPrice');
    p.addEventListener('input', function () {
      S.price = +p.value;
      $('#simPriceOut').textContent = won(S.price) + '원';
      render();
    });
    // 방송 횟수
    var f = $('#simFreq');
    f.addEventListener('input', function () {
      S.perMonth = +f.value;
      $('#simFreqOut').textContent = S.perMonth + '회';
      render();
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (!$('#simulator')) return;
    $('#simPriceOut').textContent = won(S.price) + '원';
    $('#simFreqOut').textContent = S.perMonth + '회';
    $('#simChCount').textContent = S.channels.length;
    bind();
    render();
  });
})();
