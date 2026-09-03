import * as D from './data.js?v=1788422836';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---------- 画面共通 ---------- */
const REGIONS = {
  すべて: null,
  関東: ['13', '14', '12'],
  東海: ['23'],
  関西: ['27', '28', '26'],
};

const ui = {
  role: 'adv',
  q: {
    region: 'すべて',
    types: ['SAMPLING'],
    start: D.ymd(D.addDays(D.TODAY, 21)),
    days: 14,
    qty: 1,
    budget: 300000,
    tags: [],
    category: 'スキンケア',
    fixture: false,
  },
  calMonth: null,
  sel: { start: null, end: null },
  facSlot: null,
  facMonth: null,
};

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('on');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('on'), 2600);
}

const photoStyle = (f, extra = '') =>
  `background:linear-gradient(150deg,hsl(${f.hue} 46% 72%),hsl(${(f.hue + 34) % 360} 52% 58%));${extra}`;

const go = (h) => { location.hash = h; };

function sweepHolds() {
  let ch = false;
  for (const b of D.state.bookings) {
    if (b.status === 'hold' && b.holdExpiresAt && Date.now() > b.holdExpiresAt) {
      b.status = 'expired'; ch = true;
    }
  }
  if (ch) D.save();
}

/* ================= ヘッダー ================= */
function header() {
  const r = ui.role;
  const nav = r === 'adv'
    ? [['#/', 'さがす'], ['#/bookings', '予約管理']]
    : r === 'fac'
      ? [['#/f', '今日のタスク'], ['#/f/calendar', 'スケジュール']]
      : [['#/admin', 'ダッシュボード']];
  const cur = location.hash || '#/';
  return `
  <header class="hd">
    <div class="hd-in">
      <a class="logo" href="#/">
        <span class="logo-mark">♨</span>
        <span>マッパ<small>MAPPA</small></span>
      </a>
      <nav class="nav">
        ${nav.map(([h, l]) => `<a href="${h}" class="${cur === h ? 'on' : ''}">${l}</a>`).join('')}
      </nav>
      <div class="hd-right">
        <div class="roleswitch" role="tablist" aria-label="表示する立場">
          <button data-role="adv" class="${r === 'adv' ? 'on' : ''}">広告主</button>
          <button data-role="fac" class="${r === 'fac' ? 'on' : ''}">施設</button>
          <button data-role="ops" class="${r === 'ops' ? 'on' : ''}">運営</button>
        </div>
      </div>
    </div>
  </header>`;
}

function footer() {
  return `
  <footer class="ft"><div class="in">
    <span>♨ マッパ — 温浴施設プロモーション枠の予約プラットフォーム</span>
    <span style="margin-left:auto">デモ環境（データはこのブラウザにのみ保存されます）</span>
    <a href="#" id="reset-demo">デモデータを初期化</a>
  </div></footer>`;
}

/* ================= トップ ================= */
function viewHome() {
  const popular = [...D.FACILITIES].sort((a, b) => b.avgConsumption - a.avgConsumption).slice(0, 3);
  const totalSlots = D.ALL_SLOTS.length;
  return `
  <section class="hero">
    <div class="hero-in">
      <svg class="steam" style="right:4%;top:-10px" width="150" height="180" viewBox="0 0 150 180" fill="none" aria-hidden="true">
        <path d="M40 170c0-30 18-34 18-58S40 84 40 60s18-30 18-46" stroke="#35A0B4" stroke-width="7" stroke-linecap="round" opacity=".28"/>
        <path d="M78 170c0-26 18-30 18-52s-18-26-18-46 14-26 14-38" stroke="#EE8153" stroke-width="7" stroke-linecap="round" opacity=".26"/>
        <path d="M114 170c0-22 14-26 14-44s-14-22-14-38" stroke="#35A0B4" stroke-width="7" stroke-linecap="round" opacity=".2"/>
      </svg>
      <span class="pill pill-accent" style="margin-bottom:16px">全国の人気温浴施設と直接つながる</span>
      <h1>サンプリング枠の空きが、<br><span class="hl">その場でわかって、その場で押さえられる。</span></h1>
      <p class="lead">電話とメールで2〜3営業日かかっていた空き確認を、ゼロにしました。客層データと過去の消化実績を見ながら、いま空いている枠をオンラインで確保できます。</p>

      <div class="searchbox">
        <div class="grid">
          <div>
            <label class="f" for="q-region">エリア</label>
            <select class="inp" id="q-region">
              ${Object.keys(REGIONS).map((k) => `<option ${ui.q.region === k ? 'selected' : ''}>${k}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="f" for="q-start">開始したい日</label>
            <input class="inp" type="date" id="q-start" value="${ui.q.start}" min="${D.ymd(D.addDays(D.TODAY, 1))}">
          </div>
          <div>
            <label class="f" for="q-days">期間</label>
            <select class="inp" id="q-days">
              ${[14, 21, 30, 60].map((d) => `<option value="${d}" ${ui.q.days === d ? 'selected' : ''}>${d}日間</option>`).join('')}
            </select>
          </div>
          <div><button class="btn btn-lg" id="q-go" style="width:auto;padding:13px 26px">空き枠をさがす</button></div>
        </div>
      </div>

      <div class="statrow" style="margin-top:26px">
        <div class="stat"><b class="num">${D.FACILITIES.length}</b><span>提携施設</span></div>
        <div class="stat"><b class="num">${totalSlots}</b><span>販売中の枠</span></div>
        <div class="stat"><b class="num">180</b><span>日先まで予約可能</span></div>
        <div class="stat"><b class="num">当日</b><span>申込から枠確定まで</span></div>
      </div>
    </div>
  </section>

  <div class="wrap">
    <div class="sect">
      <h2>3ステップで枠が決まります</h2>
      <div class="howto">
        <div class="card"><div class="n">1</div><h3>さがす</h3><p>エリア・期間・客層で絞り込み。指定期間に<b>実際に空いている枠だけ</b>が出ます。</p></div>
        <div class="card"><div class="n">2</div><h3>たしかめる</h3><p>客層データと過去の消化スピードを見て、自社の商材に合うかを判断できます。</p></div>
        <div class="card"><div class="n">3</div><h3>おさえる</h3><p>その場でカード決済。決済と同時に枠が確定し、他社に取られる心配がありません。</p></div>
      </div>
    </div>

    <div class="sect">
      <h2>消化スピードの速い施設</h2>
      ${popular.map(facilityCard).join('')}
      <div style="text-align:center;margin-top:10px">
        <a class="btn btn-ghost" href="#/search">すべての施設を見る</a>
      </div>
    </div>
  </div>`;
}

/* ================= 検索 ================= */
function matchingSlots(f) {
  const q = ui.q;
  const end = D.ymd(D.addDays(D.parseYmd(q.start), q.days - 1));
  return f.slots
    .filter((s) => q.types.includes(s.type))
    .map((s) => {
      const slot = D.slotById(s.id);
      const chk = D.checkRange(s.id, q.start, end, q.qty, q.category);
      const qt = D.quote(s.id, q.start, end, q.qty, false);
      return { slot, ok: chk.ok, issues: chk.issues, quote: qt };
    })
    .filter((x) => x.quote.net <= q.budget || !x.ok);
}

function heatStrip(slotId) {
  const cells = [];
  for (let w = 0; w < 13; w++) {
    let open = 0, blocked = 0, total = 0;
    for (let d = 0; d < 7; d++) {
      const ds = D.ymd(D.addDays(D.TODAY, w * 7 + d + 7));
      const i = D.dayInfo(slotId, ds);
      total++;
      if (i.capacity === 0) blocked++;
      else if (i.available > 0) open++;
    }
    const s = blocked > total / 2 ? 'blocked' : open >= 5 ? 'open' : open >= 2 ? 'low' : 'full';
    cells.push(`<i data-s="${s}" title="${D.fmtDate(D.ymd(D.addDays(D.TODAY, w * 7 + 7)))}の週"></i>`);
  }
  return `<div class="heat">${cells.join('')}</div>`;
}

function facilityCard(f) {
  const matches = matchingSlots(f);
  const okOnes = matches.filter((m) => m.ok);
  const best = okOnes.sort((a, b) => a.quote.net - b.quote.net)[0] || matches[0];
  if (!best) return '';
  const avail = okOnes.length > 0;
  return `
  <article class="fcard ${avail ? '' : 'dim'}" data-fid="${f.id}" role="link" tabindex="0">
    <div class="fthumb" style="${photoStyle(f)}"></div>
    <div class="fbody">
      <div class="spread" style="align-items:flex-start">
        <div style="min-width:0">
          <h3>${esc(f.name)}</h3>
          <div class="fmeta">${f.prefName}${f.city}・${f.station} 徒歩${f.walkMin}分</div>
        </div>
        ${f.verified ? '<span class="pill pill-ok"><span class="dot"></span>運営検証済</span>' : '<span class="pill">施設申告</span>'}
      </div>
      <div class="fstats">
        <span class="pill">月間 ${f.monthlyVisitors.toLocaleString()}人</span>
        <span class="pill">女性 ${f.femaleRatio}%</span>
        <span class="pill pill-primary">消化 ${f.avgConsumption}個/日</span>
        <span class="pill">実施 ${f.campaignCount}件</span>
      </div>
      <div style="margin:9px 0 10px">${heatStrip(best.slot.id)}</div>
      <div class="spread">
        <div>
          <div class="fprice">${D.yen(best.quote.net)} <small>／${ui.q.days}日・税抜</small></div>
          <div class="tiny ${avail ? 'muted' : ''}" style="${avail ? '' : 'color:var(--warn)'}">
            ${avail
              ? `${esc(best.slot.name)}・残${D.dayInfo(best.slot.id, ui.q.start).available}枠`
              : (best.issues[0]?.msg || 'この期間は空きがありません')}
          </div>
        </div>
        <button class="btn btn-sm ${avail ? '' : 'btn-ghost'}">詳しく見る</button>
      </div>
    </div>
  </article>`;
}

function viewSearch() {
  const q = ui.q;
  const prefs = REGIONS[q.region];
  let list = D.FACILITIES.filter((f) => !prefs || prefs.includes(f.pref));
  if (q.tags.length) list = list.filter((f) => q.tags.some((t) => f.audienceTags.includes(t)));
  const cards = list.map((f) => ({ f, m: matchingSlots(f) })).filter((x) => x.m.length);
  const withAvail = cards.filter((x) => x.m.some((m) => m.ok));
  const sorted = [...cards].sort((a, b) => {
    const aa = a.m.some((m) => m.ok) ? 0 : 1;
    const bb = b.m.some((m) => m.ok) ? 0 : 1;
    return aa - bb || b.f.avgConsumption - a.f.avgConsumption;
  });

  return `
  <div class="wrap">
    <div class="page-head">
      <h1>空き枠をさがす</h1>
      <p>${D.fmtDateLong(q.start)} から ${q.days}日間・${q.qty}枠で、いま押さえられる枠を表示しています。</p>
    </div>
    <div class="searchlayout">
      <aside class="filters">
        <div class="card card-pad-sm">
          <div class="fgroup">
            <h4>期間</h4>
            <label class="f" for="s-start">開始日</label>
            <input class="inp" type="date" id="s-start" value="${q.start}" min="${D.ymd(D.addDays(D.TODAY, 1))}">
            <label class="f" style="margin-top:9px" for="s-days">日数</label>
            <select class="inp" id="s-days">${[14, 21, 30, 45, 60].map((d) => `<option value="${d}" ${q.days === d ? 'selected' : ''}>${d}日間</option>`).join('')}</select>
          </div>
          <div class="fgroup">
            <h4>エリア</h4>
            <div class="chips">${Object.keys(REGIONS).map((k) => `<button class="chip ${q.region === k ? 'on' : ''}" data-region="${k}">${k}</button>`).join('')}</div>
          </div>
          <div class="fgroup">
            <h4>枠タイプ</h4>
            <div class="chips">${Object.values(D.SLOT_TYPES).map((t) => `<button class="chip ${q.types.includes(t.code) ? 'on' : ''}" data-type="${t.code}">${t.short}</button>`).join('')}</div>
          </div>
          <div class="fgroup">
            <h4>商材カテゴリ</h4>
            <select class="inp" id="s-cat">${D.CATEGORIES.map((c) => `<option ${q.category === c ? 'selected' : ''}>${c}</option>`).join('')}</select>
            <p class="tiny muted" style="margin:7px 0 0">同じカテゴリが設置中の施設を自動で除外します。</p>
          </div>
          <div class="fgroup">
            <h4>予算の上限（税抜）</h4>
            <input type="range" id="s-budget" min="50000" max="600000" step="10000" value="${q.budget}" style="width:100%">
            <div class="tiny muted num">〜 ${D.yen(q.budget)}</div>
          </div>
          <div class="fgroup">
            <h4>客層</h4>
            <div class="chips">${D.AUDIENCE_TAGS.map((t) => `<button class="chip ${q.tags.includes(t) ? 'on' : ''}" data-tag="${t}">${t}</button>`).join('')}</div>
          </div>
        </div>
      </aside>

      <div>
        <div class="spread" style="margin-bottom:14px">
          <div class="tiny muted">該当 <b class="num">${cards.length}</b>施設 ／ 空きあり <b class="num" style="color:var(--primary)">${withAvail.length}</b>施設</div>
          <div class="heat-legend">
            <span><i style="background:#9FD6C6"></i>空きあり</span>
            <span><i style="background:#F6CE9C"></i>残りわずか</span>
            <span><i style="background:#E2D6C6"></i>満枠</span>
            <span><i style="background:repeating-linear-gradient(45deg,#DCD2C6 0 3px,#EDE6DC 3px 6px)"></i>受入不可</span>
          </div>
        </div>
        ${sorted.length
          ? sorted.map((x) => facilityCard(x.f)).join('')
          : `<div class="card empty"><div class="em">♨</div><h3>条件に合う施設が見つかりませんでした</h3>
             <p>期間を少し動かすか、予算の上限を上げると見つかることがあります。</p>
             <button class="btn btn-ghost" id="relax">条件をゆるめて再検索</button></div>`}
        ${withAvail.length === 0 && sorted.length
          ? `<div class="note note-warn" style="margin-top:12px"><span class="ico">💡</span><div>指定の期間はどの施設も満枠でした。<b>開始日を1週間ずらす</b>と空きが見つかることがあります。<button class="btn btn-sm btn-ghost" id="shift7" style="margin-left:8px">1週間ずらす</button></div></div>`
          : ''}
      </div>
    </div>
  </div>`;
}

/* ================= 施設詳細 ================= */
function calendarHTML(slotId, monthDate, sel) {
  const slot = D.slotById(slotId);
  const first = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const lastDay = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
  const lead = first.getDay();
  const cells = [];
  for (let i = 0; i < lead; i++) cells.push('<div class="cell empty"></div>');
  for (let d = 1; d <= lastDay; d++) {
    const ds = D.ymd(new Date(monthDate.getFullYear(), monthDate.getMonth(), d));
    const i = D.dayInfo(slotId, ds);
    const inRange = sel.start && sel.end && ds >= sel.start && ds <= sel.end;
    const isSel = ds === sel.start || ds === sel.end;
    const label = i.status === 'blocked' ? '受入不可'
      : i.status === 'full' ? '満枠'
      : i.status === 'lead' ? '—'
      : i.status === 'out' ? '—'
      : `残${i.available}`;
    cells.push(`<button class="cell ${isSel ? 'sel' : ''} ${inRange && !isSel ? 'inrange' : ''} ${i.mine ? 'mine' : ''}"
      data-s="${i.status}" data-date="${ds}" ${i.selectable ? '' : 'disabled'}
      aria-label="${D.fmtDateLong(ds)} ${label}">
      <span class="d">${d}</span><span class="s">${label}</span></button>`);
  }
  const prevOk = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1) > D.TODAY;
  const maxD = D.addDays(D.TODAY, D.HORIZON_DAYS);
  const nextOk = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1) <= maxD;
  return `
  <div class="cal">
    <div class="cal-hd">
      <b>${monthDate.getFullYear()}年${monthDate.getMonth() + 1}月</b>
      <div class="cal-nav">
        <button id="cal-prev" ${prevOk ? '' : 'disabled'} aria-label="前の月">‹</button>
        <button id="cal-next" ${nextOk ? '' : 'disabled'} aria-label="次の月">›</button>
      </div>
    </div>
    <div class="cal-grid">
      ${D.WD.map((w, i) => `<div class="cal-wd ${i === 0 ? 'sun' : i === 6 ? 'sat' : ''}">${w}</div>`).join('')}
      ${cells.join('')}
    </div>
    <div class="cal-legend">
      <span><i style="background:#EAF6F1"></i>空きあり</span>
      <span><i style="background:#FDF0DF"></i>残り1枠</span>
      <span><i style="background:var(--ground-2)"></i>満枠</span>
      <span><i style="background:repeating-linear-gradient(45deg,#EAE1D6 0 4px,#F3ECE3 4px 8px)"></i>受入不可</span>
      <span><i style="background:var(--surface-2);border-color:var(--line-2)"></i>選べません</span>
    </div>
    <p class="tiny muted" style="margin-top:9px">最短開始日は <b>${D.fmtDateLong(D.earliestStart(slot))}</b>（配送と設置準備のため）。開始日 → 終了日の順にタップすると期間を選べます。</p>
  </div>`;
}

function viewFacility(id) {
  const f = D.facilityById(id);
  if (!f) return notFound();
  if (!ui.facSlot || D.slotById(ui.facSlot)?.facilityId !== id) ui.facSlot = f.slots[0].id;
  const slot = D.slotById(ui.facSlot);
  if (!ui.calMonth) ui.calMonth = new Date(D.parseYmd(ui.q.start).getFullYear(), D.parseYmd(ui.q.start).getMonth(), 1);
  if (!ui.sel.start) {
    ui.sel = { start: ui.q.start, end: D.ymd(D.addDays(D.parseYmd(ui.q.start), ui.q.days - 1)) };
  }
  const sel = ui.sel;
  const chk = sel.start && sel.end ? D.checkRange(slot.id, sel.start, sel.end, ui.q.qty, ui.q.category) : null;
  const qt = sel.start && sel.end ? D.quote(slot.id, sel.start, sel.end, ui.q.qty, ui.q.fixture) : null;
  const maxAge = Math.max(...Object.values(f.ageMix));

  return `
  <div class="wrap">
    <div class="crumb"><a href="#/search">← 検索結果にもどる</a></div>
    <div class="dlayout">
      <div>
        <div class="hero-photo" style="${photoStyle(f)}">
          <div class="photo-tabs">
            <span class="pill">外観</span><span class="pill">男性脱衣所</span><span class="pill">女性脱衣所</span><span class="pill">設置イメージ</span>
          </div>
        </div>
        <div class="spread" style="align-items:flex-start;margin-bottom:6px">
          <div>
            <h1 style="font-size:26px">${esc(f.name)}</h1>
            <p class="muted tiny" style="margin:5px 0 0">${f.prefName}${f.city}・${f.station} 徒歩${f.walkMin}分 ／ 営業 ${f.hours}${f.holiday != null ? ` ／ 毎週${D.WD[f.holiday]}曜定休` : ' ／ 年中無休'}</p>
          </div>
          ${f.verified ? `<span class="pill pill-ok"><span class="dot"></span>運営検証済 ${f.verified}</span>` : '<span class="pill">施設申告値</span>'}
        </div>
        <p class="muted" style="margin:14px 0 26px">${esc(f.blurb)}</p>

        <div class="sect">
          <h2>客層データ</h2>
          <div class="card">
            <div class="split" style="margin-bottom:16px">
              <div><div class="tiny muted">月間来場者数（目安）</div><div class="casecard" style="background:none;border:0;padding:0"><span class="big num">${f.monthlyVisitors.toLocaleString()}</span> <span class="tiny muted">人</span></div></div>
              <div><div class="tiny muted">平日 / 休日の比率</div><div class="casecard" style="background:none;border:0;padding:0"><span class="big num">${f.weekdayRatio}</span><span class="tiny muted">% / ${100 - f.weekdayRatio}%</span></div></div>
            </div>
            <h4 style="font-size:13px;margin-bottom:8px">男女比</h4>
            <div class="bar"><span class="tiny muted">女性</span><span class="track"><span class="fill alt" style="width:${f.femaleRatio}%"></span></span><span class="v num">${f.femaleRatio}%</span></div>
            <div class="bar"><span class="tiny muted">男性</span><span class="track"><span class="fill" style="width:${100 - f.femaleRatio}%"></span></span><span class="v num">${100 - f.femaleRatio}%</span></div>
            <h4 style="font-size:13px;margin:16px 0 8px">年代構成</h4>
            ${Object.entries(f.ageMix).map(([k, v]) =>
              `<div class="bar"><span class="tiny muted">${k}</span><span class="track"><span class="fill" style="width:${(v / maxAge) * 100}%"></span></span><span class="v num">${v}%</span></div>`).join('')}
            <div class="chips" style="margin-top:14px">${f.audienceTags.map((t) => `<span class="pill pill-primary">${t}</span>`).join('')}</div>
          </div>
        </div>

        <div class="sect">
          <h2>プロモーション実績</h2>
          <div class="card">
            <div class="split" style="margin-bottom:14px">
              <div class="casecard"><h4>平均消化スピード</h4><span class="big num">${f.avgConsumption}</span> <span class="tiny muted">個/日</span>
                <div class="tiny muted" style="margin-top:4px">800個なら約${Math.ceil(800 / f.avgConsumption)}日で配布し切る計算です</div></div>
              <div class="casecard"><h4>これまでの実施</h4><span class="big num">${f.campaignCount}</span> <span class="tiny muted">件</span>
                <div class="tiny muted" style="margin-top:4px">直近の事例は下に掲載しています</div></div>
            </div>
            ${f.cases.length ? `<div class="tablewrap scrollx"><table class="t">
              <thead><tr><th>カテゴリ</th><th>時期／期間</th><th>配布</th><th>消化</th><th>スピード</th><th>使用枠</th></tr></thead>
              <tbody>${f.cases.map((c) => `<tr>
                <td><span class="pill">${c.cat}</span></td><td>${c.period}</td>
                <td class="num">${c.qty.toLocaleString()}個</td>
                <td class="num">${Math.round((c.consumed / c.qty) * 100)}%</td>
                <td class="num"><b>${c.perDay}</b> 個/日</td><td class="tiny">${esc(c.slot)}</td></tr>`).join('')}</tbody>
            </table></div>` : '<p class="muted tiny">この施設での実施実績はまだありません。</p>'}
          </div>
        </div>

        <div class="sect">
          <h2>現在設置中のサンプル</h2>
          <div class="card">
            <p class="tiny muted" style="margin-top:0">競合カテゴリの事前確認用です。ブランド名は公開していません。</p>
            ${f.currentSamples.length ? `<div class="tablewrap"><table class="t">
              <thead><tr><th>カテゴリ</th><th>設置終了予定</th><th>枠</th></tr></thead>
              <tbody>${f.currentSamples.map((c) => `<tr class="${c.cat === ui.q.category ? '' : ''}">
                <td><span class="pill ${c.cat === ui.q.category ? 'pill-danger' : ''}">${c.cat}</span></td>
                <td>${D.fmtDateLong(D.ymd(D.addDays(D.TODAY, c.until)))}</td>
                <td class="tiny">${esc(c.slot)}</td></tr>`).join('')}</tbody>
            </table></div>` : '<p class="muted tiny" style="margin:0">現在設置中のサンプルはありません。</p>'}
          </div>
        </div>

        <div class="sect">
          <h2>枠と料金</h2>
          <div class="tablewrap scrollx"><table class="t">
            <thead><tr><th>枠商品</th><th>タイプ</th><th>課金単位</th><th>単価（税抜）</th><th>同時受入</th><th>最小-最大</th></tr></thead>
            <tbody>${f.slots.map((s) => {
              const sl = D.slotById(s.id);
              return `<tr><td><b>${esc(s.name)}</b></td><td class="tiny">${D.SLOT_TYPES[s.type].short}</td>
                <td>${sl.unitLabel}</td><td class="num">${D.yen(s.price)}</td>
                <td class="num">${s.capacity}</td><td class="num">${sl.minDays}-${sl.maxDays}日</td></tr>`;
            }).join('')}</tbody>
          </table></div>
          <p class="tiny muted" style="margin-top:9px">オプション：運営レンタル什器 ${D.yen(D.FIXTURE_FEE)}／件</p>
        </div>

        <div class="sect" id="calendar">
          <h2>空き枠カレンダー</h2>
          <div class="card">
            <div class="tabs">${f.slots.map((s) => `<button class="tab ${ui.facSlot === s.id ? 'on' : ''}" data-slot="${s.id}">${esc(s.name)}</button>`).join('')}</div>
            ${calendarHTML(slot.id, ui.calMonth, sel)}
          </div>
        </div>
      </div>

      <aside class="widget">
        <div class="card">
          <h3 style="font-size:16px;margin-bottom:12px">この枠を予約する</h3>
          <label class="f">枠商品</label>
          <select class="inp" id="w-slot">${f.slots.map((s) => `<option value="${s.id}" ${ui.facSlot === s.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select>

          <label class="f" style="margin-top:11px">商材カテゴリ<span class="tiny" style="font-weight:400;color:var(--ink-3)">（排他判定に使います）</span></label>
          <select class="inp" id="w-cat">${D.CATEGORIES.map((c) => `<option ${ui.q.category === c ? 'selected' : ''}>${c}</option>`).join('')}</select>

          <div class="row" style="margin-top:11px;gap:8px">
            <div style="flex:1"><label class="f">開始日</label><input class="inp" type="date" id="w-start" value="${sel.start || ''}"></div>
            <div style="flex:1"><label class="f">日数</label><input class="inp" type="number" id="w-days" min="${slot.minDays}" max="${slot.maxDays}" value="${chk ? chk.days : slot.minDays}"></div>
          </div>

          <label class="f" style="margin-top:11px">数量（同時に置く数）</label>
          <div class="row">
            <div class="stepper">
              <button id="w-minus" ${ui.q.qty <= 1 ? 'disabled' : ''}>−</button>
              <span class="num">${ui.q.qty}</span>
              <button id="w-plus" ${ui.q.qty >= slot.capacity ? 'disabled' : ''}>＋</button>
            </div>
            <span class="tiny muted">この枠の上限 ${slot.capacity}／期間中の空き ${sel.start ? D.dayInfo(slot.id, sel.start).available : '—'}</span>
          </div>

          <label class="row" style="margin-top:12px;gap:8px;cursor:pointer;font-size:13.5px">
            <input type="checkbox" id="w-fixture" ${ui.q.fixture ? 'checked' : ''}> 運営レンタル什器を使う（${D.yen(D.FIXTURE_FEE)}／件）
          </label>

          ${qt && chk && chk.ok ? `
            <div style="margin-top:14px">
              <div class="price-row"><span>枠料金 ${D.yen(slot.price)}×${qt.units}${qt.unitLabel}${ui.q.qty > 1 ? `×${ui.q.qty}` : ''}</span><span class="num">${D.yen(qt.slotFee)}</span></div>
              ${qt.fixtureFee ? `<div class="price-row"><span>運営レンタル什器 ${D.yen(D.FIXTURE_FEE)}${ui.q.qty > 1 ? ` × ${ui.q.qty}` : ''}</span><span class="num">${D.yen(qt.fixtureFee)}</span></div>` : ''}
              <div class="price-row"><span class="muted">小計（税抜）</span><span class="num muted">${D.yen(qt.net)}</span></div>
              <div class="price-row"><span class="muted">消費税 10%</span><span class="num muted">${D.yen(qt.tax)}</span></div>
              <div class="price-row total"><span>合計</span><span class="num">${D.yen(qt.gross)}</span></div>
            </div>
            <div class="note note-info" style="margin-top:12px;font-size:12.5px">
              <span class="ico">📦</span><div>着荷期限 <b>${D.fmtDateLong(D.deliveryDue(slot, sel.start))}</b><br>現物は施設へ直送（元払い）でお願いします。</div>
            </div>
            <button class="btn btn-lg" id="w-book" style="margin-top:13px">この枠を予約する</button>
            <p class="tiny muted center" style="margin:9px 0 0">押すと${D.HOLD_MINUTES}分間 枠を確保します。<br>お支払いの完了で予約確定です。</p>
          ` : `
            <div class="note note-warn" style="margin-top:14px;font-size:13px">
              <span class="ico">⚠️</span>
              <div>${chk ? chk.issues.map((i) => esc(i.msg)).join('<br>') : '期間を選んでください'}</div>
            </div>
            ${chk && chk.issues.length ? `<button class="btn btn-ghost btn-lg" id="w-suggest" style="margin-top:11px">空いている最短日程を提案</button>` : ''}
          `}
        </div>
      </aside>
    </div>
  </div>`;
}

/* ================= 申込・決済 ================= */
function viewCheckout(id) {
  const b = D.state.bookings.find((x) => x.id === id);
  if (!b) return notFound('この申込は見つかりませんでした');
  if (b.status === 'expired') {
    return `<div class="wrap wrap-narrow"><div class="card empty"><div class="em">⏳</div>
      <h3>お時間切れになりました</h3><p>枠を他のお客様に開放しました。<br>もう一度お申し込みください。</p>
      <a class="btn" href="#/facility/${b.facilityId}">同じ施設をもう一度見る</a></div></div>`;
  }
  if (b.status !== 'hold') return viewDone(id);
  const slot = D.slotById(b.slotId);
  const f = slot.facility;
  const step = ui.checkoutStep || 1;

  return `
  <div class="wrap wrap-narrow">
    <div class="spread" style="margin-bottom:18px">
      <div class="steps">
        <span class="st ${step > 1 ? 'done' : step === 1 ? 'on' : ''}"><i>${step > 1 ? '✓' : '1'}</i>内容確認</span><span class="sep"></span>
        <span class="st ${step > 2 ? 'done' : step === 2 ? 'on' : ''}"><i>${step > 2 ? '✓' : '2'}</i>出稿情報</span><span class="sep"></span>
        <span class="st ${step === 3 ? 'on' : ''}"><i>3</i>お支払い</span>
      </div>
      <span class="countdown" id="cd" data-exp="${b.holdExpiresAt}">枠を確保中 <b id="cd-v">--:--</b></span>
    </div>

    <div class="card" style="margin-bottom:16px">
      <div class="card-hd"><h3>${esc(f.name)}</h3><span class="pill pill-primary">${esc(slot.name)}</span></div>
      <div class="tablewrap"><table class="t"><tbody>
        <tr><th style="width:120px">期間</th><td>${D.fmtDateLong(b.start)} 〜 ${D.fmtDate(b.end)}（${b.total.days}日間）</td></tr>
        <tr><th>数量</th><td class="num">${b.qty}</td></tr>
        <tr><th>商材カテゴリ</th><td><span class="pill">${esc(b.category)}</span></td></tr>
        <tr><th>着荷期限</th><td><b>${D.fmtDateLong(b.deliveryDue)}</b> まで</td></tr>
        <tr><th>納品先</th><td class="tiny">${f.prefName}${f.city}（詳細住所は予約確定後にご案内します）</td></tr>
      </tbody></table></div>
    </div>

    ${step === 1 ? `
      <div class="card">
        <h3 style="font-size:16px;margin-bottom:12px">料金明細</h3>
        ${priceTable(b)}
        <button class="btn btn-lg" id="ck-next" style="margin-top:16px">出稿情報の入力へ</button>
      </div>` : ''}

    ${step === 2 ? `
      <div class="card">
        <h3 style="font-size:16px;margin-bottom:14px">出稿情報</h3>
        <div class="stack">
          <div><label class="f">商材名 <span style="color:var(--danger)">必須</span></label>
            <input class="inp" id="ck-product" placeholder="例：うるおいクレンジングミルク" value="${esc(b.product || '')}"></div>
          <div class="split">
            <div><label class="f">配布個数 <span style="color:var(--danger)">必須</span></label>
              <input class="inp" type="number" id="ck-qty" min="1" placeholder="800" value="${b.sampleQty || ''}"></div>
            <div><label class="f">発送予定日</label>
              <input class="inp" type="date" id="ck-ship" value="${b.shipDate || D.ymd(D.addDays(D.parseYmd(b.deliveryDue), -3))}"></div>
          </div>
          <div><label class="f">現場ご担当者のお名前 <span style="color:var(--danger)">必須</span></label>
            <input class="inp" id="ck-name" placeholder="例：田中 太郎" value="${esc(b.contact || '')}"></div>
          <div><label class="f">施設への申し送り（任意）</label>
            <textarea class="inp" id="ck-memo" rows="2" placeholder="例：直射日光を避けて設置してください">${esc(b.memo || '')}</textarea></div>
        </div>
        <div class="note note-info" style="margin-top:14px;font-size:12.5px"><span class="ico">💡</span>
          <div>この施設の消化スピードは <b>${f.avgConsumption}個/日</b> です。${b.total.days}日間なら <b>約${f.avgConsumption * b.total.days}個</b> が目安になります。</div></div>
        <div class="row" style="margin-top:16px;gap:10px">
          <button class="btn btn-ghost" id="ck-back">もどる</button>
          <button class="btn" id="ck-next" style="flex:1">お支払いへ進む</button>
        </div>
      </div>` : ''}

    ${step === 3 ? `
      <div class="card">
        <h3 style="font-size:16px;margin-bottom:12px">お支払い</h3>
        ${priceTable(b)}
        <div style="margin-top:16px;padding:16px;border:1.5px solid var(--line-2);border-radius:var(--r);background:var(--surface-2)">
          <div class="row" style="margin-bottom:12px"><span class="pill pill-primary">クレジットカード</span><span class="tiny muted">デモ環境のため実際の決済は発生しません</span></div>
          <label class="f">カード番号</label><input class="inp" value="4242 4242 4242 4242" readonly>
          <div class="split" style="margin-top:9px">
            <div><label class="f">有効期限</label><input class="inp" value="12 / 30" readonly></div>
            <div><label class="f">セキュリティコード</label><input class="inp" value="123" readonly></div>
          </div>
        </div>
        <div class="note note-warn" style="margin-top:14px;font-size:12.5px"><span class="ico">📋</span>
          <div><b>キャンセル規定</b>：60日前まで100%返金／59〜31日前 70%／30〜15日前 50%／14〜8日前 30%／7日前以降は返金なし。</div></div>
        <label class="row" style="margin-top:13px;gap:8px;cursor:pointer;font-size:13.5px">
          <input type="checkbox" id="ck-agree"> キャンセル規定と利用規約に同意します</label>
        <div class="row" style="margin-top:14px;gap:10px">
          <button class="btn btn-ghost" id="ck-back">もどる</button>
          <button class="btn btn-accent" id="ck-pay" style="flex:1" disabled>${D.yen(b.total.gross)}を支払って予約を確定</button>
        </div>
      </div>` : ''}
  </div>`;
}

function priceTable(b) {
  const t = b.total;
  return `
  <div class="price-row"><span>枠料金（${t.units}${t.unitLabel}分${b.qty > 1 ? ` × ${b.qty}` : ''}）</span><span class="num">${D.yen(t.slotFee)}</span></div>
  ${t.fixtureFee ? `<div class="price-row"><span>運営レンタル什器</span><span class="num">${D.yen(t.fixtureFee)}</span></div>` : ''}
  <div class="price-row"><span class="muted">小計（税抜）</span><span class="num muted">${D.yen(t.net)}</span></div>
  <div class="price-row"><span class="muted">消費税 10%</span><span class="num muted">${D.yen(t.tax)}</span></div>
  <div class="price-row total"><span>合計（税込）</span><span class="num">${D.yen(t.gross)}</span></div>`;
}

function viewDone(id) {
  const b = D.state.bookings.find((x) => x.id === id);
  if (!b) return notFound();
  const slot = D.slotById(b.slotId);
  const f = slot.facility;
  return `
  <div class="wrap wrap-narrow">
    <div class="card center" style="padding:34px 24px">
      <div style="font-size:44px;line-height:1">🎉</div>
      <h1 style="font-size:24px;margin:10px 0 6px">ご予約が確定しました</h1>
      <p class="muted">${esc(f.name)}／${esc(slot.name)}<br>${D.fmtDateLong(b.start)} 〜 ${D.fmtDate(b.end)}（${b.total.days}日間）</p>
      <span class="pill pill-ok" style="margin-top:6px"><span class="dot"></span>予約番号 ${b.no}</span>
    </div>
    <div class="note note-warn" style="margin:16px 0"><span class="ico">📦</span>
      <div><b>次にやること：${D.fmtDateLong(b.deliveryDue)} までに現物を施設へ発送</b><br>
      この日までにサンプルが施設へ到着している必要があります。送料は元払いでご負担ください。</div></div>
    <div class="card">
      <h3 style="font-size:15px;margin-bottom:12px">お申込み内容</h3>
      <div class="tablewrap"><table class="t"><tbody>
        <tr><th style="width:130px">商材</th><td>${esc(b.product || '—')}（${esc(b.category)}）</td></tr>
        <tr><th>配布個数</th><td class="num">${b.sampleQty ? b.sampleQty.toLocaleString() + '個' : '—'}</td></tr>
        <tr><th>ご担当者</th><td>${esc(b.contact || '—')}</td></tr>
        <tr><th>お支払い</th><td class="num">${D.yen(b.total.gross)}（税込）／カード決済</td></tr>
      </tbody></table></div>
      <div class="row" style="margin-top:16px;gap:10px">
        <a class="btn btn-ghost" href="#/bookings">予約一覧を見る</a>
        <a class="btn" href="#/search">別の枠もさがす</a>
      </div>
    </div>
  </div>`;
}

/* ================= 予約一覧 ================= */
const STATUS_LABEL = {
  hold: ['仮押さえ', 'pill-warn'], confirmed: ['予約確定', 'pill-ok'],
  cancelled: ['キャンセル', 'pill-danger'], expired: ['期限切れ', ''],
};

function viewBookings() {
  const list = [...D.state.bookings].reverse();
  if (!list.length) {
    return `<div class="wrap wrap-narrow"><div class="page-head"><h1>予約管理</h1></div>
      <div class="card empty"><div class="em">♨</div><h3>まだ予約はありません</h3>
      <p>空き枠をさがして、最初の枠を押さえてみましょう。</p>
      <a class="btn" href="#/search">空き枠をさがす</a></div></div>`;
  }
  return `
  <div class="wrap">
    <div class="page-head"><h1>予約管理</h1><p>お申込みいただいた枠の一覧です。</p></div>
    <div class="stack">
      ${list.map((b) => {
        const slot = D.slotById(b.slotId); const f = slot.facility;
        const [lbl, cls] = STATUS_LABEL[b.status] || ['—', ''];
        const rp = b.status === 'confirmed' ? D.refundPreview(b) : null;
        return `<div class="card">
          <div class="spread" style="align-items:flex-start">
            <div style="min-width:0">
              <div class="row" style="gap:8px;margin-bottom:4px"><span class="pill ${cls}">${lbl}</span><span class="tiny muted">${b.no}</span></div>
              <h3 style="font-size:17px">${esc(f.name)}</h3>
              <p class="tiny muted" style="margin:3px 0 0">${esc(slot.name)}／${D.fmtDateLong(b.start)} 〜 ${D.fmtDate(b.end)}（${b.total.days}日間・${b.qty}枠）</p>
            </div>
            <div style="text-align:right;flex:none">
              <div class="fprice num">${D.yen(b.total.gross)}</div>
              <div class="tiny muted">税込</div>
            </div>
          </div>
          ${b.status === 'confirmed' ? `
            <div class="note note-info" style="margin-top:12px;font-size:12.5px"><span class="ico">📦</span>
              <div>着荷期限 <b>${D.fmtDateLong(b.deliveryDue)}</b>${b.shipment ? ' ／ <b style="color:var(--ok)">施設が受領済み</b>' : ' ／ 未着荷'}</div></div>
            <div class="row" style="margin-top:12px;gap:9px">
              <button class="btn btn-sm btn-ghost" data-cancel="${b.id}">キャンセルする（返金${rp.rate}%・${D.yen(rp.amount)}）</button>
            </div>` : ''}
          ${b.status === 'hold' ? `<div class="row" style="margin-top:12px"><a class="btn btn-sm" href="#/checkout/${b.id}">お支払いを続ける</a></div>` : ''}
          ${b.status === 'cancelled' ? `<p class="tiny muted" style="margin:10px 0 0">返金率 ${b.refundRate}%／返金額 ${D.yen(b.refundAmount)}（着金目安5〜10営業日）</p>` : ''}
        </div>`;
      }).join('')}
    </div>
  </div>`;
}

/* ================= 施設側 ================= */
/* デモでは「直近に受注した施設」の担当者として表示する。受注がなければ既定の施設。 */
function myFacilityId() {
  const b = [...D.state.bookings].reverse().find((x) => x.status === 'confirmed' || x.status === 'hold');
  return b ? D.slotById(b.slotId).facilityId : 'f01';
}

function viewFacHome() {
  const f = D.facilityById(myFacilityId());
  const mine = D.state.bookings.filter(
    (b) => D.slotById(b.slotId).facilityId === f.id && b.status === 'confirmed');
  const needShip = mine.filter((b) => !b.shipment);
  const needReport = mine.filter((b) => b.shipment && !b.report && D.ymd(D.TODAY) > b.end);
  return `
  <div class="fac-shell">
    <div class="page-head">
      <span class="pill pill-primary">${esc(f.name)}</span>
      <h1 style="margin-top:9px">今日やること</h1>
      <p>${D.fmtDateLong(D.ymd(D.TODAY))}</p>
    </div>

    <div class="stack" style="margin-bottom:22px">
      ${needShip.length === 0 && needReport.length === 0
        ? `<div class="card empty" style="padding:30px 18px"><div class="em">☺</div><h3>今日やることはありません</h3>
           <p class="tiny">受注が入るとここに表示されます。</p></div>`
        : ''}
      ${needShip.map((b) => `
        <button class="task" data-recv="${b.id}">
          <span class="ic" style="background:var(--warn-soft);color:var(--warn)">📦</span>
          <span class="tx"><b>荷物を受け取ったら押してください</b>
          <span>${esc(b.product || b.category)}／着荷期限 ${D.fmtDate(b.deliveryDue)}</span></span>
          <span class="ar">›</span></button>`).join('')}
      ${needReport.map((b) => `
        <button class="task" data-report="${b.id}">
          <span class="ic" style="background:var(--ok-soft);color:var(--ok)">📝</span>
          <span class="tx"><b>実施のご報告をお願いします</b>
          <span>${esc(b.product || b.category)}／${D.fmtDate(b.start)}〜${D.fmtDate(b.end)}・所要3分</span></span>
          <span class="ar">›</span></button>`).join('')}
    </div>

    <h3 style="font-size:15px;margin-bottom:10px">いま館内に置いているもの</h3>
    <div class="stack" style="margin-bottom:22px">
      ${f.currentSamples.map((c) => `<div class="card card-pad-sm">
        <div class="spread"><div><b>${c.cat}</b><div class="tiny muted">${esc(c.slot)}</div></div>
        <span class="pill">${D.fmtDate(D.ymd(D.addDays(D.TODAY, c.until)))}まで</span></div></div>`).join('')}
      ${mine.filter((b) => D.ymd(D.TODAY) >= b.start && D.ymd(D.TODAY) <= b.end).map((b) => `
        <div class="card card-pad-sm"><div class="spread"><div><b>${esc(b.category)}</b>
        <div class="tiny muted">${esc(D.slotById(b.slotId).name)}</div></div>
        <span class="pill pill-ok">${D.fmtDate(b.end)}まで</span></div></div>`).join('')}
      ${!f.currentSamples.length ? '<p class="tiny muted">現在設置中のサンプルはありません。</p>' : ''}
    </div>

    <a class="btn btn-lg" href="#/f/calendar">受入できない日を登録する</a>
  </div>`;
}

function viewFacCalendar() {
  const f = D.facilityById(myFacilityId());
  if (!ui.facCalSlot || D.slotById(ui.facCalSlot)?.facilityId !== f.id) ui.facCalSlot = f.slots[0].id;
  if (!ui.facMonth) ui.facMonth = new Date(D.TODAY.getFullYear(), D.TODAY.getMonth(), 1);
  const slotId = ui.facCalSlot;
  const m = ui.facMonth;
  const first = new Date(m.getFullYear(), m.getMonth(), 1);
  const lastDay = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < first.getDay(); i++) cells.push('<div class="cell empty"></div>');
  for (let d = 1; d <= lastDay; d++) {
    const ds = D.ymd(new Date(m.getFullYear(), m.getMonth(), d));
    const info = D.dayInfo(slotId, ds);
    const label = info.past ? '—' : info.capacity === 0 ? '休' : info.booked > 0 ? `予${info.booked}` : `空${info.available}`;
    cells.push(`<button class="cell" data-s="${info.past ? 'out' : info.capacity === 0 ? 'blocked' : info.booked > 0 ? (info.available ? 'low' : 'full') : 'open'}"
      data-fday="${ds}" ${info.past ? 'disabled' : ''}><span class="d">${d}</span><span class="s">${label}</span></button>`);
  }
  const prevOk = first > D.TODAY;

  return `
  <div class="fac-shell">
    <div class="page-head">
      <span class="pill pill-primary">${esc(f.name)}</span>
      <h1 style="margin-top:9px">スケジュール</h1>
      <p>受け入れできない日をタップで登録できます。</p>
    </div>

    <div class="tabs">${f.slots.map((s) => `<button class="tab ${slotId === s.id ? 'on' : ''}" data-fslot="${s.id}">${esc(s.name)}</button>`).join('')}</div>

    <div class="card">
      <div class="cal">
        <div class="cal-hd"><b>${m.getFullYear()}年${m.getMonth() + 1}月</b>
          <div class="cal-nav"><button id="fcal-prev" ${prevOk ? '' : 'disabled'}>‹</button><button id="fcal-next">›</button></div></div>
        <div class="cal-grid">
          ${D.WD.map((w, i) => `<div class="cal-wd ${i === 0 ? 'sun' : i === 6 ? 'sat' : ''}">${w}</div>`).join('')}
          ${cells.join('')}
        </div>
        <div class="cal-legend">
          <span><i style="background:#EAF6F1"></i>空きあり</span>
          <span><i style="background:#FDF0DF"></i>予約あり</span>
          <span><i style="background:var(--ground-2)"></i>満枠</span>
          <span><i style="background:repeating-linear-gradient(45deg,#EAE1D6 0 4px,#F3ECE3 4px 8px)"></i>受入不可</span>
        </div>
      </div>
    </div>

    <button class="btn btn-lg btn-ghost" id="bulk" style="margin-top:14px">まとめて設定する</button>

    ${D.state.overrides.filter((o) => D.slotById(o.slotId).facilityId === f.id).length ? `
      <h3 style="font-size:14px;margin:22px 0 9px">登録済みの受入不可</h3>
      <div class="stack">
        ${D.state.overrides.filter((o) => D.slotById(o.slotId).facilityId === f.id).map((o) => `
          <div class="card card-pad-sm"><div class="spread">
            <div><b class="tiny">${D.fmtDate(o.from)}${o.from !== o.to ? ` 〜 ${D.fmtDate(o.to)}` : ''}</b>
            <div class="tiny muted">${esc(D.slotById(o.slotId).name)}／${o.capacity === 0 ? '受入不可' : `${o.capacity}台に制限`}・${o.reason}</div></div>
            <button class="btn btn-sm btn-ghost" data-delov="${o.id}">取り消す</button>
          </div></div>`).join('')}
      </div>` : ''}
  </div>`;
}

/* ================= 運営 ================= */
function viewAdmin() {
  const bs = D.state.bookings;
  const confirmed = bs.filter((b) => b.status === 'confirmed');
  const gmv = confirmed.reduce((a, b) => a + b.total.net, 0);
  const holds = bs.filter((b) => b.status === 'hold');
  const unship = confirmed.filter((b) => !b.shipment);
  return `
  <div class="wrap">
    <div class="page-head"><h1>運営ダッシュボード</h1><p>全施設・全広告主の予約状況をここで見ます。</p></div>
    <div class="kpis">
      <div class="kpi"><div class="lbl">確定GMV（税抜）</div><div class="val" style="color:var(--primary)">${D.yen(gmv)}</div><div class="sub">運営取分 ${D.yen(gmv * 0.3)}（30%）</div></div>
      <div class="kpi"><div class="lbl">確定予約</div><div class="val num">${confirmed.length}</div><div class="sub">件</div></div>
      <div class="kpi"><div class="lbl">仮押さえ中</div><div class="val num" style="color:var(--warn)">${holds.length}</div><div class="sub">${D.HOLD_MINUTES}分で自動開放</div></div>
      <div class="kpi"><div class="lbl">未着荷</div><div class="val num" style="color:${unship.length ? 'var(--danger)' : 'var(--ok)'}">${unship.length}</div><div class="sub">要フォロー</div></div>
    </div>

    ${unship.length ? `<div class="note note-danger" style="margin-bottom:18px"><span class="ico">🚨</span>
      <div><b>未着荷の案件が${unship.length}件あります。</b> 着荷期限を過ぎると実施できません。<br>
      ${unship.map((b) => `${esc(D.slotById(b.slotId).facility.name)}（${D.fmtDate(b.deliveryDue)}まで）`).join('／')}</div></div>` : ''}

    <div class="card" style="margin-bottom:20px">
      <div class="card-hd"><h3>予約横断一覧</h3><span class="tiny muted">${bs.length}件</span></div>
      ${bs.length ? `<div class="tablewrap scrollx"><table class="t">
        <thead><tr><th>予約番号</th><th>施設</th><th>枠</th><th>期間</th><th>商材</th><th>金額（税抜）</th><th>状態</th></tr></thead>
        <tbody>${[...bs].reverse().map((b) => {
          const s = D.slotById(b.slotId);
          const [lbl, cls] = STATUS_LABEL[b.status] || ['—', ''];
          return `<tr><td class="tiny">${b.no}</td><td>${esc(s.facility.name)}</td><td class="tiny">${esc(s.name)}</td>
            <td class="tiny">${D.fmtDate(b.start)}〜${D.fmtDate(b.end)}</td>
            <td class="tiny">${esc(b.category)}</td><td class="num">${D.yen(b.total.net)}</td>
            <td><span class="pill ${cls}">${lbl}</span></td></tr>`;
        }).join('')}</tbody></table></div>`
        : '<p class="muted tiny" style="margin:0">まだ予約がありません。広告主の立場に切り替えて申し込んでみてください。</p>'}
    </div>

    <div class="card">
      <div class="card-hd"><h3>提携施設</h3><span class="tiny muted">${D.FACILITIES.length}施設</span></div>
      <div class="tablewrap scrollx"><table class="t">
        <thead><tr><th>施設</th><th>エリア</th><th>枠数</th><th>月間来場</th><th>消化スピード</th><th>実施</th><th>客層データ</th></tr></thead>
        <tbody>${D.FACILITIES.map((f) => `<tr>
          <td><b>${esc(f.name)}</b></td><td class="tiny">${f.prefName}</td><td class="num">${f.slots.length}</td>
          <td class="num">${f.monthlyVisitors.toLocaleString()}</td><td class="num">${f.avgConsumption} 個/日</td>
          <td class="num">${f.campaignCount}件</td>
          <td>${f.verified ? `<span class="pill pill-ok">検証済 ${f.verified}</span>` : '<span class="pill pill-warn">申告のみ</span>'}</td>
        </tr>`).join('')}</tbody>
      </table></div>
    </div>
  </div>`;
}

function notFound(msg = 'ページが見つかりませんでした') {
  return `<div class="wrap wrap-narrow"><div class="card empty"><div class="em">🔍</div><h3>${esc(msg)}</h3>
    <a class="btn" href="#/">トップにもどる</a></div></div>`;
}

/* ================= ルーター ================= */
function render() {
  sweepHolds();
  const hash = location.hash || '#/';
  const [, ...seg] = hash.split('/');
  const path = seg.filter(Boolean);
  let body;

  if (hash === '#/' || hash === '#') { ui.role = 'adv'; body = viewHome(); }
  else if (path[0] === 'search') { ui.role = 'adv'; body = viewSearch(); }
  else if (path[0] === 'facility') { ui.role = 'adv'; body = viewFacility(path[1]); }
  else if (path[0] === 'checkout') { ui.role = 'adv'; body = viewCheckout(path[1]); }
  else if (path[0] === 'done') { ui.role = 'adv'; body = viewDone(path[1]); }
  else if (path[0] === 'bookings') { ui.role = 'adv'; body = viewBookings(); }
  else if (path[0] === 'f' && path[1] === 'calendar') { ui.role = 'fac'; body = viewFacCalendar(); }
  else if (path[0] === 'f') { ui.role = 'fac'; body = viewFacHome(); }
  else if (path[0] === 'admin') { ui.role = 'ops'; body = viewAdmin(); }
  else body = notFound();

  $('#app').innerHTML = header() + body + footer();
  window.scrollTo({ top: 0, behavior: 'instant' in window ? 'auto' : 'auto' });
  bind();
}

/* ================= イベント ================= */
function bind() {
  // 役割切替
  $$('.roleswitch button').forEach((b) => b.addEventListener('click', () => {
    const r = b.dataset.role;
    go(r === 'adv' ? '#/' : r === 'fac' ? '#/f' : '#/admin');
  }));
  const rs = $('#reset-demo');
  if (rs) rs.addEventListener('click', (e) => {
    e.preventDefault();
    if (confirm('登録した予約や受入不可の設定をすべて消して、初期状態に戻します。よろしいですか？')) {
      D.resetAll(); toast('デモデータを初期化しました'); render();
    }
  });

  // トップの検索
  const qgo = $('#q-go');
  if (qgo) qgo.addEventListener('click', () => {
    ui.q.region = $('#q-region').value;
    ui.q.start = $('#q-start').value;
    ui.q.days = +$('#q-days').value;
    ui.sel = { start: null, end: null }; ui.calMonth = null;
    go('#/search');
  });

  // 検索フィルタ
  const sstart = $('#s-start');
  if (sstart) {
    sstart.addEventListener('change', () => { ui.q.start = sstart.value; ui.sel = { start: null, end: null }; render(); });
    $('#s-days').addEventListener('change', (e) => { ui.q.days = +e.target.value; render(); });
    $('#s-cat').addEventListener('change', (e) => { ui.q.category = e.target.value; render(); });
    const bud = $('#s-budget');
    bud.addEventListener('input', (e) => { ui.q.budget = +e.target.value; });
    bud.addEventListener('change', render);
    $$('[data-region]').forEach((b) => b.addEventListener('click', () => { ui.q.region = b.dataset.region; render(); }));
    $$('[data-type]').forEach((b) => b.addEventListener('click', () => {
      const t = b.dataset.type;
      ui.q.types = ui.q.types.includes(t) ? ui.q.types.filter((x) => x !== t) : [...ui.q.types, t];
      if (!ui.q.types.length) ui.q.types = [t];
      render();
    }));
    $$('[data-tag]').forEach((b) => b.addEventListener('click', () => {
      const t = b.dataset.tag;
      ui.q.tags = ui.q.tags.includes(t) ? ui.q.tags.filter((x) => x !== t) : [...ui.q.tags, t];
      render();
    }));
  }
  const relax = $('#relax');
  if (relax) relax.addEventListener('click', () => {
    ui.q.region = 'すべて'; ui.q.tags = []; ui.q.budget = 600000; render(); toast('条件をゆるめました');
  });
  const sh7 = $('#shift7');
  if (sh7) sh7.addEventListener('click', () => {
    ui.q.start = D.ymd(D.addDays(D.parseYmd(ui.q.start), 7)); ui.sel = { start: null, end: null }; render();
    toast('開始日を1週間うしろにずらしました');
  });

  // 施設カード
  $$('.fcard').forEach((c) => {
    const open = () => { ui.sel = { start: null, end: null }; ui.calMonth = null; ui.facSlot = null; go('#/facility/' + c.dataset.fid); };
    c.addEventListener('click', open);
    c.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
  });

  // 施設詳細：枠タブ・カレンダー・ウィジェット
  $$('[data-slot]').forEach((b) => b.addEventListener('click', () => {
    ui.facSlot = b.dataset.slot; ui.q.qty = 1; render();
  }));
  const wslot = $('#w-slot');
  if (wslot) {
    wslot.addEventListener('change', () => { ui.facSlot = wslot.value; ui.q.qty = 1; render(); });
    $('#w-cat').addEventListener('change', (e) => { ui.q.category = e.target.value; render(); });
    $('#w-start').addEventListener('change', (e) => {
      const days = +$('#w-days').value || 14;
      ui.sel = { start: e.target.value, end: D.ymd(D.addDays(D.parseYmd(e.target.value), days - 1)) };
      ui.calMonth = new Date(D.parseYmd(e.target.value).getFullYear(), D.parseYmd(e.target.value).getMonth(), 1);
      render();
    });
    $('#w-days').addEventListener('change', (e) => {
      const days = Math.max(1, +e.target.value || 14);
      if (ui.sel.start) ui.sel.end = D.ymd(D.addDays(D.parseYmd(ui.sel.start), days - 1));
      render();
    });
    const mi = $('#w-minus'), pl = $('#w-plus');
    if (mi) mi.addEventListener('click', () => { ui.q.qty = Math.max(1, ui.q.qty - 1); render(); });
    if (pl) pl.addEventListener('click', () => { ui.q.qty++; render(); });
    const fx = $('#w-fixture');
    if (fx) fx.addEventListener('change', () => { ui.q.fixture = fx.checked; render(); });
  }
  const cp = $('#cal-prev'), cn = $('#cal-next');
  if (cp) cp.addEventListener('click', () => { ui.calMonth = new Date(ui.calMonth.getFullYear(), ui.calMonth.getMonth() - 1, 1); render(); });
  if (cn) cn.addEventListener('click', () => { ui.calMonth = new Date(ui.calMonth.getFullYear(), ui.calMonth.getMonth() + 1, 1); render(); });

  $$('[data-date]').forEach((c) => c.addEventListener('click', () => {
    const ds = c.dataset.date;
    const slot = D.slotById(ui.facSlot);
    if (!ui.sel.start || ui.sel.end || ds < ui.sel.start) {
      ui.sel = { start: ds, end: null };
      toast(`終了日をタップしてください（最短 ${D.fmtDate(D.ymd(D.addDays(D.parseYmd(ds), slot.minDays - 1)))}）`);
    } else {
      ui.sel.end = ds;
    }
    render();
  }));

  const sug = $('#w-suggest');
  if (sug) sug.addEventListener('click', () => {
    const slot = D.slotById(ui.facSlot);
    const days = ui.sel.start && ui.sel.end
      ? D.diffDays(D.parseYmd(ui.sel.start), D.parseYmd(ui.sel.end)) + 1 : slot.minDays;
    const r = D.nextAvailable(slot.id, Math.max(days, slot.minDays), ui.q.qty, null, ui.q.category);
    if (!r) { toast('180日先までに空きが見つかりませんでした'); return; }
    ui.sel = r;
    ui.calMonth = new Date(D.parseYmd(r.start).getFullYear(), D.parseYmd(r.start).getMonth(), 1);
    render();
    toast(`${D.fmtDate(r.start)}〜${D.fmtDate(r.end)} を選びました`);
  });

  const book = $('#w-book');
  if (book) book.addEventListener('click', () => {
    const slot = D.slotById(ui.facSlot);
    const fixture = ui.q.fixture;
    const chk = D.checkRange(slot.id, ui.sel.start, ui.sel.end, ui.q.qty, ui.q.category);
    if (!chk.ok) { toast(chk.issues[0].msg); return; }
    const t = D.quote(slot.id, ui.sel.start, ui.sel.end, ui.q.qty, fixture);
    if (t.net < D.MIN_ORDER_NET) { toast(`最低出稿金額 ${D.yen(D.MIN_ORDER_NET)} に届いていません`); return; }
    const b = D.createBooking({
      slotId: slot.id, facilityId: slot.facilityId, start: ui.sel.start, end: ui.sel.end,
      qty: ui.q.qty, category: ui.q.category, total: t,
      deliveryDue: D.deliveryDue(slot, ui.sel.start),
    });
    ui.checkoutStep = 1;
    go('#/checkout/' + b.id);
  });

  // 申込
  const cd = $('#cd');
  if (cd) startCountdown(cd);
  const next = $('#ck-next');
  if (next) next.addEventListener('click', () => {
    const id = location.hash.split('/')[2];
    const b = D.state.bookings.find((x) => x.id === id);
    if (ui.checkoutStep === 2) {
      const p = $('#ck-product').value.trim();
      const q = +$('#ck-qty').value;
      const n = $('#ck-name').value.trim();
      if (!p || !q || !n) { toast('必須項目を入力してください'); return; }
      b.product = p; b.sampleQty = q; b.contact = n;
      b.shipDate = $('#ck-ship').value; b.memo = $('#ck-memo').value.trim();
      D.save();
    }
    ui.checkoutStep = Math.min(3, (ui.checkoutStep || 1) + 1);
    render();
  });
  const back = $('#ck-back');
  if (back) back.addEventListener('click', () => { ui.checkoutStep = Math.max(1, (ui.checkoutStep || 1) - 1); render(); });
  const agree = $('#ck-agree');
  if (agree) agree.addEventListener('change', () => { $('#ck-pay').disabled = !agree.checked; });
  const pay = $('#ck-pay');
  if (pay) pay.addEventListener('click', () => {
    const id = location.hash.split('/')[2];
    D.confirmBooking(id);
    toast('お支払いが完了しました。枠を確定しました');
    go('#/done/' + id);
  });

  // 予約一覧
  $$('[data-cancel]').forEach((b) => b.addEventListener('click', () => {
    const bk = D.state.bookings.find((x) => x.id === b.dataset.cancel);
    const rp = D.refundPreview(bk);
    if (confirm(`この予約をキャンセルします。\n\n実施開始まで ${rp.daysBefore}日\n返金率 ${rp.rate}%／返金額 ${D.yen(rp.amount)}\n\nよろしいですか？`)) {
      D.cancelBooking(bk.id); toast('キャンセルを受け付けました。枠を開放しました'); render();
    }
  }));

  // 施設側
  $$('[data-recv]').forEach((b) => b.addEventListener('click', () => {
    const bk = D.state.bookings.find((x) => x.id === b.dataset.recv);
    bk.shipment = { receivedAt: Date.now() }; D.save();
    toast('受領を登録しました。ありがとうございます'); render();
  }));
  $$('[data-report]').forEach((b) => b.addEventListener('click', () => {
    const bk = D.state.bookings.find((x) => x.id === b.dataset.report);
    openSheet(`
      <h3 style="font-size:17px;margin-bottom:4px">実施のご報告</h3>
      <p class="tiny muted">${esc(bk.product || bk.category)}／${D.fmtDate(bk.start)}〜${D.fmtDate(bk.end)}</p>
      <label class="f" style="margin-top:14px">配り切った個数</label>
      <input class="inp" type="number" id="rp-qty" inputmode="numeric" placeholder="${bk.sampleQty || 800}" value="${bk.sampleQty || ''}">
      <label class="f" style="margin-top:12px">現場の所感（任意）</label>
      <textarea class="inp" id="rp-memo" rows="3" placeholder="例：女性のお客様の反応がよかったです"></textarea>
      <button class="btn btn-lg" id="rp-send" style="margin-top:16px">報告を送る</button>`, () => {
      $('#rp-send').addEventListener('click', () => {
        bk.report = { qty: +$('#rp-qty').value || 0, memo: $('#rp-memo').value }; D.save();
        closeSheet(); toast('ご報告ありがとうございました'); render();
      });
    });
  }));
  $$('[data-fslot]').forEach((b) => b.addEventListener('click', () => { ui.facCalSlot = b.dataset.fslot; render(); }));
  const fp = $('#fcal-prev'), fn = $('#fcal-next');
  if (fp) fp.addEventListener('click', () => { ui.facMonth = new Date(ui.facMonth.getFullYear(), ui.facMonth.getMonth() - 1, 1); render(); });
  if (fn) fn.addEventListener('click', () => { ui.facMonth = new Date(ui.facMonth.getFullYear(), ui.facMonth.getMonth() + 1, 1); render(); });

  $$('[data-fday]').forEach((c) => c.addEventListener('click', () => {
    const ds = c.dataset.fday;
    const slotId = ui.facCalSlot;
    const info = D.dayInfo(slotId, ds);
    const conflicts = info.booked > 0;
    openSheet(`
      <h3 style="font-size:17px;margin-bottom:2px">${D.fmtDateLong(ds)}</h3>
      <p class="tiny muted">${esc(D.slotById(slotId).name)}／予約 ${info.booked}件</p>
      ${conflicts ? `
        <div class="note note-warn" style="margin:14px 0"><span class="ico">⚠️</span>
          <div>この日はすでに予約が入っているため、受入不可にはできません。日程の変更が必要な場合は運営にご相談ください。</div></div>
        <button class="bigbtn" id="sh-consult"><span>📞</span>運営に相談する</button>`
      : `
        <div style="margin-top:16px">
          <button class="bigbtn danger" id="sh-block"><span>🚫</span>この日は受け入れできない</button>
          <button class="bigbtn" id="sh-cap"><span>🔢</span>置ける数を変える（いまは${info.capacity}）</button>
        </div>`}
      <button class="btn btn-ghost btn-lg" id="sh-close" style="margin-top:8px">閉じる</button>`, () => {
      const bl = $('#sh-block');
      if (bl) bl.addEventListener('click', () => {
        D.addOverride({ slotId, from: ds, to: ds, capacity: 0, reason: '設備工事' });
        closeSheet(); toast(`${D.fmtDate(ds)}を受け入れ不可にしました`); render();
      });
      const cap = $('#sh-cap');
      if (cap) cap.addEventListener('click', () => {
        const n = prompt('この日に置ける数を入力してください', String(Math.max(0, info.capacity - 1)));
        if (n === null) return;
        D.addOverride({ slotId, from: ds, to: ds, capacity: Math.max(0, +n || 0), reason: '台数調整' });
        closeSheet(); toast('置ける数を変更しました'); render();
      });
      const cs = $('#sh-consult');
      if (cs) cs.addEventListener('click', () => { closeSheet(); toast('運営に相談内容を送りました'); });
      $('#sh-close').addEventListener('click', closeSheet);
    });
  }));

  const bulk = $('#bulk');
  if (bulk) bulk.addEventListener('click', () => {
    const slotId = ui.facCalSlot;
    openSheet(`
      <h3 style="font-size:17px;margin-bottom:12px">まとめて設定</h3>
      <label class="f">期間</label>
      <div class="row" style="gap:8px">
        <input class="inp" type="date" id="bk-from" value="${D.ymd(D.addDays(D.TODAY, 30))}">
        <input class="inp" type="date" id="bk-to" value="${D.ymd(D.addDays(D.TODAY, 34))}">
      </div>
      <label class="f" style="margin-top:12px">理由</label>
      <select class="inp" id="bk-reason">
        <option>定休日</option><option>繁忙期で対応できない</option><option>自社イベント</option><option>設備工事</option><option>その他</option>
      </select>
      <label class="f" style="margin-top:12px">この期間に置ける数</label>
      <select class="inp" id="bk-cap"><option value="0">0（受け入れ不可）</option><option value="1">1</option><option value="2">2</option></select>
      <button class="btn btn-lg" id="bk-save" style="margin-top:16px">この内容で反映する</button>
      <button class="btn btn-ghost btn-lg" id="sh-close" style="margin-top:8px">閉じる</button>`, () => {
      $('#sh-close').addEventListener('click', closeSheet);
      $('#bk-save').addEventListener('click', () => {
        const from = $('#bk-from').value, to = $('#bk-to').value;
        if (!from || !to || to < from) { toast('期間を正しく指定してください'); return; }
        const cap = +$('#bk-cap').value;
        const bad = D.conflictingDates(slotId, from, to, cap);
        D.addOverride({ slotId, from, to, capacity: cap, reason: $('#bk-reason').value });
        closeSheet();
        toast(bad.length
          ? `反映しました（${bad.length}日は予約があるため変更していません）`
          : '反映しました');
        render();
      });
    });
  });

  $$('[data-delov]').forEach((b) => b.addEventListener('click', () => {
    D.removeOverride(b.dataset.delov); toast('設定を取り消しました'); render();
  }));
}

/* ---------- ボトムシート ---------- */
function openSheet(html, after) {
  closeSheet();
  const bg = document.createElement('div');
  bg.className = 'sheet-bg';
  bg.innerHTML = `<div class="sheet"><div class="handle"></div>${html}</div>`;
  bg.addEventListener('click', (e) => { if (e.target === bg) closeSheet(); });
  document.body.appendChild(bg);
  document.body.style.overflow = 'hidden';
  if (after) after();
}
function closeSheet() {
  const s = $('.sheet-bg');
  if (s) s.remove();
  document.body.style.overflow = '';
}

/* ---------- 仮押さえカウントダウン ---------- */
let cdTimer = null;
function startCountdown(el) {
  clearInterval(cdTimer);
  const exp = +el.dataset.exp;
  const tick = () => {
    const left = exp - Date.now();
    const v = $('#cd-v');
    if (!v) { clearInterval(cdTimer); return; }
    if (left <= 0) {
      clearInterval(cdTimer);
      sweepHolds();
      render();
      return;
    }
    const m = Math.floor(left / 60000), s = Math.floor((left % 60000) / 1000);
    v.textContent = `${m}:${String(s).padStart(2, '0')}`;
    el.classList.toggle('warn', left < 5 * 60000);
    el.classList.toggle('danger', left < 60000);
  };
  tick();
  cdTimer = setInterval(tick, 1000);
}

/* ---------- 起動 ---------- */
window.addEventListener('hashchange', () => {
  if (!location.hash.startsWith('#/checkout')) ui.checkoutStep = 1;
  render();
});
render();
