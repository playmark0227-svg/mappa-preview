import * as D from './data.js?v=3';
import { PREFS, BBOX, OKIBOX, project } from './japan.js?v=1';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const REGIONS = { すべて: null, 関東: ['13', '14', '12'], 東海: ['23'], 関西: ['27', '28', '26'] };

const ui = {
  role: 'adv',
  q: {
    region: 'すべて', types: ['SAMPLING'],
    start: D.ymd(D.addDays(D.TODAY, 21)), days: 14, qty: 1,
    budget: 300000, tags: [], category: 'スキンケア', fixture: false,
  },
  calMonth: null, sel: { start: null, end: null },
  facSlot: null, facMonth: null, facCalSlot: null, checkoutStep: 1,
  map: { date: null, cats: [], sel: null, region: '全国', vb: null },
};

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('on');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('on'), 2600);
}

const swatch = (f) => `hsl(${f.hue} 24% 42%)`;
const initials = (f) => f.name.slice(0, 2);
const go = (h) => { location.hash = h; };

function sweepHolds() {
  let ch = false;
  for (const b of D.state.bookings) {
    if (b.status === 'hold' && b.holdExpiresAt && Date.now() > b.holdExpiresAt) { b.status = 'expired'; ch = true; }
  }
  if (ch) D.save();
}

/* ================= シェル ================= */
const NAVS = {
  adv: [['#/', 'ホーム'], ['#/search', '枠検索'], ['#/map', '設置マップ'], ['#/bookings', '予約管理']],
  fac: [['#/f', '今日のタスク'], ['#/f/calendar', 'スケジュール']],
  ops: [['#/admin', 'ダッシュボード'], ['#/map', '設置マップ']],
};

function header(ctx = '') {
  const cur = location.hash || '#/';
  return `
  <header class="hd"><div class="hd-in">
    <a class="logo" href="#/">マッパ<small>MAPPA</small></a>
    <span class="envtag">DEMO</span>
    <div class="hd-right">
      <div class="roleswitch">
        <button data-role="adv" class="${ui.role === 'adv' ? 'on' : ''}">広告主</button>
        <button data-role="fac" class="${ui.role === 'fac' ? 'on' : ''}">施設</button>
        <button data-role="ops" class="${ui.role === 'ops' ? 'on' : ''}">運営</button>
      </div>
    </div>
  </div></header>
  <nav class="subnav"><div class="subnav-in">
    ${NAVS[ui.role].map(([h, l]) => `<a href="${h}" class="${cur === h || (h !== '#/' && cur.startsWith(h)) ? 'on' : ''}">${l}</a>`).join('')}
    <span class="fill"></span>
    <span class="ctx">${ctx}</span>
  </div></nav>`;
}

function footer() {
  return `<footer class="ft"><div class="in">
    <span>マッパ / 温浴施設プロモーション枠 予約管理</span>
    <span>データはこのブラウザにのみ保存 / 決済は発生しません</span>
    <a href="#" id="reset-demo">デモデータを初期化</a>
  </div></footer>`;
}

const STATUS = {
  hold: ['仮押さえ', 'tag-warn'], confirmed: ['確定', 'tag-ok'],
  cancelled: ['取消', 'tag-danger'], expired: ['期限切れ', 'tag-plain'],
};

/* ================= 共通パーツ ================= */
function heatStrip(slotId) {
  const cells = [];
  for (let w = 0; w < 13; w++) {
    let open = 0, blocked = 0, total = 0;
    for (let d = 0; d < 7; d++) {
      const ds = D.ymd(D.addDays(D.TODAY, w * 7 + d + 7));
      const i = D.dayInfo(slotId, ds);
      total++;
      if (i.capacity === 0) blocked++; else if (i.available > 0) open++;
    }
    const s = blocked > total / 2 ? 'blocked' : open >= 5 ? 'open' : open >= 2 ? 'low' : 'full';
    cells.push(`<i data-s="${s}" title="${D.fmtDate(D.ymd(D.addDays(D.TODAY, w * 7 + 7)))}の週"></i>`);
  }
  return `<span class="heat">${cells.join('')}</span>`;
}

function matchingSlots(f) {
  const q = ui.q;
  const end = D.ymd(D.addDays(D.parseYmd(q.start), q.days - 1));
  return f.slots
    .filter((s) => q.types.includes(s.type))
    .map((s) => ({
      slot: D.slotById(s.id),
      chk: D.checkRange(s.id, q.start, end, q.qty, q.category),
      quote: D.quote(s.id, q.start, end, q.qty, false),
    }));
}

const LEGEND = `<span class="legend">
  <span><i style="background:#3E8E6A"></i>空きあり</span>
  <span><i style="background:#D69B36"></i>残りわずか</span>
  <span><i style="background:#C3CBD0"></i>満枠</span>
  <span><i style="background:repeating-linear-gradient(45deg,#9BA5AB 0 2px,#C3CBD0 2px 4px)"></i>受入不可</span>
</span>`;

/* ================= ホーム（作業ダッシュボード） ================= */
function viewHome() {
  const q = ui.q;
  const bs = [...D.state.bookings].reverse();
  const confirmed = bs.filter((b) => b.status === 'confirmed');
  const holds = bs.filter((b) => b.status === 'hold');
  const unship = confirmed.filter((b) => !b.shipment);
  const dueSoon = unship.filter((b) => D.diffDays(D.TODAY, D.parseYmd(b.deliveryDue)) <= 7);

  return `
  <div class="wrap">
    <div class="page-head"><h1>ホーム</h1>
      <span class="sub">${D.fmtDateLong(D.ymd(D.TODAY))} 時点</span></div>

    <div class="panel">
      <div class="panel-hd">枠を検索</div>
      <div class="panel-bd">
        <div class="row row-wrap" style="align-items:flex-end">
          <div style="width:130px"><label class="f">エリア</label>
            <select class="inp" id="q-region">${Object.keys(REGIONS).map((k) => `<option ${q.region === k ? 'selected' : ''}>${k}</option>`).join('')}</select></div>
          <div style="width:150px"><label class="f">開始日</label>
            <input class="inp" type="date" id="q-start" value="${q.start}" min="${D.ymd(D.addDays(D.TODAY, 1))}"></div>
          <div style="width:110px"><label class="f">期間</label>
            <select class="inp" id="q-days">${[14, 21, 30, 60].map((d) => `<option value="${d}" ${q.days === d ? 'selected' : ''}>${d}日間</option>`).join('')}</select></div>
          <div style="width:150px"><label class="f">商材カテゴリ</label>
            <select class="inp" id="q-cat">${D.CATEGORIES.map((c) => `<option ${q.category === c ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
          <div><button class="btn" id="q-go">検索</button></div>
        </div>
      </div>
    </div>

    ${dueSoon.length ? `<div class="note note-warn" style="margin-top:10px">
      <span class="lb">要対応</span>着荷期限が7日以内の未発送が ${dueSoon.length}件 あります —
      ${dueSoon.map((b) => `${esc(D.slotById(b.slotId).facility.name)}（${D.fmtDate(b.deliveryDue)}まで）`).join(' / ')}
    </div>` : ''}
    ${holds.length ? `<div class="note note-info" style="margin-top:10px">
      <span class="lb">未決済</span>仮押さえ中の申込が ${holds.length}件 あります。${D.HOLD_MINUTES}分以内に決済しないと枠が開放されます。
      <a href="#/checkout/${holds[0].id}">手続きを続ける</a>
    </div>` : ''}

    <div class="grid2" style="margin-top:10px">
      <div class="panel">
        <div class="panel-hd">自社の予約<span class="count">${bs.length}件</span></div>
        <div class="panel-bd flush">
          ${bs.length ? `<div class="tablewrap"><table class="t">
            <thead><tr><th>予約番号</th><th>施設 / 枠</th><th>期間</th><th class="n">金額(税抜)</th><th>状態</th></tr></thead>
            <tbody>${bs.slice(0, 8).map((b) => {
              const s = D.slotById(b.slotId); const [l, c] = STATUS[b.status];
              return `<tr><td class="k">${b.no}</td>
                <td>${esc(s.facility.name)}<br><span class="tiny dim">${esc(s.name)}</span></td>
                <td class="k">${D.fmtDate(b.start)}〜${D.fmtDate(b.end)}</td>
                <td class="n">${D.yen(b.total.net)}</td>
                <td><span class="tag ${c}">${l}</span></td></tr>`;
            }).join('')}</tbody></table></div>`
            : '<div class="empty"><h3>予約はまだありません</h3><p>上の検索から枠を押さえてください。</p></div>'}
        </div>
      </div>

      <div class="panel">
        <div class="panel-hd">提携施設の空き状況<span class="count">今後13週</span></div>
        <div class="panel-bd flush">
          <div class="tablewrap"><table class="t rows">
            <thead><tr><th>施設</th><th>エリア</th><th class="n">消化</th><th>空き推移</th></tr></thead>
            <tbody>${D.FACILITIES.map((f) => `<tr data-fid="${f.id}">
              <td>${esc(f.name)}</td><td class="tiny dim">${f.prefName}</td>
              <td class="n">${f.avgConsumption}個/日</td>
              <td>${heatStrip(f.slots[0].id)}</td></tr>`).join('')}</tbody>
          </table></div>
        </div>
      </div>
    </div>
    <div style="margin-top:8px">${LEGEND}</div>
  </div>`;
}

/* ================= 枠検索 ================= */
function viewSearch() {
  const q = ui.q;
  const prefs = REGIONS[q.region];
  let list = D.FACILITIES.filter((f) => !prefs || prefs.includes(f.pref));
  if (q.tags.length) list = list.filter((f) => q.tags.some((t) => f.audienceTags.includes(t)));

  const rows = [];
  for (const f of list) {
    for (const m of matchingSlots(f)) {
      if (m.chk.ok && m.quote.net > q.budget) continue;
      rows.push({ f, ...m });
    }
  }
  rows.sort((a, b) => (a.chk.ok ? 0 : 1) - (b.chk.ok ? 0 : 1) || a.quote.net - b.quote.net);
  const okCount = rows.filter((r) => r.chk.ok).length;
  const end = D.ymd(D.addDays(D.parseYmd(q.start), q.days - 1));

  return `
  <div class="wrap">
    <div class="page-head"><h1>枠検索</h1>
      <span class="sub mono">${q.start} 〜 ${end}（${q.days}日）/ 数量 ${q.qty} / ${esc(q.category)}</span></div>

    <div class="searchlayout">
      <aside class="filters">
        <div class="panel">
          <div class="panel-hd">絞り込み</div>
          <div class="fgroup">
            <h4>期間</h4>
            <label class="f">開始日</label>
            <input class="inp" type="date" id="s-start" value="${q.start}" min="${D.ymd(D.addDays(D.TODAY, 1))}">
            <label class="f" style="margin-top:6px">日数</label>
            <select class="inp" id="s-days">${[14, 21, 30, 45, 60].map((d) => `<option value="${d}" ${q.days === d ? 'selected' : ''}>${d}日間</option>`).join('')}</select>
          </div>
          <div class="fgroup"><h4>エリア</h4>
            <div class="chips">${Object.keys(REGIONS).map((k) => `<button class="chip ${q.region === k ? 'on' : ''}" data-region="${k}">${k}</button>`).join('')}</div></div>
          <div class="fgroup"><h4>枠タイプ</h4>
            <div class="chips">${Object.values(D.SLOT_TYPES).map((t) => `<button class="chip ${q.types.includes(t.code) ? 'on' : ''}" data-type="${t.code}">${t.short}</button>`).join('')}</div></div>
          <div class="fgroup"><h4>商材カテゴリ</h4>
            <select class="inp" id="s-cat">${D.CATEGORIES.map((c) => `<option ${q.category === c ? 'selected' : ''}>${c}</option>`).join('')}</select>
            <p class="tiny dim" style="margin:5px 0 0">同カテゴリが設置中の枠を除外します</p></div>
          <div class="fgroup"><h4>予算上限（税抜）</h4>
            <input type="range" id="s-budget" min="50000" max="600000" step="10000" value="${q.budget}" style="width:100%">
            <div class="tiny mono">〜 ${D.yen(q.budget)}</div></div>
          <div class="fgroup"><h4>客層</h4>
            <div class="chips">${D.AUDIENCE_TAGS.map((t) => `<button class="chip ${q.tags.includes(t) ? 'on' : ''}" data-tag="${t}">${t}</button>`).join('')}</div></div>
        </div>
      </aside>

      <div class="panel">
        <div class="panel-hd">
          検索結果
          <span class="count">${rows.length}枠中 <b style="color:var(--ok)">${okCount}枠</b>が予約可能</span>
        </div>
        <div class="panel-bd flush">
          ${rows.length ? `<div class="tablewrap"><table class="t rows">
            <thead><tr>
              <th>施設</th><th>枠商品</th><th>客層</th>
              <th class="n">消化</th><th class="n">残</th><th>今後13週の空き</th>
              <th class="n">金額(税抜)</th><th class="w-act"></th>
            </tr></thead>
            <tbody>
            ${rows.map((r) => {
              const info = D.dayInfo(r.slot.id, q.start);
              const bad = !r.chk.ok;
              return `<tr data-fid="${r.f.id}" data-slot="${r.slot.id}" ${bad ? 'style="color:var(--ink-3)"' : ''}>
                <td><div class="row" style="gap:7px">
                  <span class="thumb" style="background:${swatch(r.f)}">${esc(initials(r.f))}</span>
                  <span><b style="color:var(--ink)">${esc(r.f.name)}</b><br>
                  <span class="tiny dim">${r.f.prefName}${r.f.city} / ${r.f.station}徒歩${r.f.walkMin}分</span></span>
                </div></td>
                <td>${esc(r.slot.name)}<br><span class="tiny dim">${D.SLOT_TYPES[r.slot.type].short} / ${r.slot.unitLabel}単位</span></td>
                <td class="tiny">月間${(r.f.monthlyVisitors / 10000).toFixed(1)}万人 / 女性${r.f.femaleRatio}%<br>
                  <span class="dim">${r.f.audienceTags.slice(0, 2).join('・')}</span></td>
                <td class="n">${r.f.avgConsumption}<span class="tiny dim">個/日</span></td>
                <td class="n">${bad ? '<span class="tag tag-danger">不可</span>' : `${info.available}/${info.capacity}`}</td>
                <td>${heatStrip(r.slot.id)}</td>
                <td class="n">${D.yen(r.quote.net)}</td>
                <td class="w-act">${bad
                  ? `<span class="tiny" title="${esc(r.chk.issues[0]?.msg || '')}">${esc((r.chk.issues[0]?.msg || '').slice(0, 22))}…</span>`
                  : '<button class="btn btn-sm">枠を見る</button>'}</td>
              </tr>`;
            }).join('')}
            </tbody></table></div>`
            : `<div class="empty"><h3>条件に合う枠がありません</h3>
               <p>期間を動かすか、予算上限を上げてください。</p>
               <button class="btn btn-ghost btn-sm" id="relax" style="margin-top:8px">条件をゆるめる</button></div>`}
        </div>
      </div>
    </div>
    <div class="row" style="margin-top:8px">${LEGEND}
      ${okCount === 0 && rows.length ? `<button class="btn btn-ghost btn-sm" id="shift7">開始日を1週間ずらす</button>` : ''}
    </div>
  </div>`;
}

/* ================= カレンダー ================= */
function calendarHTML(slotId, monthDate, sel) {
  const slot = D.slotById(slotId);
  const first = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const lastDay = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < first.getDay(); i++) cells.push('<div class="cell empty"></div>');
  for (let d = 1; d <= lastDay; d++) {
    const ds = D.ymd(new Date(monthDate.getFullYear(), monthDate.getMonth(), d));
    const i = D.dayInfo(slotId, ds);
    const inRange = sel.start && sel.end && ds >= sel.start && ds <= sel.end;
    const isSel = ds === sel.start || ds === sel.end;
    const label = i.status === 'blocked' ? '不可' : i.status === 'full' ? '満'
      : i.status === 'lead' || i.status === 'out' ? '−' : `残${i.available}`;
    cells.push(`<button class="cell ${isSel ? 'sel' : ''} ${inRange && !isSel ? 'inrange' : ''} ${i.mine ? 'mine' : ''}"
      data-s="${i.status}" data-date="${ds}" ${i.selectable ? '' : 'disabled'}
      aria-label="${D.fmtDateLong(ds)} ${label}"><span class="d">${d}</span><span class="s">${label}</span></button>`);
  }
  const prevOk = first > D.TODAY;
  const nextOk = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1) <= D.addDays(D.TODAY, D.HORIZON_DAYS);
  return `
  <div class="cal-hd">
    <b>${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}</b>
    <div class="cal-nav">
      <button id="cal-prev" ${prevOk ? '' : 'disabled'} aria-label="前月">◀</button>
      <button id="cal-next" ${nextOk ? '' : 'disabled'} aria-label="翌月">▶</button>
    </div>
  </div>
  <div class="cal-grid">
    ${D.WD.map((w, i) => `<div class="cal-wd ${i === 0 ? 'sun' : i === 6 ? 'sat' : ''}">${w}</div>`).join('')}
    ${cells.join('')}
  </div>
  <p class="tiny dim" style="margin:7px 0 0">
    最短開始 <b class="mono">${D.earliestStart(slot)}</b>（リード${slot.minLead}日+着荷${slot.facility.receivingBufferDays}日）/
    ${slot.minDays}〜${slot.maxDays}日 / 開始日→終了日の順にクリック
  </p>`;
}

/* ================= 施設詳細 ================= */
function viewFacility(id) {
  const f = D.facilityById(id);
  if (!f) return notFound();
  if (!ui.facSlot || D.slotById(ui.facSlot)?.facilityId !== id) ui.facSlot = f.slots[0].id;
  const slot = D.slotById(ui.facSlot);
  if (!ui.calMonth) ui.calMonth = new Date(D.parseYmd(ui.q.start).getFullYear(), D.parseYmd(ui.q.start).getMonth(), 1);
  if (!ui.sel.start) ui.sel = { start: ui.q.start, end: D.ymd(D.addDays(D.parseYmd(ui.q.start), ui.q.days - 1)) };
  const sel = ui.sel;
  const chk = sel.start && sel.end ? D.checkRange(slot.id, sel.start, sel.end, ui.q.qty, ui.q.category) : null;
  const qt = sel.start && sel.end ? D.quote(slot.id, sel.start, sel.end, ui.q.qty, ui.q.fixture) : null;
  const maxAge = Math.max(...Object.values(f.ageMix));

  return `
  <div class="wrap">
    <div class="crumb"><a href="#/search">枠検索</a> / ${esc(f.name)}</div>
    <div class="dlayout">
      <div>
        <div class="panel">
          <div class="panel-hd">
            <span class="thumb" style="background:${swatch(f)}">${esc(initials(f))}</span>
            ${esc(f.name)}
            ${f.verified ? `<span class="tag tag-ok">運営検証済 ${f.verified}</span>` : '<span class="tag tag-warn">施設申告値</span>'}
            <span class="count k">${f.id.toUpperCase()}</span>
          </div>
          <div class="panel-bd flush"><table class="t kv"><tbody>
            <tr><th>所在地</th><td>${f.prefName}${f.city} / ${f.station} 徒歩${f.walkMin}分</td></tr>
            <tr><th>営業</th><td>${f.hours}${f.holiday != null ? ` / 毎週${D.WD[f.holiday]}曜定休` : ' / 年中無休'}</td></tr>
            <tr><th>着荷猶予</th><td class="mono">${f.receivingBufferDays}日</td></tr>
            <tr><th>NG業種</th><td>${f.ngIndustries.join(' / ') || 'なし'}</td></tr>
            <tr><th>特記</th><td>${esc(f.blurb)}</td></tr>
          </tbody></table></div>
        </div>

        <div class="grid2" style="margin-top:10px">
          <div class="panel">
            <div class="panel-hd">客層データ<span class="count">${f.verified ? '運営検証値' : '施設申告値'}</span></div>
            <div class="panel-bd">
              <div class="row" style="gap:18px;margin-bottom:10px">
                <div><div class="tiny dim">月間来場者数</div><div class="mono" style="font-size:18px;font-weight:700">${f.monthlyVisitors.toLocaleString()}</div></div>
                <div><div class="tiny dim">平日 / 休日</div><div class="mono" style="font-size:18px;font-weight:700">${f.weekdayRatio} / ${100 - f.weekdayRatio}</div></div>
              </div>
              <div class="bar"><span class="tiny">女性</span><span class="track"><span class="fill alt" style="width:${f.femaleRatio}%"></span></span><span class="v">${f.femaleRatio}%</span></div>
              <div class="bar"><span class="tiny">男性</span><span class="track"><span class="fill" style="width:${100 - f.femaleRatio}%"></span></span><span class="v">${100 - f.femaleRatio}%</span></div>
              <div style="height:8px"></div>
              ${Object.entries(f.ageMix).map(([k, v]) => `<div class="bar"><span class="tiny">${k}</span><span class="track"><span class="fill" style="width:${(v / maxAge) * 100}%"></span></span><span class="v">${v}%</span></div>`).join('')}
              <div class="chips" style="margin-top:9px">${f.audienceTags.map((t) => `<span class="tag">${t}</span>`).join('')}</div>
            </div>
          </div>

          <div class="panel">
            <div class="panel-hd">実績<span class="count">${f.campaignCount}件</span></div>
            <div class="panel-bd">
              <div class="row" style="gap:18px;margin-bottom:8px">
                <div><div class="tiny dim">平均消化スピード</div><div class="mono" style="font-size:18px;font-weight:700">${f.avgConsumption} <span class="tiny">個/日</span></div></div>
                <div><div class="tiny dim">800個の想定消化日数</div><div class="mono" style="font-size:18px;font-weight:700">${Math.ceil(800 / f.avgConsumption)} <span class="tiny">日</span></div></div>
              </div>
              ${f.cases.length ? `<div class="tablewrap"><table class="t">
                <thead><tr><th>カテゴリ</th><th>時期/期間</th><th class="n">配布</th><th class="n">消化率</th><th class="n">個/日</th></tr></thead>
                <tbody>${f.cases.map((c) => `<tr><td>${c.cat}</td><td class="k">${c.period}</td>
                  <td class="n">${c.qty.toLocaleString()}</td><td class="n">${Math.round((c.consumed / c.qty) * 100)}%</td>
                  <td class="n"><b>${c.perDay}</b></td></tr>`).join('')}</tbody></table></div>`
                : '<p class="tiny dim">実施実績なし</p>'}
            </div>
          </div>
        </div>

        <div class="panel" style="margin-top:10px">
          <div class="panel-hd">現在設置中<span class="count">競合カテゴリの確認用 / ブランド名は非開示</span></div>
          <div class="panel-bd flush">
            ${(() => {
              const placed = D.placementsAt(f.id, D.ymd(D.TODAY));
              if (!placed.length) return '<div class="panel-bd"><p class="tiny dim" style="margin:0">なし</p></div>';
              return `<table class="t">
                <thead><tr><th>カテゴリ</th><th>設置場所</th><th>枠</th><th>終了予定</th><th>出稿</th></tr></thead>
                <tbody>${placed.map((c) => `<tr>
                  <td>${c.cat === ui.q.category ? `<span class="tag tag-danger">${c.cat}</span>` : `<span class="tag">${c.cat}</span>`}</td>
                  <td class="tiny">${D.zoneLabel(c.zone)}</td>
                  <td class="tiny">${esc(c.slotName)}</td>
                  <td class="k">${c.until}</td>
                  <td class="tiny">${c.own ? '<span class="tag tag-accent">自社</span>' : esc(c.advertiser)}</td></tr>`).join('')}</tbody></table>`;
            })()}
          </div>
        </div>

        <div class="panel" style="margin-top:10px">
          <div class="panel-hd">枠と料金<span class="count">税抜</span></div>
          <div class="panel-bd flush"><div class="tablewrap"><table class="t">
            <thead><tr><th>枠商品</th><th>タイプ</th><th>課金単位</th><th class="n">単価</th><th class="n">同時受入</th><th class="n">最小-最大</th><th class="n">リード</th></tr></thead>
            <tbody>${f.slots.map((s) => { const sl = D.slotById(s.id); return `<tr>
              <td><b>${esc(s.name)}</b></td><td class="tiny">${D.SLOT_TYPES[s.type].short}</td>
              <td class="k">${sl.unitLabel}</td><td class="n">${D.yen(s.price)}</td>
              <td class="n">${s.capacity}</td><td class="n">${sl.minDays}-${sl.maxDays}日</td><td class="n">${sl.minLead}日</td></tr>`; }).join('')}</tbody>
          </table></div></div>
        </div>

        <div class="panel" style="margin-top:10px">
          <div class="panel-hd">空き枠カレンダー</div>
          <div class="panel-bd">
            <div class="tabs">${f.slots.map((s) => `<button class="tab ${ui.facSlot === s.id ? 'on' : ''}" data-slot="${s.id}">${esc(s.name)}</button>`).join('')}</div>
            ${calendarHTML(slot.id, ui.calMonth, sel)}
          </div>
        </div>
      </div>

      <aside class="widget">
        <div class="panel">
          <div class="panel-hd">枠を押さえる</div>
          <div class="panel-bd">
            <label class="f">枠商品</label>
            <select class="inp" id="w-slot">${f.slots.map((s) => `<option value="${s.id}" ${ui.facSlot === s.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select>
            <label class="f" style="margin-top:8px">商材カテゴリ<span style="font-weight:400;color:var(--ink-3)">（排他判定）</span></label>
            <select class="inp" id="w-cat">${D.CATEGORIES.map((c) => `<option ${ui.q.category === c ? 'selected' : ''}>${c}</option>`).join('')}</select>
            <div class="row" style="margin-top:8px;gap:6px">
              <div style="flex:1"><label class="f">開始日</label><input class="inp" type="date" id="w-start" value="${sel.start || ''}"></div>
              <div style="width:74px"><label class="f">日数</label><input class="inp" type="number" id="w-days" min="${slot.minDays}" max="${slot.maxDays}" value="${chk ? chk.days : slot.minDays}"></div>
            </div>
            <label class="f" style="margin-top:8px">数量</label>
            <div class="row">
              <div class="stepper"><button id="w-minus" ${ui.q.qty <= 1 ? 'disabled' : ''}>−</button><span>${ui.q.qty}</span><button id="w-plus" ${ui.q.qty >= slot.capacity ? 'disabled' : ''}>＋</button></div>
              <span class="tiny dim">上限${slot.capacity} / 開始日の空き ${sel.start ? D.dayInfo(slot.id, sel.start).available : '−'}</span>
            </div>
            <label class="check" style="margin-top:9px">
              <input type="checkbox" id="w-fixture" ${ui.q.fixture ? 'checked' : ''}>運営レンタル什器（${D.yen(D.FIXTURE_FEE)}/件）</label>

            ${qt && chk && chk.ok ? `
              <div style="margin-top:10px;padding-top:9px;border-top:1px solid var(--line)">
                <div class="price-row"><span>枠料金 ${D.yen(slot.price)}×${qt.units}${qt.unitLabel}${ui.q.qty > 1 ? `×${ui.q.qty}` : ''}</span><span class="num">${D.yen(qt.slotFee)}</span></div>
                ${qt.fixtureFee ? `<div class="price-row"><span>什器費</span><span class="num">${D.yen(qt.fixtureFee)}</span></div>` : ''}
                <div class="price-row"><span class="muted">小計(税抜)</span><span class="num muted">${D.yen(qt.net)}</span></div>
                <div class="price-row"><span class="muted">消費税10%</span><span class="num muted">${D.yen(qt.tax)}</span></div>
                <div class="price-row total"><span>合計</span><span class="num">${D.yen(qt.gross)}</span></div>
              </div>
              <div class="note note-info" style="margin-top:9px">
                <span class="lb">着荷期限</span><b class="mono">${D.deliveryDue(slot, sel.start)}</b> まで / 現物は施設へ直送（元払い）
              </div>
              <button class="btn btn-lg" id="w-book" style="margin-top:9px">この枠を仮押さえ（${D.HOLD_MINUTES}分）</button>
            ` : `
              <div class="note note-warn" style="margin-top:10px">
                <span class="lb">予約不可</span>${chk ? chk.issues.map((i) => esc(i.msg)).join('<br>') : '期間を選択してください'}
              </div>
              ${chk ? `<button class="btn btn-ghost btn-lg" id="w-suggest" style="margin-top:8px">空いている最短日程を提案</button>` : ''}
            `}
          </div>
        </div>
      </aside>
    </div>
  </div>`;
}

/* ================= 申込・決済 ================= */
function viewCheckout(id) {
  const b = D.state.bookings.find((x) => x.id === id);
  if (!b) return notFound('該当する申込がありません');
  if (b.status === 'expired') {
    return `<div class="wrap wrap-narrow"><div class="panel"><div class="panel-hd">仮押さえ期限切れ</div>
      <div class="empty"><h3>枠を開放しました</h3><p>制限時間内に決済が完了しなかったため、枠を他社に開放しました。</p>
      <a class="btn btn-sm" href="#/facility/${b.facilityId}" style="margin-top:8px">同じ施設をもう一度見る</a></div></div></div>`;
  }
  if (b.status !== 'hold') return viewDone(id);
  const slot = D.slotById(b.slotId);
  const f = slot.facility;
  const step = ui.checkoutStep || 1;

  return `
  <div class="wrap wrap-narrow">
    <div class="page-head">
      <h1>申込 <span class="mono" style="font-size:13px;font-weight:400;color:var(--ink-2)">${b.no}</span></h1>
      <span class="fill" style="flex:1"></span>
      <span class="countdown" id="cd" data-exp="${b.holdExpiresAt}">仮押さえ残り <b id="cd-v">--:--</b></span>
    </div>
    <div class="panel"><div class="panel-bd"><div class="steps">
      <span class="st ${step > 1 ? 'done' : step === 1 ? 'on' : ''}"><i>${step > 1 ? '✓' : '1'}</i>内容確認</span><span class="sep"></span>
      <span class="st ${step > 2 ? 'done' : step === 2 ? 'on' : ''}"><i>${step > 2 ? '✓' : '2'}</i>出稿情報</span><span class="sep"></span>
      <span class="st ${step === 3 ? 'on' : ''}"><i>3</i>決済</span>
    </div></div></div>

    <div class="panel" style="margin-top:10px">
      <div class="panel-hd">${esc(f.name)}<span class="tag tag-accent">${esc(slot.name)}</span></div>
      <div class="panel-bd flush"><table class="t kv"><tbody>
        <tr><th>期間</th><td class="mono">${b.start} 〜 ${b.end}（${b.total.days}日）</td></tr>
        <tr><th>数量</th><td class="mono">${b.qty}</td></tr>
        <tr><th>商材カテゴリ</th><td>${esc(b.category)}</td></tr>
        <tr><th>着荷期限</th><td class="mono"><b>${b.deliveryDue}</b></td></tr>
        <tr><th>納品先</th><td>${f.prefName}${f.city}（詳細住所は確定後に開示）</td></tr>
      </tbody></table></div>
    </div>

    ${step === 1 ? `<div class="panel" style="margin-top:10px">
      <div class="panel-hd">料金</div>
      <div class="panel-bd">${priceTable(b)}
        <button class="btn btn-lg" id="ck-next" style="margin-top:12px">出稿情報の入力へ</button></div></div>` : ''}

    ${step === 2 ? `<div class="panel" style="margin-top:10px">
      <div class="panel-hd">出稿情報</div>
      <div class="panel-bd">
        <div class="grid2">
          <div><label class="f">商材名（必須）</label><input class="inp" id="ck-product" placeholder="うるおいクレンジングミルク" value="${esc(b.product || '')}"></div>
          <div><label class="f">配布個数（必須）</label><input class="inp" type="number" id="ck-qty" placeholder="800" value="${b.sampleQty || ''}"></div>
          <div><label class="f">発送予定日</label><input class="inp" type="date" id="ck-ship" value="${b.shipDate || D.ymd(D.addDays(D.parseYmd(b.deliveryDue), -3))}"></div>
          <div><label class="f">現場担当者（必須）</label><input class="inp" id="ck-name" placeholder="田中 太郎" value="${esc(b.contact || '')}"></div>
        </div>
        <div style="margin-top:8px"><label class="f">施設への申し送り</label>
          <textarea class="inp" id="ck-memo" rows="2" placeholder="直射日光を避けて設置してください">${esc(b.memo || '')}</textarea></div>
        <div class="note note-info" style="margin-top:9px">
          <span class="lb">参考</span>この施設の消化スピードは ${f.avgConsumption}個/日。${b.total.days}日で約 ${f.avgConsumption * b.total.days}個 が目安です。</div>
        <div class="row" style="margin-top:11px">
          <button class="btn btn-ghost" id="ck-back">戻る</button>
          <button class="btn" id="ck-next" style="flex:1">決済へ進む</button></div>
      </div></div>` : ''}

    ${step === 3 ? `<div class="panel" style="margin-top:10px">
      <div class="panel-hd">決済<span class="count">テスト環境 / 実際の決済は発生しません</span></div>
      <div class="panel-bd">
        ${priceTable(b)}
        <div style="margin-top:11px;border:1px solid var(--line);border-radius:var(--r-sm);padding:10px;background:var(--surface-2)">
          <div class="grid2">
            <div><label class="f">カード番号</label><input class="inp" value="4242 4242 4242 4242" readonly></div>
            <div class="row" style="gap:6px">
              <div style="flex:1"><label class="f">有効期限</label><input class="inp" value="12/30" readonly></div>
              <div style="flex:1"><label class="f">CVC</label><input class="inp" value="123" readonly></div>
            </div>
          </div>
        </div>
        <div class="note note-warn" style="margin-top:10px">
          <span class="lb">キャンセル規定</span>60日前まで100% / 59-31日前 70% / 30-15日前 50% / 14-8日前 30% / 7日前以降 0%</div>
        <label class="check" style="margin-top:10px"><input type="checkbox" id="ck-agree">キャンセル規定と利用規約に同意する</label>
        <div class="row" style="margin-top:11px">
          <button class="btn btn-ghost" id="ck-back">戻る</button>
          <button class="btn" id="ck-pay" style="flex:1" disabled>${D.yen(b.total.gross)} を決済して確定</button></div>
      </div></div>` : ''}
  </div>`;
}

function priceTable(b) {
  const t = b.total;
  return `
  <div class="price-row"><span>枠料金（${t.units}${t.unitLabel}${b.qty > 1 ? ` × ${b.qty}` : ''}）</span><span class="num">${D.yen(t.slotFee)}</span></div>
  ${t.fixtureFee ? `<div class="price-row"><span>運営レンタル什器</span><span class="num">${D.yen(t.fixtureFee)}</span></div>` : ''}
  <div class="price-row"><span class="muted">小計(税抜)</span><span class="num muted">${D.yen(t.net)}</span></div>
  <div class="price-row"><span class="muted">消費税10%</span><span class="num muted">${D.yen(t.tax)}</span></div>
  <div class="price-row total"><span>合計(税込)</span><span class="num">${D.yen(t.gross)}</span></div>`;
}

function viewDone(id) {
  const b = D.state.bookings.find((x) => x.id === id);
  if (!b) return notFound();
  const slot = D.slotById(b.slotId);
  const f = slot.facility;
  return `
  <div class="wrap wrap-narrow">
    <div class="note note-ok"><span class="lb">完了</span>予約が確定しました。予約番号 <b class="mono">${b.no}</b></div>
    <div class="note note-warn" style="margin-top:10px">
      <span class="lb">次の作業</span><b class="mono">${b.deliveryDue}</b> までに現物を施設へ発送してください（元払い）。</div>
    <div class="panel" style="margin-top:10px">
      <div class="panel-hd">申込内容</div>
      <div class="panel-bd flush"><table class="t kv"><tbody>
        <tr><th>施設 / 枠</th><td>${esc(f.name)} / ${esc(slot.name)}</td></tr>
        <tr><th>期間</th><td class="mono">${b.start} 〜 ${b.end}（${b.total.days}日）</td></tr>
        <tr><th>商材</th><td>${esc(b.product || '—')}（${esc(b.category)}）</td></tr>
        <tr><th>配布個数</th><td class="mono">${b.sampleQty ? b.sampleQty.toLocaleString() : '—'}</td></tr>
        <tr><th>担当者</th><td>${esc(b.contact || '—')}</td></tr>
        <tr><th>決済</th><td class="mono">${D.yen(b.total.gross)}（税込）/ カード</td></tr>
      </tbody></table></div>
    </div>
    <div class="row" style="margin-top:10px">
      <a class="btn btn-ghost" href="#/bookings">予約管理へ</a>
      <a class="btn" href="#/search">続けて枠を探す</a>
    </div>
  </div>`;
}

/* ================= 予約管理 ================= */
function viewBookings() {
  const list = [...D.state.bookings].reverse();
  return `
  <div class="wrap">
    <div class="page-head"><h1>予約管理</h1><span class="sub">${list.length}件</span></div>
    <div class="panel"><div class="panel-bd flush">
      ${list.length ? `<div class="tablewrap"><table class="t">
        <thead><tr><th>予約番号</th><th>施設 / 枠</th><th>期間</th><th class="n">数量</th><th>商材</th>
          <th class="n">金額(税抜)</th><th>着荷</th><th>状態</th><th class="w-act"></th></tr></thead>
        <tbody>${list.map((b) => {
          const s = D.slotById(b.slotId); const [l, c] = STATUS[b.status];
          const rp = b.status === 'confirmed' ? D.refundPreview(b) : null;
          return `<tr>
            <td class="k">${b.no}</td>
            <td>${esc(s.facility.name)}<br><span class="tiny dim">${esc(s.name)}</span></td>
            <td class="k">${b.start}<br>〜${b.end}</td>
            <td class="n">${b.qty}</td>
            <td class="tiny">${esc(b.product || '—')}<br><span class="dim">${esc(b.category)}</span></td>
            <td class="n">${D.yen(b.total.net)}</td>
            <td class="tiny">${b.status !== 'confirmed' ? '—'
              : b.shipment ? '<span class="tag tag-ok">受領済</span>'
              : `<span class="tag tag-warn">未着荷</span><br><span class="mono dim">${b.deliveryDue}</span>`}</td>
            <td><span class="tag ${c}">${l}</span>${b.status === 'cancelled' ? `<br><span class="tiny dim mono">返金${b.refundRate}% ${D.yen(b.refundAmount)}</span>` : ''}</td>
            <td class="w-act">${b.status === 'hold' ? `<a class="btn btn-sm" href="#/checkout/${b.id}">決済へ</a>`
              : b.status === 'confirmed' ? `<button class="btn btn-sm btn-ghost" data-cancel="${b.id}">取消（返金${rp.rate}%）</button>` : ''}</td>
          </tr>`;
        }).join('')}</tbody></table></div>`
        : '<div class="empty"><h3>予約はありません</h3><p>枠検索から押さえてください。</p></div>'}
    </div></div>
  </div>`;
}

/* ================= 施設側 ================= */
function myFacilityId() {
  const b = [...D.state.bookings].reverse().find((x) => x.status === 'confirmed' || x.status === 'hold');
  return b ? D.slotById(b.slotId).facilityId : 'f01';
}

function viewFacHome() {
  const f = D.facilityById(myFacilityId());
  const mine = D.state.bookings.filter((b) => D.slotById(b.slotId).facilityId === f.id && b.status === 'confirmed');
  const needShip = mine.filter((b) => !b.shipment);
  const needReport = mine.filter((b) => b.shipment && !b.report && D.ymd(D.TODAY) > b.end);
  const active = mine.filter((b) => D.ymd(D.TODAY) >= b.start && D.ymd(D.TODAY) <= b.end);

  return `
  <div class="fac-shell">
    <div class="page-head"><h1>今日のタスク</h1>
      <span class="sub">${esc(f.name)} / ${D.fmtDateLong(D.ymd(D.TODAY))}</span></div>

    <div class="stack">
      ${!needShip.length && !needReport.length
        ? '<div class="panel"><div class="empty"><h3>対応が必要な作業はありません</h3><p>受注が入るとここに表示されます。</p></div></div>' : ''}
      ${needShip.map((b) => `<button class="task" data-recv="${b.id}">
        <span class="lb">着荷待ち</span>
        <span class="tx"><b>荷物を受け取ったら押してください</b>
        <span>${esc(b.product || b.category)} / 着荷期限 ${b.deliveryDue}</span></span><span class="ar">▶</span></button>`).join('')}
      ${needReport.map((b) => `<button class="task" data-report="${b.id}" style="border-left-color:var(--ok)">
        <span class="lb" style="color:var(--ok)">報告待ち</span>
        <span class="tx"><b>実施結果を報告してください</b>
        <span>${esc(b.product || b.category)} / ${b.start}〜${b.end} / 所要3分</span></span><span class="ar">▶</span></button>`).join('')}
    </div>

    ${(() => {
      const placed = D.placementsAt(f.id, D.ymd(D.TODAY));
      const groups = D.ZONES.map((z) => ({ z, items: placed.filter((i) => i.zone === z.code) })).filter((g) => g.items.length);
      return `<div class="panel" style="margin-top:12px">
        <div class="panel-hd">館内に設置中<span class="count">${placed.length}件</span></div>
        <div class="panel-bd flush">
          ${groups.length ? groups.map((g) => `<div class="zone">
            <div class="zone-hd">${g.z.label}<span class="dim tiny">${g.items.length}件</span></div>
            <div class="zone-slot">${g.items.map((i) => `<div class="placed ${i.own ? 'own' : ''}">
              <span class="tag ${i.own ? 'tag-accent' : ''}">${esc(i.cat)}</span>
              <span class="tiny">${esc(i.slotName)}</span>
              <span class="tiny dim">${i.own ? '自社受注' : esc(i.advertiser)}</span>
              <span class="tiny dim mono" style="margin-left:auto">〜${i.until}</span></div>`).join('')}</div>
          </div>`).join('') : '<div class="panel-bd"><p class="tiny dim" style="margin:0">なし</p></div>'}
        </div>
      </div>`;
    })()}

    <a class="btn btn-lg" href="#/f/calendar" style="margin-top:12px">受入できない日を登録する</a>
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
    const label = info.past ? '−' : info.capacity === 0 ? '不可' : info.booked > 0 ? `予${info.booked}` : `空${info.available}`;
    const st = info.past ? 'out' : info.capacity === 0 ? 'blocked' : info.booked > 0 ? (info.available ? 'low' : 'full') : 'open';
    cells.push(`<button class="cell" data-s="${st}" data-fday="${ds}" ${info.past ? 'disabled' : ''}>
      <span class="d">${d}</span><span class="s">${label}</span></button>`);
  }
  const ovs = D.state.overrides.filter((o) => D.slotById(o.slotId).facilityId === f.id);

  return `
  <div class="fac-shell">
    <div class="page-head"><h1>スケジュール</h1><span class="sub">${esc(f.name)}</span></div>
    <div class="tabs">${f.slots.map((s) => `<button class="tab ${slotId === s.id ? 'on' : ''}" data-fslot="${s.id}">${esc(s.name)}</button>`).join('')}</div>

    <div class="panel"><div class="panel-bd">
      <div class="cal-hd">
        <b>${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}</b>
        <div class="cal-nav"><button id="fcal-prev" ${first > D.TODAY ? '' : 'disabled'}>◀</button><button id="fcal-next">▶</button></div>
      </div>
      <div class="cal-grid">
        ${D.WD.map((w, i) => `<div class="cal-wd ${i === 0 ? 'sun' : i === 6 ? 'sat' : ''}">${w}</div>`).join('')}
        ${cells.join('')}
      </div>
      <div class="legend" style="margin-top:7px">
        <span><i style="background:#E7F2EC"></i>空きあり</span>
        <span><i style="background:#FBF0DA"></i>予約あり</span>
        <span><i style="background:#E9EDEF"></i>満枠</span>
        <span><i style="background:repeating-linear-gradient(45deg,#DDE2E5 0 3px,#EDF0F2 3px 6px)"></i>受入不可</span>
      </div>
      <p class="tiny dim" style="margin:6px 0 0">日をクリックすると受入不可・台数変更ができます。予約が入っている日は変更できません。</p>
    </div></div>

    <button class="btn btn-lg btn-ghost" id="bulk" style="margin-top:10px">期間をまとめて設定</button>

    ${ovs.length ? `<div class="panel" style="margin-top:10px">
      <div class="panel-hd">登録済みの受入制限<span class="count">${ovs.length}件</span></div>
      <div class="panel-bd flush"><table class="t">
        <thead><tr><th>期間</th><th>枠</th><th>内容</th><th>理由</th><th class="w-act"></th></tr></thead>
        <tbody>${ovs.map((o) => `<tr>
          <td class="k">${o.from}${o.from !== o.to ? `<br>〜${o.to}` : ''}</td>
          <td class="tiny">${esc(D.slotById(o.slotId).name)}</td>
          <td>${o.capacity === 0 ? '<span class="tag tag-danger">受入不可</span>' : `<span class="tag tag-warn">${o.capacity}に制限</span>`}</td>
          <td class="tiny">${esc(o.reason)}</td>
          <td class="w-act"><button class="btn btn-sm btn-ghost" data-delov="${o.id}">取消</button></td></tr>`).join('')}</tbody>
      </table></div></div>` : ''}
  </div>`;
}

/* ================= 運営 ================= */
function viewAdmin() {
  const bs = D.state.bookings;
  const confirmed = bs.filter((b) => b.status === 'confirmed');
  const gmv = confirmed.reduce((a, b) => a + b.total.net, 0);
  const holds = bs.filter((b) => b.status === 'hold');
  const unship = confirmed.filter((b) => !b.shipment);
  const noVerify = D.FACILITIES.filter((f) => !f.verified);

  return `
  <div class="wrap">
    <div class="page-head"><h1>ダッシュボード</h1><span class="sub">全施設・全広告主</span></div>
    <div class="kpis">
      <div class="kpi"><div class="lbl">確定GMV(税抜)</div><div class="val">${D.yen(gmv)}</div><div class="sub">運営取分 ${D.yen(gmv * 0.3)}</div></div>
      <div class="kpi"><div class="lbl">確定予約</div><div class="val">${confirmed.length}</div><div class="sub">件</div></div>
      <div class="kpi"><div class="lbl">仮押さえ中</div><div class="val" style="color:var(--warn)">${holds.length}</div><div class="sub">${D.HOLD_MINUTES}分で開放</div></div>
      <div class="kpi"><div class="lbl">未着荷</div><div class="val" style="color:${unship.length ? 'var(--danger)' : 'var(--ok)'}">${unship.length}</div><div class="sub">要フォロー</div></div>
      <div class="kpi"><div class="lbl">客層未検証</div><div class="val" style="color:${noVerify.length ? 'var(--warn)' : 'var(--ok)'}">${noVerify.length}</div><div class="sub">/ ${D.FACILITIES.length}施設</div></div>
    </div>

    ${unship.length ? `<div class="note note-danger" style="margin-bottom:10px">
      <span class="lb">要対応</span>未着荷 ${unship.length}件 —
      ${unship.map((b) => `${esc(D.slotById(b.slotId).facility.name)}（${b.deliveryDue}まで）`).join(' / ')}</div>` : ''}

    <div class="panel">
      <div class="panel-hd">予約横断一覧<span class="count">${bs.length}件</span></div>
      <div class="panel-bd flush">
        ${bs.length ? `<div class="tablewrap"><table class="t">
          <thead><tr><th>予約番号</th><th>施設</th><th>枠</th><th>期間</th><th>商材</th>
            <th class="n">金額(税抜)</th><th class="n">運営取分</th><th>状態</th></tr></thead>
          <tbody>${[...bs].reverse().map((b) => {
            const s = D.slotById(b.slotId); const [l, c] = STATUS[b.status];
            return `<tr><td class="k">${b.no}</td><td>${esc(s.facility.name)}</td>
              <td class="tiny">${esc(s.name)}</td><td class="k">${b.start}〜${b.end}</td>
              <td class="tiny">${esc(b.category)}</td><td class="n">${D.yen(b.total.net)}</td>
              <td class="n dim">${D.yen(b.total.net * 0.3)}</td>
              <td><span class="tag ${c}">${l}</span></td></tr>`;
          }).join('')}</tbody></table></div>`
          : '<div class="empty"><h3>予約はありません</h3><p>広告主に切り替えて申し込むとここに出ます。</p></div>'}
      </div>
    </div>

    <div class="panel" style="margin-top:10px">
      <div class="panel-hd">提携施設マスタ<span class="count">${D.FACILITIES.length}施設 / ${D.ALL_SLOTS.length}枠</span></div>
      <div class="panel-bd flush"><div class="tablewrap"><table class="t rows">
        <thead><tr><th>施設</th><th>エリア</th><th class="n">枠数</th><th class="n">月間来場</th>
          <th class="n">消化</th><th class="n">実施</th><th>客層データ</th><th>直近13週の空き</th></tr></thead>
        <tbody>${D.FACILITIES.map((f) => `<tr data-fid="${f.id}">
          <td><b>${esc(f.name)}</b><br><span class="tiny dim k">${f.id.toUpperCase()}</span></td>
          <td class="tiny">${f.prefName}</td><td class="n">${f.slots.length}</td>
          <td class="n">${f.monthlyVisitors.toLocaleString()}</td><td class="n">${f.avgConsumption}</td>
          <td class="n">${f.campaignCount}</td>
          <td>${f.verified ? `<span class="tag tag-ok">検証済 ${f.verified}</span>` : '<span class="tag tag-warn">申告のみ</span>'}</td>
          <td>${heatStrip(f.slots[0].id)}</td></tr>`).join('')}</tbody>
      </table></div></div>
    </div>
  </div>`;
}

function notFound(msg = 'ページが見つかりません') {
  return `<div class="wrap wrap-narrow"><div class="panel"><div class="empty">
    <h3>${esc(msg)}</h3><a class="btn btn-sm" href="#/" style="margin-top:8px">ホームへ</a></div></div></div>`;
}


/* ================= 設置マップ ================= */
const REGION_IDS = {
  全国: null,
  関東: ['f01', 'f02', 'f03', 'f06'],
  東海: ['f05'],
  関西: ['f04', 'f07', 'f08'],
};

const MAP_AR = 1.35;                     // 地図パネルの縦横比

function fitAR(x, y, w, h) {
  if (w / h < MAP_AR) { const nw = h * MAP_AR; x -= (nw - w) / 2; w = nw; }
  else { const nh = w / MAP_AR; y -= (nh - h) / 2; h = nh; }
  return { x, y, w, h };
}

function regionVB(name) {
  const ids = REGION_IDS[name];
  if (!ids) {
    const p = 240;
    return fitAR(BBOX.x - p, BBOX.y - p, BBOX.w + p * 2, BBOX.h + p * 2);
  }
  const pts = ids.map((id) => { const f = D.facilityById(id); return project(f.lng, f.lat); });
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const spanX = Math.max(...xs) - Math.min(...xs);
  const pad = Math.max(360, spanX * 0.6);
  return fitAR(Math.min(...xs) - pad, Math.min(...ys) - pad, spanX + pad * 2,
    (Math.max(...ys) - Math.min(...ys)) + pad * 2);
}

const FILL_BY_COUNT = ['#FFFFFF', '#C3D9DD', '#79ADB6', '#15616F'];
const MAP_REF_W = 860;                   // マーカーの画面サイズを決める基準 viewBox 幅
const MAP_MIN_W = 120;                   // 最大ズーム（経度0.3度 ≒ 27km幅）
const mapMaxW = () => regionVB('全国').w * 1.2;

function viewMap() {
  const m = ui.map;
  if (!m.date) m.date = D.ymd(D.TODAY);
  if (!m.vb) m.vb = regionVB(m.region);
  const vb = m.vb;
  const u = vb.w / 860;                  // 画面1pxあたりの地図単位（マーカーを一定サイズに保つ）
  const summary = D.placementSummary(m.date);
  const shown = m.cats.length
    ? summary.filter((x) => x.cats.some((c) => m.cats.includes(c)))
    : summary;
  const shownIds = new Set(shown.map((x) => x.f.id));
  const sel = m.sel ? summary.find((x) => x.f.id === m.sel) : null;
  const totalItems = summary.reduce((a, x) => a + x.items.length, 0);

  const k0 = vb.w / MAP_REF_W;           // マーカーを画面上で一定サイズに保つための倍率
  const markers = summary.map((x) => {
    const [cx, cy] = project(x.f.lng, x.f.lat);
    const n = Math.min(3, x.items.length);
    const hit = m.cats.length && x.cats.some((c) => m.cats.includes(c));
    const dimmed = m.cats.length && !shownIds.has(x.f.id);
    const isSel = m.sel === x.f.id;
    return `<g class="mk ${dimmed ? 'off' : ''}" data-mapfid="${x.f.id}" data-scale data-cx="${cx}" data-cy="${cy}"
      transform="translate(${cx},${cy}) scale(${k0})">
      ${isSel ? '<rect x="-14" y="-14" width="28" height="28" fill="none" stroke="#15616F" stroke-width="2"/>' : ''}
      <rect x="-9" y="-9" width="18" height="18"
        fill="${FILL_BY_COUNT[n]}" stroke="${hit ? '#A93A2C' : '#1A2227'}" stroke-width="${hit ? 2.4 : 1.2}"/>
      <text x="0" y="4" text-anchor="middle" font-size="11"
        font-family="ui-monospace,monospace" font-weight="700"
        fill="${n >= 2 ? '#fff' : '#1A2227'}">${x.items.length}</text>
      <text class="mk-label" x="0" y="23" text-anchor="middle" font-size="11"
        fill="#1A2227" style="paint-order:stroke" stroke="#fff" stroke-width="3">${esc(x.f.name)}</text>
    </g>`;
  }).join('');

  return `
  <div class="wrap">
    <div class="page-head"><h1>設置マップ</h1>
      <span class="sub">基準日時点で、どの施設のどこに何が設置されているかを表示します</span></div>

    <div class="panel">
      <div class="panel-bd">
        <div class="row row-wrap" style="align-items:flex-end">
          <div style="width:150px"><label class="f">基準日</label>
            <input class="inp" type="date" id="mp-date" value="${m.date}"></div>
          <div><label class="f">表示範囲</label>
            <div class="chips">${Object.keys(REGION_IDS).map((k) => `<button class="chip ${m.region === k ? 'on' : ''}" data-mapregion="${k}">${k}</button>`).join('')}</div></div>
          <div style="flex:1;min-width:260px"><label class="f">カテゴリで絞り込み（設置中のものを強調）</label>
            <div class="chips">${D.CATEGORIES.map((c) => `<button class="chip ${m.cats.includes(c) ? 'on' : ''}" data-mapcat="${c}">${c}</button>`).join('')}
              ${m.cats.length ? '<button class="chip" id="mp-clear">解除</button>' : ''}</div></div>
        </div>
      </div>
    </div>

    <div class="maplayout" style="margin-top:10px">
      <div class="panel">
        <div class="panel-hd">全国の設置状況
          <span class="count">${m.date} 時点 / ${summary.filter((x) => x.items.length).length}施設に ${totalItems}件</span></div>
        <div class="panel-bd" style="padding:0;position:relative">
          <svg class="mapsvg" viewBox="${vb.x} ${vb.y} ${vb.w} ${vb.h}" tabindex="0"
            role="img" aria-label="提携施設の設置状況マップ。ピンチまたはホイールで拡大縮小、ドラッグで移動できます。">
            <rect class="map-bg" x="${vb.x}" y="${vb.y}" width="${vb.w}" height="${vb.h}" fill="#E7EDF0"/>
            <g>${PREFS.map((p) => `<path d="${p.d}" fill="#F7F9FA" stroke="#BFC7CC" stroke-width="1" vector-effect="non-scaling-stroke"/>`).join('')}</g>
            <rect x="${OKIBOX.x}" y="${OKIBOX.y}" width="${OKIBOX.w}" height="${OKIBOX.h}"
              fill="none" stroke="#9BA5AB" stroke-width="1" vector-effect="non-scaling-stroke" stroke-dasharray="4 3"/>
            <g data-scale data-cx="${OKIBOX.x + OKIBOX.w / 2}" data-cy="${OKIBOX.y - 6}"
               transform="translate(${OKIBOX.x + OKIBOX.w / 2},${OKIBOX.y - 6}) scale(${k0})">
              <text text-anchor="middle" font-size="10" fill="#838E95">沖縄県（位置は模式）</text>
            </g>
            <g>${markers}</g>
          </svg>
          <div class="mapzoom">
            <button id="mz-in" title="拡大（＋キー）" aria-label="拡大">＋</button>
            <button id="mz-out" title="縮小（−キー）" aria-label="縮小">−</button>
            <button id="mz-fit" title="表示範囲に戻す（0キー）" aria-label="表示範囲に戻す">⟲</button>
          </div>
          <div class="maphint">ピンチ / ホイールで拡大縮小・ドラッグで移動</div>
          <div class="maplegend">
            <span class="legend">
              <span>設置件数</span>
              ${FILL_BY_COUNT.map((c, i) => `<span><i style="background:${c};border-color:#1A2227"></i>${i === 3 ? '3+' : i}</span>`).join('')}
              <span><i style="background:#fff;border:2px solid #A93A2C"></i>絞り込み中のカテゴリあり</span>
            </span>
          </div>
        </div>
      </div>

      <div>
        ${sel ? facilityZonePanel(sel, m.date) : `
          <div class="panel"><div class="panel-hd">施設を選択してください</div>
            <div class="panel-bd"><p class="tiny dim" style="margin:0">
              地図のマーカーか下の一覧をクリックすると、その施設の館内どこに何が置かれているかを表示します。</p></div></div>`}

        <div class="panel" style="margin-top:10px">
          <div class="panel-hd">施設一覧<span class="count">${shown.length}件</span></div>
          <div class="panel-bd flush"><div class="tablewrap"><table class="t rows">
            <thead><tr><th>施設</th><th class="n">設置</th><th class="n">空き枠</th></tr></thead>
            <tbody>${shown.map((x) => `<tr data-mapfid="${x.f.id}" ${m.sel === x.f.id ? 'style="background:var(--accent-soft)"' : ''}>
              <td><b>${esc(x.f.name)}</b><br><span class="tiny dim">${x.f.prefName}${x.f.city}</span></td>
              <td class="n">${x.items.length}</td>
              <td class="n">${x.openSlots}/${x.f.slots.length}</td></tr>`).join('')}</tbody>
          </table></div></div>
        </div>
      </div>
    </div>

    <div class="panel" style="margin-top:10px">
      <div class="panel-hd">施設 × カテゴリ 設置マトリクス<span class="count">${m.date} 時点</span></div>
      <div class="panel-bd flush"><div class="tablewrap"><table class="t">
        <thead><tr><th>施設</th>${D.CATEGORIES.map((c) => `<th class="n" style="writing-mode:horizontal-tb;font-size:10.5px">${c}</th>`).join('')}<th class="n">空き枠</th></tr></thead>
        <tbody>${summary.map((x) => `<tr data-mapfid="${x.f.id}" style="cursor:pointer">
          <td><b>${esc(x.f.name)}</b> <span class="tiny dim">${x.f.prefName}</span></td>
          ${D.CATEGORIES.map((c) => {
            const it = x.items.filter((i) => i.cat === c);
            if (!it.length) return '<td class="n dim">·</td>';
            const own = it.some((i) => i.own);
            return `<td class="n" title="${esc(it.map((i) => `${i.slotName} / ${i.until}まで`).join(' , '))}">
              <span class="mx ${own ? 'own' : ''}">${it.length}</span></td>`;
          }).join('')}
          <td class="n">${x.openSlots}/${x.f.slots.length}</td></tr>`).join('')}</tbody>
      </table></div></div>
    </div>
    <div class="row" style="margin-top:8px">
      <span class="legend"><span><span class="mx">n</span>他社の設置</span><span><span class="mx own">n</span>自社の予約</span>
      <span>・= 設置なし / セルにカーソルを合わせると枠と終了日が出ます</span></span>
    </div>
  </div>`;
}

function facilityZonePanel(x, date) {
  const f = x.f;
  const byZone = D.ZONES.map((z) => ({
    z,
    slots: f.slots.filter((s) => D.zoneOf(s.name) === z.code),
    items: x.items.filter((i) => i.zone === z.code),
  })).filter((g) => g.slots.length || g.items.length);

  return `
  <div class="panel">
    <div class="panel-hd">
      <span class="thumb" style="background:hsl(${f.hue} 24% 42%)">${esc(f.name.slice(0, 2))}</span>
      ${esc(f.name)}<span class="count">館内配置 / ${date}</span>
    </div>
    <div class="panel-bd flush">
      ${byZone.map((g) => `
        <div class="zone">
          <div class="zone-hd">${g.z.label}<span class="dim tiny">枠 ${g.slots.length}</span></div>
          ${g.slots.map((s) => {
            const its = g.items.filter((i) => i.slotId === s.id);
            const info = D.dayInfo(s.id, date);
            return `<div class="zone-slot">
              <div class="spread" style="align-items:flex-start">
                <div><b class="tiny">${esc(s.name)}</b>
                  <div class="tiny dim">${D.SLOT_TYPES[s.type].short} / 同時受入 ${s.capacity}</div></div>
                <span class="tag ${info.capacity === 0 ? 'tag-danger' : info.available ? 'tag-ok' : 'tag-plain'}">
                  ${info.capacity === 0 ? '受入不可' : info.available ? `空き${info.available}` : '満枠'}</span>
              </div>
              ${its.length ? its.map((i) => `<div class="placed ${i.own ? 'own' : ''}">
                  <span class="tag ${i.own ? 'tag-accent' : ''}">${esc(i.cat)}</span>
                  <span class="tiny">${i.own ? esc(i.product || '自社出稿') : '他社'}</span>
                  <span class="tiny dim mono" style="margin-left:auto">〜${i.until}</span>
                </div>`).join('')
                : '<div class="tiny dim" style="padding:2px 0 0">設置なし</div>'}
            </div>`;
          }).join('')}
        </div>`).join('')}
    </div>
    <div class="panel-bd" style="border-top:1px solid var(--line)">
      <a class="btn btn-sm" href="#/facility/${f.id}">この施設の枠を見る</a>
    </div>
  </div>`;
}


/* ---------- 地図のピンチ・ホイール・ドラッグ操作 ---------- */
function attachMapZoom() {
  const svg = $('.mapsvg');
  if (!svg) return;
  let vb = { ...ui.map.vb };
  const scaled = $$('[data-scale]', svg);
  const bg = $('.map-bg', svg);

  const apply = () => {
    svg.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
    const k = vb.w / MAP_REF_W;
    for (const g of scaled) {
      g.setAttribute('transform', `translate(${g.dataset.cx},${g.dataset.cy}) scale(${k})`);
    }
    if (bg) {
      bg.setAttribute('x', vb.x); bg.setAttribute('y', vb.y);
      bg.setAttribute('width', vb.w); bg.setAttribute('height', vb.h);
    }
    const showLabels = vb.w < 3200;
    $$('.mk-label', svg).forEach((t) => { t.style.display = showLabels ? '' : 'none'; });
    ui.map.vb = { ...vb };
  };

  // 全体像から離れすぎないように寄せる
  const clamp = () => {
    const full = regionVB('全国');
    const maxW = mapMaxW();
    if (vb.w > maxW) { const f = maxW / vb.w; vb.w *= f; vb.h *= f; }
    const cx = vb.x + vb.w / 2, cy = vb.y + vb.h / 2;
    const minX = full.x, maxX = full.x + full.w;
    const minY = full.y, maxY = full.y + full.h;
    if (cx < minX) vb.x += minX - cx;
    if (cx > maxX) vb.x += maxX - cx;
    if (cy < minY) vb.y += minY - cy;
    if (cy > maxY) vb.y += maxY - cy;
  };

  const toSvg = (clientX, clientY) => {
    const r = svg.getBoundingClientRect();
    return [vb.x + ((clientX - r.left) / r.width) * vb.w,
            vb.y + ((clientY - r.top) / r.height) * vb.h];
  };
  const perPx = () => vb.w / (svg.getBoundingClientRect().width || 1);

  const markCustom = () => {
    ui.map.region = null;
    $$('[data-mapregion]').forEach((b) => b.classList.remove('on'));
  };

  const zoomAt = (clientX, clientY, factor) => {
    const target = Math.min(mapMaxW(), Math.max(MAP_MIN_W, vb.w * factor));
    const f = target / vb.w;
    if (f === 1) return;
    const [px, py] = toSvg(clientX, clientY);
    vb = { x: px - (px - vb.x) * f, y: py - (py - vb.y) * f, w: vb.w * f, h: vb.h * f };
    clamp(); apply(); markCustom();
  };

  // --- ホイール / トラックパッドのピンチ ---
  svg.addEventListener('wheel', (e) => {
    e.preventDefault();
    // ctrlKey が立つのはトラックパッドのピンチ。感度を上げる
    const f = Math.exp(e.deltaY * (e.ctrlKey ? 0.012 : 0.0022));
    zoomAt(e.clientX, e.clientY, f);
  }, { passive: false });

  // --- ポインタ（1本=移動 / 2本=ピンチ） ---
  const pts = new Map();
  let pinch = null, moved = 0;

  svg.addEventListener('pointerdown', (e) => {
    svg.setPointerCapture(e.pointerId);
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    moved = 0;
    svg.dataset.drag = '0';
    if (pts.size === 2) {
      const [a, b] = [...pts.values()];
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
    }
  });

  svg.addEventListener('pointermove', (e) => {
    if (!pts.has(e.pointerId)) return;
    const prev = pts.get(e.pointerId);
    const dx = e.clientX - prev.x, dy = e.clientY - prev.y;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    moved += Math.abs(dx) + Math.abs(dy);
    if (moved > 5) svg.dataset.drag = '1';

    if (pts.size >= 2) {
      const [a, b] = [...pts.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
      if (pinch && d > 0) {
        // 指の間隔が広がる = 拡大 = viewBox を狭める
        zoomAt(cx, cy, pinch.d / d);
        // 2本指の移動ぶんパンする
        const k = perPx();
        vb.x -= (cx - pinch.cx) * k; vb.y -= (cy - pinch.cy) * k;
        clamp(); apply();
      }
      pinch = { d, cx, cy };
      return;
    }
    // 1本指 / マウスドラッグ = パン
    const k = perPx();
    vb.x -= dx * k; vb.y -= dy * k;
    clamp(); apply();
  });

  const release = (e) => {
    pts.delete(e.pointerId);
    if (pts.size < 2) pinch = null;
    if (pts.size === 0) setTimeout(() => { svg.dataset.drag = '0'; }, 0);
  };
  svg.addEventListener('pointerup', release);
  svg.addEventListener('pointercancel', release);
  svg.addEventListener('pointerleave', release);

  // --- ボタン / キーボード ---
  const centerZoom = (f) => {
    const r = svg.getBoundingClientRect();
    zoomAt(r.left + r.width / 2, r.top + r.height / 2, f);
  };
  $('#mz-in').addEventListener('click', () => centerZoom(1 / 1.5));
  $('#mz-out').addEventListener('click', () => centerZoom(1.5));
  $('#mz-fit').addEventListener('click', () => {
    ui.map.region = ui.map.region || '全国';
    ui.map.vb = regionVB(ui.map.region);
    render();
  });
  svg.addEventListener('keydown', (e) => {
    const step = vb.w * 0.15;
    if (e.key === '+' || e.key === '=') { centerZoom(1 / 1.5); e.preventDefault(); }
    else if (e.key === '-' || e.key === '_') { centerZoom(1.5); e.preventDefault(); }
    else if (e.key === '0') { ui.map.vb = regionVB(ui.map.region || '全国'); render(); e.preventDefault(); }
    else if (e.key === 'ArrowLeft') { vb.x -= step; clamp(); apply(); e.preventDefault(); }
    else if (e.key === 'ArrowRight') { vb.x += step; clamp(); apply(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { vb.y -= step; clamp(); apply(); e.preventDefault(); }
    else if (e.key === 'ArrowDown') { vb.y += step; clamp(); apply(); e.preventDefault(); }
  });

  apply();
}

/* ================= ルーター ================= */
function render() {
  sweepHolds();
  const hash = location.hash || '#/';
  const path = hash.split('/').slice(1).filter(Boolean);
  let body, ctx = '';

  if (hash === '#/' || hash === '#') { ui.role = 'adv'; body = viewHome(); }
  else if (path[0] === 'search') { ui.role = 'adv'; body = viewSearch(); ctx = `${ui.q.start} +${ui.q.days}d`; }
  else if (path[0] === 'facility') { ui.role = 'adv'; body = viewFacility(path[1]); }
  else if (path[0] === 'checkout') { ui.role = 'adv'; body = viewCheckout(path[1]); }
  else if (path[0] === 'done') { ui.role = 'adv'; body = viewDone(path[1]); }
  else if (path[0] === 'bookings') { ui.role = 'adv'; body = viewBookings(); }
  else if (path[0] === 'map') { if (ui.role !== 'ops') ui.role = 'adv'; body = viewMap(); ctx = ui.map.date || ''; }
  else if (path[0] === 'f' && path[1] === 'calendar') { ui.role = 'fac'; body = viewFacCalendar(); }
  else if (path[0] === 'f') { ui.role = 'fac'; body = viewFacHome(); }
  else if (path[0] === 'admin') { ui.role = 'ops'; body = viewAdmin(); }
  else body = notFound();

  $('#app').innerHTML = header(ctx) + body + footer();
  window.scrollTo(0, 0);
  bind();
}

/* ================= イベント ================= */
function bind() {
  $$('.roleswitch button').forEach((b) => b.addEventListener('click', () => {
    const r = b.dataset.role;
    go(r === 'adv' ? '#/' : r === 'fac' ? '#/f' : '#/admin');
  }));
  const rs = $('#reset-demo');
  if (rs) rs.addEventListener('click', (e) => {
    e.preventDefault();
    if (confirm('登録した予約と受入制限をすべて削除して初期状態に戻します。よろしいですか？')) {
      D.resetAll(); toast('初期化しました'); render();
    }
  });

  // ホームのクイック検索
  const qgo = $('#q-go');
  if (qgo) qgo.addEventListener('click', () => {
    ui.q.region = $('#q-region').value;
    ui.q.start = $('#q-start').value;
    ui.q.days = +$('#q-days').value;
    ui.q.category = $('#q-cat').value;
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
  if (relax) relax.addEventListener('click', () => { ui.q.region = 'すべて'; ui.q.tags = []; ui.q.budget = 600000; render(); toast('条件をゆるめました'); });
  const sh7 = $('#shift7');
  if (sh7) sh7.addEventListener('click', () => {
    ui.q.start = D.ymd(D.addDays(D.parseYmd(ui.q.start), 7)); ui.sel = { start: null, end: null }; render();
    toast('開始日を1週間ずらしました');
  });

  // 設置マップ
  const mpDate = $('#mp-date');
  if (mpDate) mpDate.addEventListener('change', () => { ui.map.date = mpDate.value; render(); });
  $$('[data-mapregion]').forEach((b) => b.addEventListener('click', () => {
    ui.map.region = b.dataset.mapregion; ui.map.vb = regionVB(ui.map.region); render();
  }));
  $$('[data-mapcat]').forEach((b) => b.addEventListener('click', () => {
    const c = b.dataset.mapcat;
    ui.map.cats = ui.map.cats.includes(c) ? ui.map.cats.filter((x) => x !== c) : [...ui.map.cats, c];
    render();
  }));
  const mpClear = $('#mp-clear');
  if (mpClear) mpClear.addEventListener('click', () => { ui.map.cats = []; render(); });
  attachMapZoom();
  $$('[data-mapfid]').forEach((el) => el.addEventListener('click', (e) => {
    e.stopPropagation();
    // 地図をドラッグしただけのときは選択しない
    if (el.ownerSVGElement && el.ownerSVGElement.dataset.drag === '1') return;
    const id = el.dataset.mapfid;
    ui.map.sel = ui.map.sel === id ? null : id;
    render();
  }));

  // 施設行クリック（検索結果 / ホーム / 運営マスタ）
  $$('tr[data-fid]').forEach((tr) => tr.addEventListener('click', () => {
    ui.sel = { start: null, end: null }; ui.calMonth = null;
    ui.facSlot = tr.dataset.slot || null;
    go('#/facility/' + tr.dataset.fid);
  }));

  // 施設詳細
  $$('.tab[data-slot]').forEach((b) => b.addEventListener('click', (e) => {
    e.stopPropagation(); ui.facSlot = b.dataset.slot; ui.q.qty = 1; render();
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
      toast(`終了日をクリック（最短 ${D.ymd(D.addDays(D.parseYmd(ds), slot.minDays - 1))}）`);
    } else ui.sel.end = ds;
    render();
  }));

  const sug = $('#w-suggest');
  if (sug) sug.addEventListener('click', () => {
    const slot = D.slotById(ui.facSlot);
    const days = ui.sel.start && ui.sel.end ? D.diffDays(D.parseYmd(ui.sel.start), D.parseYmd(ui.sel.end)) + 1 : slot.minDays;
    const r = D.nextAvailable(slot.id, Math.max(days, slot.minDays), ui.q.qty, null, ui.q.category);
    if (!r) { toast('180日先までに空きがありません'); return; }
    ui.sel = r;
    ui.calMonth = new Date(D.parseYmd(r.start).getFullYear(), D.parseYmd(r.start).getMonth(), 1);
    render(); toast(`${r.start}〜${r.end} を選択しました`);
  });

  const book = $('#w-book');
  if (book) book.addEventListener('click', () => {
    const slot = D.slotById(ui.facSlot);
    const chk = D.checkRange(slot.id, ui.sel.start, ui.sel.end, ui.q.qty, ui.q.category);
    if (!chk.ok) { toast(chk.issues[0].msg); return; }
    const t = D.quote(slot.id, ui.sel.start, ui.sel.end, ui.q.qty, ui.q.fixture);
    if (t.net < D.MIN_ORDER_NET) { toast(`最低出稿金額 ${D.yen(D.MIN_ORDER_NET)} 未満です`); return; }
    const b = D.createBooking({
      slotId: slot.id, facilityId: slot.facilityId, start: ui.sel.start, end: ui.sel.end,
      qty: ui.q.qty, category: ui.q.category, total: t, deliveryDue: D.deliveryDue(slot, ui.sel.start),
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
      const p = $('#ck-product').value.trim(), q = +$('#ck-qty').value, n = $('#ck-name').value.trim();
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
    D.confirmBooking(id); toast('決済完了。枠を確定しました'); go('#/done/' + id);
  });

  // 予約管理
  $$('[data-cancel]').forEach((b) => b.addEventListener('click', () => {
    const bk = D.state.bookings.find((x) => x.id === b.dataset.cancel);
    const rp = D.refundPreview(bk);
    if (confirm(`予約を取り消します。\n\n開始まで ${rp.daysBefore}日 / 返金率 ${rp.rate}% / 返金額 ${D.yen(rp.amount)}\n\nよろしいですか？`)) {
      D.cancelBooking(bk.id); toast('取消を受け付け、枠を開放しました'); render();
    }
  }));

  // 施設側
  $$('[data-recv]').forEach((b) => b.addEventListener('click', () => {
    const bk = D.state.bookings.find((x) => x.id === b.dataset.recv);
    bk.shipment = { receivedAt: Date.now() }; D.save();
    toast('着荷を登録しました'); render();
  }));
  $$('[data-report]').forEach((b) => b.addEventListener('click', () => {
    const bk = D.state.bookings.find((x) => x.id === b.dataset.report);
    openSheet(`
      <h3>実施報告</h3>
      <p class="tiny dim">${esc(bk.product || bk.category)} / ${bk.start}〜${bk.end}</p>
      <label class="f" style="margin-top:10px">配り切った個数</label>
      <input class="inp" type="number" id="rp-qty" inputmode="numeric" value="${bk.sampleQty || ''}">
      <label class="f" style="margin-top:8px">現場の所感（任意）</label>
      <textarea class="inp" id="rp-memo" rows="3"></textarea>
      <div class="row" style="margin-top:11px">
        <button class="btn btn-ghost" id="sh-close">閉じる</button>
        <button class="btn" id="rp-send" style="flex:1">報告を送信</button></div>`, () => {
      $('#sh-close').addEventListener('click', closeSheet);
      $('#rp-send').addEventListener('click', () => {
        bk.report = { qty: +$('#rp-qty').value || 0, memo: $('#rp-memo').value }; D.save();
        closeSheet(); toast('報告を受け付けました'); render();
      });
    });
  }));
  $$('[data-fslot]').forEach((b) => b.addEventListener('click', () => { ui.facCalSlot = b.dataset.fslot; render(); }));
  const fp = $('#fcal-prev'), fn = $('#fcal-next');
  if (fp) fp.addEventListener('click', () => { ui.facMonth = new Date(ui.facMonth.getFullYear(), ui.facMonth.getMonth() - 1, 1); render(); });
  if (fn) fn.addEventListener('click', () => { ui.facMonth = new Date(ui.facMonth.getFullYear(), ui.facMonth.getMonth() + 1, 1); render(); });

  $$('[data-fday]').forEach((c) => c.addEventListener('click', () => {
    const ds = c.dataset.fday, slotId = ui.facCalSlot;
    const info = D.dayInfo(slotId, ds);
    openSheet(`
      <h3 class="mono">${ds}</h3>
      <p class="tiny dim">${esc(D.slotById(slotId).name)} / 予約 ${info.booked}件 / 受入枠 ${info.capacity}</p>
      ${info.booked > 0 ? `
        <div class="note note-warn" style="margin:10px 0">
          <span class="lb">変更不可</span>予約が入っているため受入不可にできません。日程変更が必要な場合は運営に相談してください。</div>
        <button class="bigbtn" id="sh-consult">運営に相談する</button>`
      : `<div style="margin-top:10px">
          <button class="bigbtn danger" id="sh-block">この日を受入不可にする</button>
          <button class="bigbtn" id="sh-cap">受入枠数を変更する（現在 ${info.capacity}）</button></div>`}
      <button class="btn btn-ghost btn-lg" id="sh-close" style="margin-top:6px">閉じる</button>`, () => {
      const bl = $('#sh-block');
      if (bl) bl.addEventListener('click', () => {
        D.addOverride({ slotId, from: ds, to: ds, capacity: 0, reason: '設備工事' });
        closeSheet(); toast(`${ds} を受入不可にしました`); render();
      });
      const cap = $('#sh-cap');
      if (cap) cap.addEventListener('click', () => {
        const n = prompt('この日の受入枠数', String(Math.max(0, info.capacity - 1)));
        if (n === null) return;
        D.addOverride({ slotId, from: ds, to: ds, capacity: Math.max(0, +n || 0), reason: '枠数調整' });
        closeSheet(); toast('受入枠数を変更しました'); render();
      });
      const cs = $('#sh-consult');
      if (cs) cs.addEventListener('click', () => { closeSheet(); toast('運営に相談内容を送信しました'); });
      $('#sh-close').addEventListener('click', closeSheet);
    });
  }));

  const bulk = $('#bulk');
  if (bulk) bulk.addEventListener('click', () => {
    const slotId = ui.facCalSlot;
    openSheet(`
      <h3>期間をまとめて設定</h3>
      <label class="f" style="margin-top:10px">期間</label>
      <div class="row" style="gap:6px">
        <input class="inp" type="date" id="bk-from" value="${D.ymd(D.addDays(D.TODAY, 30))}">
        <input class="inp" type="date" id="bk-to" value="${D.ymd(D.addDays(D.TODAY, 34))}">
      </div>
      <label class="f" style="margin-top:8px">受入枠数</label>
      <select class="inp" id="bk-cap"><option value="0">0（受入不可）</option><option value="1">1</option><option value="2">2</option></select>
      <label class="f" style="margin-top:8px">理由</label>
      <select class="inp" id="bk-reason"><option>定休日</option><option>繁忙期</option><option>自社イベント</option><option>設備工事</option><option>その他</option></select>
      <div class="row" style="margin-top:11px">
        <button class="btn btn-ghost" id="sh-close">閉じる</button>
        <button class="btn" id="bk-save" style="flex:1">反映する</button></div>`, () => {
      $('#sh-close').addEventListener('click', closeSheet);
      $('#bk-save').addEventListener('click', () => {
        const from = $('#bk-from').value, to = $('#bk-to').value;
        if (!from || !to || to < from) { toast('期間を正しく指定してください'); return; }
        const cap = +$('#bk-cap').value;
        const bad = D.conflictingDates(slotId, from, to, cap);
        D.addOverride({ slotId, from, to, capacity: cap, reason: $('#bk-reason').value });
        closeSheet();
        toast(bad.length ? `反映しました（${bad.length}日は予約があるため対象外）` : '反映しました');
        render();
      });
    });
  });

  $$('[data-delov]').forEach((b) => b.addEventListener('click', () => {
    D.removeOverride(b.dataset.delov); toast('設定を取り消しました'); render();
  }));
}

/* ---------- シート ---------- */
function openSheet(html, after) {
  closeSheet();
  const bg = document.createElement('div');
  bg.className = 'sheet-bg';
  bg.innerHTML = `<div class="sheet">${html}</div>`;
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
    if (left <= 0) { clearInterval(cdTimer); sweepHolds(); render(); return; }
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
