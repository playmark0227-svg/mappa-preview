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

/* ---------- 施設マスタ（手書きの主要8施設） ---------- */
const BASE_FACILITIES = [
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


/* ---------- 全国の提携施設（プレビュー用） ----------
   実在の街・駅を素データにし、客層・枠・実績は決定的な擬似乱数で導出する。
   [id, 名称, 都道府県コード, 都道府県名, 市区, 駅, 徒歩分, lng, lat, プロファイル] */
const SEED_ROWS = [
  ['g01','大通サウナ ノルド','01','北海道','札幌市中央区','大通駅',3,141.3545,43.0608,'urban'],
  ['g02','すすきの 湯処えぞ','01','北海道','札幌市中央区','すすきの駅',4,141.353,43.0554,'night'],
  ['g03','湯の川ベイサイド','01','北海道','函館市','湯の川温泉駅',6,140.79,41.7686,'resort'],
  ['g04','旭川 神居の湯','01','北海道','旭川市','旭川駅',12,142.356,43.7606,'family'],
  ['g05','浅虫パークスパ','02','青森県','青森市','浅虫温泉駅',5,140.862,40.893,'resort'],
  ['g06','盛岡 繋の湯','03','岩手県','盛岡市','盛岡駅',14,141.136,39.701,'family'],
  ['g07','仙台駅前 サウナ杜','04','宮城県','仙台市青葉区','仙台駅',4,140.8825,38.2601,'urban'],
  ['g08','秋保 森の湯','04','宮城県','仙台市太白区','愛子駅',20,140.664,38.247,'resort'],
  ['g09','秋田 川反サウナ','05','秋田県','秋田市','秋田駅',9,140.103,39.717,'sauna'],
  ['g10','蔵王 湯坊','06','山形県','山形市','山形駅',15,140.339,38.2404,'resort'],
  ['g11','郡山 開成の湯','07','福島県','郡山市','郡山駅',11,140.387,37.398,'family'],
  ['g12','水戸 偕楽の湯','08','茨城県','水戸市','水戸駅',10,140.476,36.37,'family'],
  ['g13','つくば 研究学園スパ','08','茨城県','つくば市','研究学園駅',6,140.07,36.09,'urban'],
  ['g14','宇都宮 二荒の湯','09','栃木県','宇都宮市','宇都宮駅',8,139.898,36.559,'family'],
  ['g15','高崎 榛名の湯','10','群馬県','高崎市','高崎駅',12,139.013,36.322,'family'],
  ['g16','大宮 匠の湯','11','埼玉県','さいたま市大宮区','大宮駅',7,139.624,35.906,'sauna'],
  ['g17','川越 蔵の街サウナ','11','埼玉県','川越市','本川越駅',5,139.482,35.92,'small'],
  ['g18','越谷 レイクの湯','11','埼玉県','越谷市','越谷レイクタウン駅',8,139.818,35.879,'family'],
  ['g19','船橋 グランドサウナ','12','千葉県','船橋市','船橋駅',5,139.985,35.701,'sauna'],
  ['g20','幕張 ベイスパ','12','千葉県','千葉市美浜区','海浜幕張駅',7,140.043,35.648,'urban'],
  ['g21','上野 御徒町サウナ','13','東京都','台東区','御徒町駅',2,139.7745,35.7075,'urban'],
  ['g22','高円寺 ゆとりの湯','13','東京都','杉並区','高円寺駅',4,139.6497,35.7056,'small'],
  ['g23','錦糸町 楽天地の湯','13','東京都','墨田区','錦糸町駅',3,139.814,35.697,'night'],
  ['g24','池袋 タイムズの湯','13','東京都','豊島区','池袋駅',6,139.7109,35.7295,'urban'],
  ['g25','新宿 十二社の湯','13','東京都','新宿区','西新宿駅',5,139.6917,35.6938,'night'],
  ['g26','蒲田 黒湯温泉','13','東京都','大田区','蒲田駅',7,139.716,35.5625,'family'],
  ['g27','町田 相模の湯','13','東京都','町田市','町田駅',9,139.4467,35.542,'family'],
  ['g28','川崎 大師の湯','14','神奈川県','川崎市川崎区','川崎大師駅',6,139.73,35.534,'family'],
  ['g29','横須賀 ベイサイドサウナ','14','神奈川県','横須賀市','横須賀中央駅',5,139.672,35.279,'sauna'],
  ['g30','藤沢 湘南の湯','14','神奈川県','藤沢市','藤沢駅',8,139.487,35.339,'family'],
  ['g31','新潟 万代シティ湯','15','新潟県','新潟市中央区','新潟駅',8,139.062,37.912,'urban'],
  ['g32','富山 呉羽の湯','16','富山県','富山市','富山駅',13,137.213,36.701,'family'],
  ['g33','金沢 香林坊の湯','17','石川県','金沢市','金沢駅',11,136.648,36.578,'resort'],
  ['g34','福井 えちぜんスパ','18','福井県','福井市','福井駅',7,136.223,36.062,'small'],
  ['g35','甲府 湯村の郷','19','山梨県','甲府市','甲府駅',14,138.568,35.664,'resort'],
  ['g36','長野 善光寺の湯','20','長野県','長野市','長野駅',10,138.188,36.643,'family'],
  ['g37','松本 アルプスサウナ','20','長野県','松本市','松本駅',6,137.967,36.234,'sauna'],
  ['g38','岐阜 長良川スパ','21','岐阜県','岐阜市','岐阜駅',12,136.756,35.409,'resort'],
  ['g39','静岡 駿河の湯','22','静岡県','静岡市葵区','静岡駅',8,138.388,34.972,'urban'],
  ['g40','浜松 遠州サウナ','22','静岡県','浜松市中央区','浜松駅',6,137.735,34.704,'sauna'],
  ['g41','名古屋 大曽根の湯','23','愛知県','名古屋市北区','大曽根駅',5,136.935,35.198,'family'],
  ['g42','豊田 三河の湯','23','愛知県','豊田市','豊田市駅',9,137.156,35.083,'family'],
  ['g43','四日市 伊勢湾スパ','24','三重県','四日市市','近鉄四日市駅',7,136.616,34.966,'small'],
  ['g44','大津 びわ湖の湯','25','滋賀県','大津市','大津駅',9,135.865,35.011,'family'],
  ['g45','京都 七条サウナ','26','京都府','京都市下京区','京都駅',5,135.759,34.986,'urban'],
  ['g46','梅田 スカイスパ','27','大阪府','大阪市北区','大阪駅',4,135.4959,34.7025,'night'],
  ['g47','難波 なにわの湯','27','大阪府','大阪市浪速区','難波駅',6,135.501,34.666,'night'],
  ['g48','天王寺 あべのサウナ','27','大阪府','大阪市阿倍野区','天王寺駅',4,135.514,34.646,'sauna'],
  ['g49','堺 泉北の湯','27','大阪府','堺市南区','泉ケ丘駅',8,135.506,34.47,'family'],
  ['g50','神戸 三宮ベイサウナ','28','兵庫県','神戸市中央区','三宮駅',5,135.195,34.695,'urban'],
  ['g51','姫路 白鷺の湯','28','兵庫県','姫路市','姫路駅',10,134.69,34.827,'family'],
  ['g52','奈良 平城の湯','29','奈良県','奈良市','近鉄奈良駅',12,135.829,34.684,'resort'],
  ['g53','和歌山 マリーナスパ','30','和歌山県','和歌山市','和歌山駅',15,135.192,34.234,'resort'],
  ['g54','鳥取 砂丘の湯','31','鳥取県','鳥取市','鳥取駅',13,134.235,35.49,'small'],
  ['g55','松江 宍道湖スパ','32','島根県','松江市','松江駅',9,133.062,35.461,'resort'],
  ['g56','岡山 後楽の湯','33','岡山県','岡山市北区','岡山駅',8,133.918,34.666,'family'],
  ['g57','広島 八丁堀サウナ','34','広島県','広島市中区','広島駅',10,132.475,34.397,'urban'],
  ['g58','下関 海峡サウナ','35','山口県','下関市','下関駅',7,130.924,33.95,'small'],
  ['g59','徳島 眉山の湯','36','徳島県','徳島市','徳島駅',11,134.551,34.074,'small'],
  ['g60','高松 玉藻の湯','37','香川県','高松市','高松駅',6,134.047,34.351,'family'],
  ['g61','松山 道後別邸','38','愛媛県','松山市','道後温泉駅',4,132.786,33.851,'resort'],
  ['g62','高知 はりまや温泉','39','高知県','高知市','高知駅',9,133.544,33.567,'small'],
  ['g63','博多 中洲サウナ','40','福岡県','福岡市博多区','中洲川端駅',3,130.406,33.593,'night'],
  ['g64','天神 ぐらんの湯','40','福岡県','福岡市中央区','天神駅',5,130.399,33.59,'urban'],
  ['g65','小倉 紫川の湯','40','福岡県','北九州市小倉北区','小倉駅',7,130.882,33.887,'family'],
  ['g66','嬉野 湯宿の里','41','佐賀県','嬉野市','武雄温泉駅',18,130.019,33.103,'resort'],
  ['g67','長崎 稲佐の湯','42','長崎県','長崎市','長崎駅',11,129.871,32.752,'family'],
  ['g68','熊本 城下の湯','43','熊本県','熊本市中央区','熊本駅',9,130.688,32.79,'family'],
  ['g69','別府 鉄輪の郷','44','大分県','別府市','別府駅',14,131.491,33.279,'resort'],
  ['g70','宮崎 青島リゾートスパ','45','宮崎県','宮崎市','宮崎駅',16,131.423,31.911,'resort'],
  ['g71','鹿児島 天文館サウナ','46','鹿児島県','鹿児島市','天文館通駅',4,130.554,31.59,'sauna'],
  ['g72','那覇 まちぐわースパ','47','沖縄県','那覇市','県庁前駅',6,127.679,26.213,'resort'],
];

const PROFILES = {
  urban:  { v: [17000, 30000], wd: [66, 76], fem: [42, 52], cons: [44, 58], buf: 3,
    tags: ['ビジネス層', 'サウナ愛好'], hours: ['11:00–23:00', '6:00–24:00', '11:00–翌1:00'],
    age: { '20代': 15, '30代': 32, '40代': 29, '50代': 17, '60代〜': 7 },
    poster: 'エントランス掲出面 B1' },
  sauna:  { v: [20000, 38000], wd: [50, 60], fem: [36, 46], cons: [52, 74], buf: 2,
    tags: ['サウナ愛好', '若年層'], hours: ['9:00–24:00', '10:00–翌1:00'],
    age: { '20代': 26, '30代': 31, '40代': 24, '50代': 13, '60代〜': 6 },
    poster: 'サウナ室前 掲出面 B2' },
  family: { v: [24000, 42000], wd: [44, 56], fem: [50, 60], cons: [34, 50], buf: 3,
    tags: ['ファミリー', '女性ひとり湯', 'シニア'], hours: ['10:00–23:00', '9:00–23:00'],
    age: { '20代': 14, '30代': 24, '40代': 27, '50代': 22, '60代〜': 13 },
    poster: '休憩処 掲出面 B1' },
  resort: { v: [12000, 26000], wd: [40, 52], fem: [54, 63], cons: [26, 40], buf: 4,
    tags: ['シニア', '女性ひとり湯', 'ファミリー'], hours: ['10:00–22:00', '11:00–22:00'],
    age: { '20代': 11, '30代': 20, '40代': 25, '50代': 25, '60代〜': 19 },
    poster: '受付横 掲出面 B2' },
  night:  { v: [19000, 33000], wd: [54, 64], fem: [36, 46], cons: [50, 72], buf: 2,
    tags: ['深夜利用', '若年層', 'サウナ愛好'], hours: ['24時間', '12:00–翌9:00'],
    age: { '20代': 29, '30代': 32, '40代': 22, '50代': 12, '60代〜': 5 },
    poster: 'ロッカー前 掲出面 B2' },
  small:  { v: [8000, 15000], wd: [54, 66], fem: [48, 58], cons: [22, 34], buf: 4,
    tags: ['女性ひとり湯', 'シニア'], hours: ['12:00–23:00', '14:00–24:00'],
    age: { '20代': 13, '30代': 22, '40代': 26, '50代': 23, '60代〜': 16 },
    poster: '入口 掲出面 B2' },
};

const OPENERS = {
  urban: ['平日夜のビジネス利用が中心。仕事帰りの単独来館が多く、滞在は短いが回転が速い。',
    'オフィス街の朝サウナ需要が大きく、平日の比率が高い。',
    '駅至近で、出張者と近隣勤務者の利用が半々。',
    '打ち合わせ帰りの利用が多く、平日の夕方から夜にかけて混み合う。'],
  sauna: ['ロウリュの回数が多く、サウナ目的の来館が大半を占める。',
    '水風呂の評価が高く、遠方からの来館も多い。',
    'サウナ室の増設後、20〜30代男性の比率が伸びている。',
    '整い椅子と外気浴スペースが広く、滞在時間が長い。'],
  family: ['土日のファミリー利用が中心で、館内着で長時間過ごす来館者が多い。',
    '地元の常連が支える施設で、曜日を問わず来館が安定している。',
    '食事処とキッズスペースを併設し、休日は家族連れで賑わう。',
    '駐車場が広く、車での来館が大半を占める。'],
  resort: ['観光と地元利用が半々。滞在型で、館内での認知形成に向く。',
    '温泉地の中核施設で、宿泊客の立ち寄りが多い。',
    '露天からの眺望が評価され、休日は女性グループの利用が目立つ。',
    'シーズンによって来館者数の変動が大きい。'],
  night: ['深夜から早朝の利用が厚く、仮眠目的の来館も多い。',
    '終電後の来館が多く、若年層の比率が高い。',
    '24時間営業で、時間帯によって客層が入れ替わる。',
    '週末の深夜帯は満館になることが多い。'],
  small: ['小規模だが常連比率が高く、丁寧に手に取ってもらえる環境。',
    '地域密着型で、近隣住民の日常利用が中心。',
    '規模は大きくないが、リピート率が高い。',
    '落ち着いた雰囲気で、ゆっくり滞在する来館者が多い。'],
};
const CLOSERS = [
  '化粧品サンプリングとの相性がよく、女性向け商材の消化が速い。',
  '飲料・サプリメントの反応が良い。',
  '館内着のポケットに入るサイズのサンプルが特に消化される。',
  '持ち帰り前提のサンプリングが機能しやすい。',
  '掲出面の視認性が高く、認知目的の出稿に向く。',
  '滞在時間が長いため、じっくり読ませる訴求が効く。',
];
const NG_POOL = ['たばこ', '賭博', '宗教', '消費者金融'];

function buildFacility(row) {
  const [id, name, pref, prefName, city, station, walkMin, lng, lat, prof] = row;
  const P = PROFILES[prof];
  const r = rnd('gen:' + id);
  const pick = (arr) => arr[Math.floor(r() * arr.length) % arr.length];
  const between = ([a, b]) => a + (b - a) * r();

  const monthlyVisitors = Math.round(between(P.v) / 500) * 500;
  const scale = monthlyVisitors / 26000;
  const avgConsumption = Math.round(between(P.cons) * (0.8 + scale * 0.3));
  const campaignCount = Math.round(r() * 11 * (0.5 + scale * 0.6));

  const age = {};
  let sum = 0;
  for (const [k, v] of Object.entries(P.age)) {
    const x = Math.max(3, Math.round(v + (r() - 0.5) * 7));
    age[k] = x; sum += x;
  }
  const ageKeys = Object.keys(age);
  age[ageKeys[0]] += 100 - sum;

  const tags = [...P.tags];
  if (r() < 0.35) { const extra = pick(AUDIENCE_TAGS); if (!tags.includes(extra)) tags.push(extra); }

  const basePrice = Math.max(40000, Math.min(170000, Math.round(monthlyVisitors * 3.4 / 5000) * 5000));
  const capMale = Math.max(1, Math.min(4, Math.round(1 + scale * 1.9)));
  const slots = [];
  slots.push({ id: id + '-s1', name: '男性脱衣所ラックA', type: 'SAMPLING', capacity: capMale,
    price: basePrice, exclusive: [pick(['飲料', 'サプリメント', '健康食品']), pick(['ボディケア', 'ヘアケア'])] });
  if (!(prof === 'small' && r() < 0.3)) {
    slots.push({ id: id + '-s2', name: '女性脱衣所ラックB', type: 'SAMPLING',
      capacity: Math.max(1, capMale - 1),
      price: Math.round(basePrice * 1.08 / 1000) * 1000,
      exclusive: [pick(['スキンケア', 'ヘアケア']), pick(['日用品', 'ボディケア'])] });
  }
  slots.push({ id: id + '-s3', name: P.poster, type: 'POSTER',
    capacity: Math.max(2, Math.min(4, capMale + 1)),
    price: Math.round(basePrice * 0.62 / 1000) * 1000, exclusive: [] });
  if (monthlyVisitors > 27000 && r() < 0.55) {
    slots.push({ id: id + '-s4', name: '催事スペース', type: 'EVENT', capacity: r() < 0.5 ? 1 : 2,
      price: Math.round(basePrice * 0.48 / 1000) * 1000, exclusive: [] });
  }

  const cases = [];
  const nCase = campaignCount > 0 ? Math.min(3, Math.ceil(campaignCount / 4)) : 0;
  const samplingSlots = slots.filter((s) => s.type === 'SAMPLING');
  for (let i = 0; i < nCase; i++) {
    const days = pick([14, 14, 21, 30]);
    const perDay = Math.round(avgConsumption * (0.82 + r() * 0.42));
    const qty = Math.round((perDay * days * (0.75 + r() * 0.4)) / 50) * 50;
    const consumed = Math.min(qty, Math.round(qty * (0.78 + r() * 0.24)));
    const mon = 2 + Math.floor(r() * 7);
    cases.push({ cat: pick(CATEGORIES),
      period: '2026-' + String(mon).padStart(2, '0') + ' / ' + days + '日間',
      qty, consumed, perDay, slot: pick(samplingSlots).name });
  }

  const ng = NG_POOL.filter(() => r() < 0.5);
  return {
    id, lng, lat, name, brand: name.split(' ')[0], pref, prefName, city, station, walkMin,
    hours: pick(P.hours), holiday: r() < 0.16 ? Math.floor(r() * 5) + 1 : null,
    hue: Math.floor(r() * 360),
    monthlyVisitors, weekdayRatio: Math.round(between(P.wd)), femaleRatio: Math.round(between(P.fem)),
    ageMix: age, audienceTags: tags,
    verified: r() < 0.62 ? '2026-0' + (3 + Math.floor(r() * 5)) : null,
    avgConsumption, campaignCount, receivingBufferDays: P.buf,
    ngIndustries: ng.length ? ng : ['賭博'],
    blurb: pick(OPENERS[prof]) + pick(CLOSERS),
    cases, currentSamples: [], slots,
  };
}

export const FACILITIES = [...BASE_FACILITIES, ...SEED_ROWS.map(buildFacility)];

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
