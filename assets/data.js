/* マッパ — デモ用シードデータと在庫エンジン
   在庫は「枠商品 × 営業日」の日次レコード。決定的な擬似乱数で生成するので、
   リロードしても同じ空き状況になる。予約・受入不可設定は localStorage に永続化する。 */

export const TODAY = (() => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
})();

export const ymd = (d) => {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
export const parseYmd = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
export const diffDays = (a, b) => Math.round((b - a) / 86400000);
export const WD = ['日', '月', '火', '水', '木', '金', '土'];
export const fmtDate = (s) => {
  const d = parseYmd(s);
  return `${d.getMonth() + 1}/${d.getDate()}(${WD[d.getDay()]})`;
};
export const fmtDateLong = (s) => {
  const d = parseYmd(s);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日(${WD[d.getDay()]})`;
};
export const yen = (n) => '¥' + Math.round(n).toLocaleString('ja-JP');

/* 決定的な擬似乱数 (xorshift) */
function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function rnd(seed) {
  let x = hash(seed) || 1;
  return () => {
    x ^= x << 13; x >>>= 0;
    x ^= x >> 17;
    x ^= x << 5; x >>>= 0;
    return x / 4294967296;
  };
}

export const SLOT_TYPES = {
  SAMPLING: { code: 'SAMPLING', label: 'サンプリング設置', unitLabel: '週', short: 'サンプリング' },
  POSTER: { code: 'POSTER', label: 'ポスター/POP掲出', unitLabel: '30日', short: 'ポスター' },
  EVENT: { code: 'EVENT', label: 'イベント/催事', unitLabel: '日', short: 'イベント' },
};

export const CATEGORIES = [
  'スキンケア', 'ヘアケア', 'ボディケア', '飲料', '健康食品', 'サプリメント', '日用品', 'アパレル',
];

export const AUDIENCE_TAGS = [
  'サウナ愛好', '女性ひとり湯', 'ファミリー', 'ビジネス層', 'シニア', '若年層', '深夜利用',
];

/* ---------- 施設マスタ ---------- */
export const FACILITIES = [
  {
    id: 'f01', lng: 139.5172, lat: 35.5452, name: '青葉の湯 横浜青葉', brand: '青葉の湯', pref: '14', prefName: '神奈川県',
    city: '横浜市青葉区', station: '青葉台駅', walkMin: 8, hours: '10:00–24:00', holiday: null,
    hue: 190, monthlyVisitors: 24000, weekdayRatio: 62, femaleRatio: 52,
    ageMix: { '20代': 18, '30代': 27, '40代': 31, '50代': 16, '60代〜': 8 },
    audienceTags: ['サウナ愛好', '女性ひとり湯', 'ファミリー'],
    verified: '2026-06', avgConsumption: 42, campaignCount: 8, receivingBufferDays: 3,
    ngIndustries: ['たばこ', '賭博', '宗教'],
    blurb: '露天・サウナ計6種。2023年にリニューアルし、女性用パウダールームが広く取られている。化粧品サンプリングとの相性がよく、消化スピードは同規模施設の平均を上回る。',
    cases: [
      { cat: 'スキンケア', period: '2026-07 / 14日間', qty: 800, consumed: 800, perDay: 57, slot: '女性脱衣所ラックB' },
      { cat: '飲料', period: '2026-05 / 10日間', qty: 500, consumed: 460, perDay: 46, slot: '男性脱衣所ラックA' },
      { cat: 'ヘアケア', period: '2026-03 / 14日間', qty: 600, consumed: 552, perDay: 39, slot: '女性脱衣所ラックB' },
    ],
    currentSamples: [
      { cat: '飲料', until: 14, slot: '男性脱衣所ラックA' },
      { cat: 'ヘアケア', until: 36, slot: '女性脱衣所ラックB' },
    ],
    slots: [
      { id: 'f01-s1', name: '男性脱衣所ラックA', type: 'SAMPLING', capacity: 3, price: 85000, exclusive: ['飲料', 'スキンケア'] },
      { id: 'f01-s2', name: '女性脱衣所ラックB', type: 'SAMPLING', capacity: 2, price: 95000, exclusive: ['スキンケア', 'ヘアケア'] },
      { id: 'f01-s3', name: 'エントランス掲出面 B1', type: 'POSTER', capacity: 4, price: 60000, exclusive: [] },
    ],
  },
  {
    id: 'f02', lng: 139.9254, lat: 35.8713, name: 'スパメッツァ 流山', brand: 'スパメッツァ', pref: '12', prefName: '千葉県',
    city: '流山市', station: '流山おおたかの森駅', walkMin: 5, hours: '9:00–25:00', holiday: null,
    hue: 168, monthlyVisitors: 38000, weekdayRatio: 55, femaleRatio: 44,
    ageMix: { '20代': 24, '30代': 30, '40代': 26, '50代': 14, '60代〜': 6 },
    audienceTags: ['サウナ愛好', '若年層', '深夜利用'],
    verified: '2026-07', avgConsumption: 68, campaignCount: 5, receivingBufferDays: 2,
    ngIndustries: ['たばこ', '消費者金融'],
    blurb: 'ロウリュの回数が多く、サウナ目的の来館が7割超。20〜30代の男性比率が高く、飲料・サプリメントの反応が良い。深夜帯の滞在が長いのが特徴。',
    cases: [
      { cat: '飲料', period: '2026-06 / 14日間', qty: 1200, consumed: 1200, perDay: 86, slot: '男性脱衣所ラックA' },
      { cat: 'サプリメント', period: '2026-04 / 14日間', qty: 700, consumed: 630, perDay: 45, slot: '男性脱衣所ラックA' },
    ],
    currentSamples: [{ cat: 'サプリメント', until: 9, slot: '男性脱衣所ラックA' }],
    slots: [
      { id: 'f02-s1', name: '男性脱衣所ラックA', type: 'SAMPLING', capacity: 3, price: 120000, exclusive: ['飲料', 'サプリメント'] },
      { id: 'f02-s2', name: '女性脱衣所ラックA', type: 'SAMPLING', capacity: 2, price: 110000, exclusive: ['スキンケア'] },
      { id: 'f02-s3', name: '館内サイネージ横 掲出面', type: 'POSTER', capacity: 2, price: 75000, exclusive: [] },
    ],
  },
  {
    id: 'f03', lng: 139.7392, lat: 35.622, name: '御殿山温泉 品川', brand: '御殿山温泉', pref: '13', prefName: '東京都',
    city: '品川区', station: '北品川駅', walkMin: 6, hours: '11:00–23:00', holiday: 2,
    hue: 205, monthlyVisitors: 19000, weekdayRatio: 71, femaleRatio: 49,
    ageMix: { '20代': 15, '30代': 33, '40代': 29, '50代': 17, '60代〜': 6 },
    audienceTags: ['ビジネス層', 'サウナ愛好'],
    verified: '2026-05', avgConsumption: 51, campaignCount: 11, receivingBufferDays: 3,
    ngIndustries: ['賭博'],
    blurb: '平日夜のビジネス利用が中心。仕事帰りの単独来館が多く、滞在時間は短いが回転が速い。名刺交換のような「持ち帰り前提」のサンプリングが機能しやすい。',
    cases: [
      { cat: 'ボディケア', period: '2026-08 / 21日間', qty: 900, consumed: 861, perDay: 41, slot: '男性脱衣所ラック' },
      { cat: '健康食品', period: '2026-06 / 14日間', qty: 700, consumed: 700, perDay: 50, slot: '男性脱衣所ラック' },
      { cat: 'スキンケア', period: '2026-02 / 14日間', qty: 500, consumed: 448, perDay: 32, slot: '女性脱衣所ラック' },
    ],
    currentSamples: [],
    slots: [
      { id: 'f03-s1', name: '男性脱衣所ラック', type: 'SAMPLING', capacity: 2, price: 78000, exclusive: ['健康食品'] },
      { id: 'f03-s2', name: '女性脱衣所ラック', type: 'SAMPLING', capacity: 1, price: 82000, exclusive: ['スキンケア'] },
      { id: 'f03-s3', name: 'ロビー掲出面 B2', type: 'POSTER', capacity: 3, price: 48000, exclusive: [] },
    ],
  },
  {
    id: 'f04', lng: 135.2487, lat: 34.7981, name: '有馬の里 神戸北', brand: '有馬の里', pref: '28', prefName: '兵庫県',
    city: '神戸市北区', station: '有馬温泉駅', walkMin: 12, hours: '10:00–23:00', holiday: null,
    hue: 24, monthlyVisitors: 31000, weekdayRatio: 48, femaleRatio: 58,
    ageMix: { '20代': 12, '30代': 22, '40代': 26, '50代': 24, '60代〜': 16 },
    audienceTags: ['ファミリー', 'シニア', '女性ひとり湯'],
    verified: null, avgConsumption: 36, campaignCount: 3, receivingBufferDays: 4,
    ngIndustries: ['たばこ', '賭博', '消費者金融'],
    blurb: '観光と地元利用が半々。土日のファミリー比率が高く、40〜60代の女性来館が安定している。ゆったり滞在型で、館内での認知形成に向く。',
    cases: [
      { cat: 'スキンケア', period: '2026-05 / 21日間', qty: 900, consumed: 756, perDay: 36, slot: '女性脱衣所ラック' },
    ],
    currentSamples: [{ cat: '日用品', until: 21, slot: '女性脱衣所ラック' }],
    slots: [
      { id: 'f04-s1', name: '女性脱衣所ラック', type: 'SAMPLING', capacity: 2, price: 72000, exclusive: ['スキンケア', '日用品'] },
      { id: 'f04-s2', name: '休憩処 掲出面 B1', type: 'POSTER', capacity: 4, price: 42000, exclusive: [] },
      { id: 'f04-s3', name: '2F 催事スペース', type: 'EVENT', capacity: 1, price: 40000, exclusive: [] },
    ],
  },
  {
    id: 'f05', lng: 136.9083, lat: 35.17, name: '天空スパ 名古屋栄', brand: '天空スパ', pref: '23', prefName: '愛知県',
    city: '名古屋市中区', station: '栄駅', walkMin: 4, hours: '24時間', holiday: null,
    hue: 262, monthlyVisitors: 27500, weekdayRatio: 58, femaleRatio: 41,
    ageMix: { '20代': 26, '30代': 31, '40代': 24, '50代': 13, '60代〜': 6 },
    audienceTags: ['若年層', '深夜利用', 'サウナ愛好'],
    verified: '2026-06', avgConsumption: 59, campaignCount: 6, receivingBufferDays: 2,
    ngIndustries: ['賭博'],
    blurb: '24時間営業で深夜〜早朝の利用が厚い。若年層の比率が高く、SNS投稿が発生しやすい。館内着のポケットに入るサイズのサンプルが特に消化される。',
    cases: [
      { cat: '飲料', period: '2026-07 / 14日間', qty: 1000, consumed: 1000, perDay: 71, slot: '男性脱衣所ラックA' },
      { cat: 'ヘアケア', period: '2026-04 / 14日間', qty: 650, consumed: 611, perDay: 44, slot: '女性脱衣所ラック' },
    ],
    currentSamples: [{ cat: '飲料', until: 5, slot: '男性脱衣所ラックA' }],
    slots: [
      { id: 'f05-s1', name: '男性脱衣所ラックA', type: 'SAMPLING', capacity: 3, price: 98000, exclusive: ['飲料'] },
      { id: 'f05-s2', name: '女性脱衣所ラック', type: 'SAMPLING', capacity: 2, price: 92000, exclusive: ['ヘアケア'] },
      { id: 'f05-s3', name: 'エレベーター前 掲出面', type: 'POSTER', capacity: 2, price: 55000, exclusive: [] },
    ],
  },
  {
    id: 'f06', lng: 139.8042, lat: 35.6453, name: '大江戸の湯 江東', brand: '大江戸の湯', pref: '13', prefName: '東京都',
    city: '江東区', station: '東雲駅', walkMin: 10, hours: '11:00–翌9:00', holiday: null,
    hue: 340, monthlyVisitors: 42000, weekdayRatio: 51, femaleRatio: 54,
    ageMix: { '20代': 19, '30代': 26, '40代': 27, '50代': 19, '60代〜': 9 },
    audienceTags: ['ファミリー', '女性ひとり湯', '深夜利用'],
    verified: '2026-07', avgConsumption: 74, campaignCount: 14, receivingBufferDays: 3,
    ngIndustries: ['たばこ', '賭博'],
    blurb: '館内着で長時間過ごす複合型。来館者数が最も多く、消化スピードも全提携施設で最速。人気枠のため3ヶ月先まで埋まりやすい。',
    cases: [
      { cat: 'スキンケア', period: '2026-08 / 14日間', qty: 1500, consumed: 1500, perDay: 107, slot: '女性脱衣所ラックA' },
      { cat: '日用品', period: '2026-06 / 30日間', qty: 2000, consumed: 1880, perDay: 63, slot: '女性脱衣所ラックA' },
      { cat: '飲料', period: '2026-05 / 14日間', qty: 1100, consumed: 1100, perDay: 79, slot: '男性脱衣所ラックA' },
    ],
    currentSamples: [
      { cat: 'スキンケア', until: 11, slot: '女性脱衣所ラックA' },
      { cat: '日用品', until: 26, slot: '男性脱衣所ラックA' },
    ],
    slots: [
      { id: 'f06-s1', name: '男性脱衣所ラックA', type: 'SAMPLING', capacity: 3, price: 145000, exclusive: ['飲料', '日用品'] },
      { id: 'f06-s2', name: '女性脱衣所ラックA', type: 'SAMPLING', capacity: 3, price: 155000, exclusive: ['スキンケア', 'ヘアケア'] },
      { id: 'f06-s3', name: '大浴場前 掲出面 B0', type: 'POSTER', capacity: 4, price: 88000, exclusive: [] },
      { id: 'f06-s4', name: '3F 催事スペース', type: 'EVENT', capacity: 2, price: 65000, exclusive: [] },
    ],
  },
  {
    id: 'f07', lng: 135.6773, lat: 35.0145, name: '嵐山 湯どころ', brand: '湯どころ', pref: '26', prefName: '京都府',
    city: '京都市右京区', station: '嵐山駅', walkMin: 7, hours: '11:00–22:00', holiday: 3,
    hue: 120, monthlyVisitors: 16500, weekdayRatio: 44, femaleRatio: 61,
    ageMix: { '20代': 17, '30代': 24, '40代': 25, '50代': 21, '60代〜': 13 },
    audienceTags: ['女性ひとり湯', 'シニア'],
    verified: null, avgConsumption: 29, campaignCount: 2, receivingBufferDays: 4,
    ngIndustries: ['たばこ', '賭博', '宗教', '消費者金融'],
    blurb: '観光客と地元の常連が混在する小規模施設。女性比率が6割を超え、落ち着いた滞在。母数は小さいが、丁寧に手に取ってもらえる環境。',
    cases: [{ cat: 'スキンケア', period: '2026-06 / 14日間', qty: 400, consumed: 341, perDay: 29, slot: '女性脱衣所ラック' }],
    currentSamples: [],
    slots: [
      { id: 'f07-s1', name: '女性脱衣所ラック', type: 'SAMPLING', capacity: 1, price: 54000, exclusive: ['スキンケア'] },
      { id: 'f07-s2', name: '受付横 掲出面 B2', type: 'POSTER', capacity: 2, price: 32000, exclusive: [] },
    ],
  },
  {
    id: 'f08', lng: 135.5002, lat: 34.6823, name: '湯treat 大阪本町', brand: '湯treat', pref: '27', prefName: '大阪府',
    city: '大阪市中央区', station: '本町駅', walkMin: 3, hours: '7:00–24:00', holiday: null,
    hue: 42, monthlyVisitors: 22000, weekdayRatio: 74, femaleRatio: 47,
    ageMix: { '20代': 21, '30代': 34, '40代': 28, '50代': 12, '60代〜': 5 },
    audienceTags: ['ビジネス層', '若年層', 'サウナ愛好'],
    verified: '2026-06', avgConsumption: 47, campaignCount: 7, receivingBufferDays: 2,
    ngIndustries: ['賭博'],
    blurb: 'オフィス街の朝サウナ需要が大きい。平日比率74%と提携施設で最も高く、BtoC商材の平日リーチに向く。朝の時間帯は回転が速い。',
    cases: [
      { cat: '健康食品', period: '2026-07 / 14日間', qty: 800, consumed: 742, perDay: 53, slot: '男性脱衣所ラック' },
      { cat: 'ボディケア', period: '2026-03 / 14日間', qty: 600, consumed: 546, perDay: 39, slot: '男性脱衣所ラック' },
    ],
    currentSamples: [{ cat: '健康食品', until: 17, slot: '男性脱衣所ラック' }],
    slots: [
      { id: 'f08-s1', name: '男性脱衣所ラック', type: 'SAMPLING', capacity: 2, price: 88000, exclusive: ['健康食品'] },
      { id: 'f08-s2', name: '女性脱衣所ラック', type: 'SAMPLING', capacity: 1, price: 84000, exclusive: ['スキンケア'] },
      { id: 'f08-s3', name: '入口 掲出面 B1', type: 'POSTER', capacity: 3, price: 52000, exclusive: [] },
    ],
  },
];

/* 枠タイプごとの既定制約（前提定義 §2.4 準拠 / R-16 により定休日も在庫は生成する） */
export const TYPE_RULES = {
  SAMPLING: { minLead: 14, minDays: 14, maxDays: 60, unitDays: 7, unitLabel: '週' },
  POSTER: { minLead: 10, minDays: 30, maxDays: 90, unitDays: 30, unitLabel: '30日' },
  EVENT: { minLead: 21, minDays: 1, maxDays: 3, unitDays: 1, unitLabel: '日' },
};

export const HORIZON_DAYS = 180;
export const MIN_ORDER_NET = 50000;
export const TAX_BPS = 1000;
export const FIXTURE_FEE = 8000;
export const HOLD_MINUTES = 30; // 確定改訂 R-01: Stripe Checkout の下限に合わせる

/* すべての枠商品をフラットに引く */
export const ALL_SLOTS = FACILITIES.flatMap((f) =>
  f.slots.map((s) => ({
    ...s,
    ...TYPE_RULES[s.type],
    facilityId: f.id,
    facility: f,
    typeLabel: SLOT_TYPES[s.type].label,
  }))
);
export const slotById = (id) => ALL_SLOTS.find((s) => s.id === id);
export const facilityById = (id) => FACILITIES.find((f) => f.id === id);

/* ---------- 永続化 ---------- */
const KEY = 'mappa.state.v1';
const blank = () => ({ bookings: [], overrides: [], seq: 1 });

export let state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return blank();
    const s = JSON.parse(raw);
    return { ...blank(), ...s };
  } catch (e) {
    return blank();
  }
}
export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) { /* プライベートモード等 */ }
  invalidate();
}
export function resetAll() {
  state = blank();
  try { localStorage.removeItem(KEY); } catch (e) {}
  invalidate();
}

/* ---------- 在庫エンジン ---------- */
/* 既存の他社予約は決定的乱数で生成する。
   実際の予約は「連続した期間」で入るので、日ごとの独立乱数ではなく
   期間ブロックを撒く。近い日ほど埋まりやすいよう起点を手前に寄せる。 */
const facBlocks = new Map();
const ADVERTISERS = ['A社', 'B社', 'C社', 'D社', 'E社', 'F社'];

/** 他社の既存予約を施設単位で生成する。
 *  期間が重なるブロックには同じカテゴリを割り当てないので、
 *  「同一カテゴリを館内に同時設置しない」という排他ルールと必ず整合する。 */
function buildFacilityBlocks(facilityId) {
  if (facBlocks.has(facilityId)) return facBlocks.get(facilityId);
  const f = facilityById(facilityId);
  const r = rnd('fb:' + facilityId);
  const all = [];
  for (const sl of f.slots) {
    const slot = slotById(sl.id);
    const pop = Math.min(1, f.monthlyVisitors / 42000);
    const n = Math.round(3 + pop * 6 + slot.capacity * 1.2);
    for (let i = 0; i < n; i++) {
      const start = Math.floor(Math.pow(r(), 1.5) * (HORIZON_DAYS + 60)) - 20;
      const dur = slot.type === 'SAMPLING' ? 14 + Math.floor(r() * 3) * 7
        : slot.type === 'POSTER' ? 30
        : 1 + Math.floor(r() * 3);
      all.push({ slotId: sl.id, a: start, b: start + dur - 1 });
    }
  }
  all.sort((x, y) => x.a - y.a);
  // 施設内のいずれかの枠が排他指定しているカテゴリ = 同時に2件置いてはいけないもの
  const facExclusive = new Set(f.slots.flatMap((sl) => sl.exclusive));
  const freeCats = CATEGORIES.filter((c) => !facExclusive.has(c));
  for (const bl of all) {
    const slot = slotById(bl.slotId);
    const pool = slot.exclusive.length ? slot.exclusive : CATEGORIES;
    const taken = new Set(all.filter((o) => o.cat && o.a <= bl.b && o.b >= bl.a).map((o) => o.cat));
    let cands = pool.filter((c) => !taken.has(c));
    if (!cands.length) cands = CATEGORIES.filter((c) => !taken.has(c));
    // それでも空きが無ければ、重複してよい（どの枠も排他指定していない）カテゴリへ逃がす
    if (!cands.length) cands = freeCats.length ? freeCats : pool;
    bl.cat = cands[Math.floor(r() * cands.length) % cands.length];
    bl.adv = ADVERTISERS[Math.floor(r() * ADVERTISERS.length) % ADVERTISERS.length];
  }
  const bySlot = new Map();
  for (const sl of f.slots) bySlot.set(sl.id, all.filter((x) => x.slotId === sl.id));
  facBlocks.set(facilityId, bySlot);
  return bySlot;
}
const baseBlocks = (slotId) => buildFacilityBlocks(slotById(slotId).facilityId).get(slotId) || [];

function baseBooked(slotId, dateStr) {
  const s = slotById(slotId);
  if (!s) return 0;
  const off = diffDays(TODAY, parseYmd(dateStr));
  let n = 0;
  for (const bl of baseBlocks(slotId)) if (off >= bl.a && off <= bl.b) n++;
  return Math.min(n, s.capacity);
}
/** 指定日にその枠へ入っている他社ブロック（capacity 上限まで） */
export function blocksOn(slotId, dateStr) {
  const s = slotById(slotId);
  const off = diffDays(TODAY, parseYmd(dateStr));
  return baseBlocks(slotId).filter((bl) => off >= bl.a && off <= bl.b).slice(0, s.capacity);
}
/** 期間に重なる他社ブロック */
export function blocksOverlapping(slotId, start, end) {
  const a = diffDays(TODAY, parseYmd(start)), b = diffDays(TODAY, parseYmd(end));
  return baseBlocks(slotId).filter((bl) => bl.a <= b && bl.b >= a);
}

let invCache = new Map();
export function invalidate() { invCache = new Map(); }

/** その日の枠商品の状態を返す */
export function dayInfo(slotId, dateStr) {
  const k = slotId + '|' + dateStr;
  if (invCache.has(k)) return invCache.get(k);
  const s = slotById(slotId);
  const d = parseYmd(dateStr);
  const dayOff = diffDays(TODAY, d);

  let capacity = s.capacity;
  let blocked = null;
  for (const o of state.overrides) {
    if (o.slotId !== slotId) continue;
    if (dateStr < o.from || dateStr > o.to) continue;
    if (o.weekday != null && d.getDay() !== o.weekday) continue;
    if (o.capacity < capacity) { capacity = o.capacity; blocked = o.reason; }
  }
  let booked = baseBooked(slotId, dateStr);
  for (const b of state.bookings) {
    if (b.slotId !== slotId) continue;
    if (b.status === 'cancelled' || b.status === 'expired') continue;
    if (dateStr >= b.start && dateStr <= b.end) booked += b.qty;
  }
  booked = Math.min(booked, s.capacity);
  const available = Math.max(0, capacity - booked);

  const out = {
    date: dateStr, capacity, booked, available, blocked,
    past: dayOff < 0,
    beforeLead: dayOff < s.minLead,
    beyondHorizon: dayOff > HORIZON_DAYS,
    mine: state.bookings.some(
      (b) => b.slotId === slotId && b.status !== 'cancelled' && b.status !== 'expired' &&
        dateStr >= b.start && dateStr <= b.end),
  };
  out.selectable = !out.past && !out.beforeLead && !out.beyondHorizon && out.available > 0;
  out.status = out.past || out.beyondHorizon ? 'out'
    : out.beforeLead ? 'lead'
    : capacity === 0 ? 'blocked'
    : out.available === 0 ? 'full'
    : out.available === 1 ? 'low' : 'open';
  invCache.set(k, out);
  return out;
}

export const earliestStart = (slot) =>
  ymd(addDays(TODAY, Math.max(slot.minLead, slot.facility.receivingBufferDays + 1)));

/** 期間すべてに qty の空きがあるか（オールオアナッシング） */
export function checkRange(slotId, start, end, qty = 1, category = null) {
  const s = slotById(slotId);
  const days = diffDays(parseYmd(start), parseYmd(end)) + 1;
  const issues = [];
  if (days < s.minDays) issues.push({ code: 'minDays', msg: `最短 ${s.minDays}日 からのお申込みです（あと${s.minDays - days}日）` });
  if (days > s.maxDays) issues.push({ code: 'maxDays', msg: `この枠は最長 ${s.maxDays}日 までです` });
  if (start < earliestStart(s)) issues.push({ code: 'lead', msg: `最短開始日は ${fmtDateLong(earliestStart(s))} です（配送と設置準備のため）` });

  const bad = [];
  for (let i = 0; i < days; i++) {
    const ds = ymd(addDays(parseYmd(start), i));
    const info = dayInfo(slotId, ds);
    if (info.available < qty) bad.push({ date: ds, info });
  }
  if (bad.length) {
    const b = bad[0];
    issues.push({
      code: 'inventory',
      msg: b.info.status === 'blocked'
        ? `${fmtDate(b.date)} は施設の受入不可日（${b.info.blocked || '設定あり'}）のため選べません`
        : `${fmtDate(b.date)} は空きがありません（残${b.info.available}／必要${qty}）`,
      dates: bad.map((x) => x.date),
    });
  }
  // 競合カテゴリ排他（確定改訂 R-21: カテゴリは仮押さえ前に確定させる）
  // 判定は施設単位。同一カテゴリが館内のどこかに入っていれば不可。
  if (category) {
    let until = null;
    for (const sl of s.facility.slots) {
      if (!sl.exclusive.includes(category)) continue;
      for (const bl of blocksOverlapping(sl.id, start, end)) {
        if (bl.cat === category) {
          const e = ymd(addDays(TODAY, bl.b));
          if (!until || e > until) until = e;
        }
      }
      for (const b of state.bookings) {
        if (b.status !== 'confirmed' && b.status !== 'hold') continue;
        if (b.slotId !== sl.id || b.category !== category) continue;
        if (b.start <= end && b.end >= start && (!until || b.end > until)) until = b.end;
      }
    }
    if (until) {
      issues.push({
        code: 'exclusive',
        msg: `同じカテゴリ（${category}）が ${fmtDateLong(until)} まで館内に設置されているため、この期間は予約できません`,
        suggestFrom: ymd(addDays(parseYmd(until), 1)),
      });
    }
  }
  return { ok: issues.length === 0, issues, days };
}

/** 指定条件で確保できる直近の連続期間を探す */
export function nextAvailable(slotId, days, qty = 1, fromStr = null, category = null) {
  const s = slotById(slotId);
  const from = fromStr || earliestStart(s);
  for (let off = 0; off <= HORIZON_DAYS - days; off++) {
    const start = ymd(addDays(parseYmd(from), off));
    const end = ymd(addDays(parseYmd(start), days - 1));
    if (diffDays(TODAY, parseYmd(end)) > HORIZON_DAYS) break;
    if (checkRange(slotId, start, end, qty, category).ok) return { start, end };
  }
  return null;
}

/** 課金単位数（PER_WEEK は7日切上 等） */
export const billedUnits = (slot, days) => Math.ceil(days / slot.unitDays);

export function quote(slotId, start, end, qty, fixtureRental) {
  const s = slotById(slotId);
  const days = diffDays(parseYmd(start), parseYmd(end)) + 1;
  const units = billedUnits(s, days);
  const slotFee = s.price * units * qty;
  const fixtureFee = fixtureRental ? FIXTURE_FEE * qty : 0;
  const net = slotFee + fixtureFee;
  const tax = Math.floor((net * TAX_BPS) / 10000);
  return { days, units, unitLabel: s.unitLabel, slotFee, fixtureFee, net, tax, gross: net + tax };
}

export const deliveryDue = (slot, start) =>
  ymd(addDays(parseYmd(start), -slot.facility.receivingBufferDays));

/* ---------- 予約 ---------- */
export function createBooking(payload) {
  const id = 'BKG-' + String(1000 + state.seq).slice(1);
  const b = {
    id, ...payload,
    no: `BKG-${ymd(TODAY).replace(/-/g, '')}-${String(state.seq).padStart(3, '0')}`,
    status: 'hold',
    createdAt: Date.now(),
    holdExpiresAt: Date.now() + HOLD_MINUTES * 60000,
    shipment: null, report: null,
  };
  state.seq++;
  state.bookings.push(b);
  save();
  return b;
}
export function confirmBooking(id) {
  const b = state.bookings.find((x) => x.id === id);
  if (!b) return null;
  b.status = 'confirmed';
  b.confirmedAt = Date.now();
  b.holdExpiresAt = null;
  save();
  return b;
}
export function cancelBooking(id) {
  const b = state.bookings.find((x) => x.id === id);
  if (!b) return null;
  const daysBefore = diffDays(TODAY, parseYmd(b.start));
  const rate = daysBefore >= 60 ? 100 : daysBefore >= 31 ? 70 : daysBefore >= 15 ? 50 : daysBefore >= 8 ? 30 : 0;
  b.status = 'cancelled';
  b.refundRate = rate;
  b.refundAmount = Math.floor((b.total.net * rate) / 100) + Math.floor(((b.total.tax * rate) / 100));
  save();
  return b;
}
export function refundPreview(b) {
  const daysBefore = diffDays(TODAY, parseYmd(b.start));
  const rate = daysBefore >= 60 ? 100 : daysBefore >= 31 ? 70 : daysBefore >= 15 ? 50 : daysBefore >= 8 ? 30 : 0;
  return { daysBefore, rate, amount: Math.floor((b.total.gross * rate) / 100) };
}
export function addOverride(o) {
  state.overrides.push({ id: 'ov' + Date.now() + Math.random().toString(36).slice(2, 6), ...o });
  save();
}
export function removeOverride(id) {
  state.overrides = state.overrides.filter((o) => o.id !== id);
  save();
}
/** 確定予約がある日はブロックできない（前提 §2.5 / 確定改訂 R-17） */
export function conflictingDates(slotId, from, to, newCap, weekday = null) {
  const out = [];
  let d = parseYmd(from);
  const end = parseYmd(to);
  while (d <= end) {
    const ds = ymd(d);
    if (weekday == null || d.getDay() === weekday) {
      const info = dayInfo(slotId, ds);
      if (info.booked > newCap) out.push(ds);
    }
    d = addDays(d, 1);
  }
  return out;
}


/* ---------- 館内ゾーン（枠商品がどこに置かれているか） ---------- */
export const ZONES = [
  { code: 'entrance', label: 'エントランス・受付' },
  { code: 'male', label: '男性脱衣所' },
  { code: 'female', label: '女性脱衣所' },
  { code: 'bath', label: '大浴場前' },
  { code: 'lobby', label: 'ロビー・休憩処' },
  { code: 'corridor', label: '館内通路・サイネージ横' },
  { code: 'event', label: '催事スペース' },
];
export const zoneOf = (name) =>
  /男性/.test(name) ? 'male'
  : /女性/.test(name) ? 'female'
  : /催事/.test(name) ? 'event'
  : /大浴場/.test(name) ? 'bath'
  : /ロビー|休憩/.test(name) ? 'lobby'
  : /エントランス|入口|受付/.test(name) ? 'entrance'
  : 'corridor';
export const zoneLabel = (code) => (ZONES.find((z) => z.code === code) || {}).label || code;

/** 指定日に、その施設のどこに何が設置されているか。
 *  他社分（シード）と自社の確定予約をまとめて返す。 */
export function placementsAt(facilityId, dateStr) {
  const f = facilityById(facilityId);
  const out = [];
  for (const slot of f.slots) {
    for (const bl of blocksOn(slot.id, dateStr)) {
      out.push({
        zone: zoneOf(slot.name), slotName: slot.name, slotId: slot.id,
        cat: bl.cat, until: ymd(addDays(TODAY, bl.b)), own: false, advertiser: bl.adv,
      });
    }
  }
  for (const b of state.bookings) {
    if (b.status !== 'confirmed') continue;
    const slot = slotById(b.slotId);
    if (slot.facilityId !== facilityId) continue;
    if (dateStr < b.start || dateStr > b.end) continue;
    out.push({
      zone: zoneOf(slot.name), slotName: slot.name, slotId: slot.id,
      cat: b.category, until: b.end, own: true,
      advertiser: '自社', product: b.product, qty: b.sampleQty, bookingNo: b.no,
    });
  }
  return out;
}

/** 全施設の指定日の設置状況サマリ */
export function placementSummary(dateStr) {
  return FACILITIES.map((f) => {
    const items = placementsAt(f.id, dateStr);
    const openSlots = f.slots.filter((s) => dayInfo(s.id, dateStr).available > 0).length;
    return { f, items, cats: [...new Set(items.map((i) => i.cat))], openSlots };
  });
}
