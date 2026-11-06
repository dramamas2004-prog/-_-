// يجهّز بيانات التطبيق وقت البناء: النص + (الصفحات/الأجزاء) + (التفسير). الأجزاء الاختيارية لا تُفشل البناء.
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..'), OUT = path.join(ROOT, 'www', 'data');
fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const write = (n, o) => fs.writeFileSync(path.join(OUT, n), JSON.stringify(o));

async function getJSON(url, tries = 4) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(30000) });
      if (r.ok) return await r.json();
      if (r.status === 404) return null;
    } catch (e) {}
    await sleep(800 * (i + 1));
  }
  return null;
}
async function pool(items, n, fn) {
  const res = new Array(items.length); let i = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    while (i < items.length) { const k = i++; res[k] = await fn(items[k], k); }
  }));
  return res;
}

/* ---------- 1) النص (إجباري) ---------- */
const src = path.join(ROOT, 'node_modules', 'quran-json', 'dist', 'quran.json');
const data = JSON.parse(fs.readFileSync(src, 'utf8'));
const Q = data.map(s => ({ n: s.id, name: s.name, en: s.transliteration, type: s.type, v: s.verses.map(v => v.text) }));
const total = Q.reduce((a, s) => a + s.v.length, 0);
if (Q.length !== 114 || total !== 6236) { console.error('خطأ: عدد السور/الآيات غير صحيح', Q.length, total); process.exit(1); }
write('quran.json', Q);
console.log('OK نص القرآن: 114 سورة، 6236 آية');
const counts = Q.map(s => s.v.length);
const offs = []; counts.reduce((a, c, i) => (offs[i] = a, a + c), 0);

/* ---------- 2) الصفحات والأجزاء (اختياري) ---------- */
function validMeta(pg, rub) {
  if (pg.length !== 6236 || rub.length !== 6236) return false;
  for (let i = 0; i < 6236; i++) {
    if (!(pg[i] >= 1 && pg[i] <= 604) || !(rub[i] >= 1 && rub[i] <= 240)) return false;
    if (i && (pg[i] < pg[i - 1] || rub[i] < rub[i - 1])) return false;
  }
  return new Set(pg).size === 604 && new Set(rub).size === 240;
}
async function metaQuranCom() {
  const per = await pool([...Array(114).keys()], 4, async c => {
    const n = c + 1, P = [], R = []; let page = 1;
    for (let guard = 0; guard < 20; guard++) {
      const j = await getJSON(`https://api.quran.com/api/v4/verses/by_chapter/${n}?language=ar&words=false&per_page=50&page=${page}`);
      if (!j || !j.verses) return null;
      for (const v of j.verses) { const a = +String(v.verse_key).split(':')[1]; P[a - 1] = v.page_number; R[a - 1] = v.rub_el_hizb_number; }
      const nx = j.pagination && j.pagination.next_page; if (!nx) break; page = nx;
    }
    return { P, R };
  });
  if (per.some(x => !x)) return null;
  const pg = [], rub = [];
  per.forEach((x, i) => { for (let a = 0; a < counts[i]; a++) { pg.push(x.P[a]); rub.push(x.R[a]); } });
  return validMeta(pg, rub) ? { pg, rub } : null;
}
async function metaTanzil() {
  const r = await fetch('https://tanzil.net/res/text/metadata/quran-data.js', { signal: AbortSignal.timeout(30000) });
  if (!r.ok) return null;
  const ctx = { QuranData: {} }; vm.createContext(ctx); vm.runInContext(await r.text(), ctx);
  const D = ctx.QuranData || {};
  const starts = arr => (arr || []).filter(x => x && x[0] >= 1).map(x => offs[x[0] - 1] + x[1] - 1);
  const pS = starts(D.Page), rS = starts(D.HizbQuarter);
  if (pS.length !== 604 || rS.length !== 240) return null;
  const pg = [], rub = []; let p = 0, q = 0;
  for (let i = 0; i < 6236; i++) {
    while (p + 1 < 604 && pS[p + 1] <= i) p++;
    while (q + 1 < 240 && rS[q + 1] <= i) q++;
    pg.push(p + 1); rub.push(q + 1);
  }
  return validMeta(pg, rub) ? { pg, rub } : null;
}
async function buildMeta() {
  for (const [name, fn] of [['quran.com', metaQuranCom], ['tanzil', metaTanzil]]) {
    try { const m = await fn(); if (m) { write('meta.json', m); console.log('OK الصفحات والأجزاء من', name); return; } } catch (e) {}
    console.warn('WARN تعذر جلب الصفحات من', name);
  }
  console.warn('WARN لن تظهر ميزات الصفحات/الأجزاء/الورد');
}

/* ---------- 3) التفسير (اختياري) ---------- */
const clean = t => String(t).replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/[ \t]+\n/g, '\n').trim();
function extract(json, count) {
  let best = null;
  (function walk(o) {
    if (!o || typeof o !== 'object') return;
    if (Array.isArray(o)) {
      if (o.length && o.every(x => x && typeof x === 'object' && typeof x.text === 'string')) { if (!best || o.length > best.length) best = o; return; }
      o.forEach(walk);
    } else Object.values(o).forEach(walk);
  })(json);
  if (!best) return null;
  const arr = new Array(count).fill('');
  best.forEach((x, i) => {
    let a = x.ayah ?? x.aya ?? x.verse ?? x.verse_number ?? x.ayah_number;
    if (a === undefined && x.verse_key) a = +String(x.verse_key).split(':')[1];
    if (a === undefined) a = i + 1;
    a = +a; if (a >= 1 && a <= count) arr[a - 1] = clean(x.text);
  });
  return arr;
}
const TAFSIRS = {
  muyassar: { name: 'التفسير الميسر', srcs: [
    n => `https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafsir-muyassar/${n}.json`,
    n => `https://api.quran.com/api/v4/quran/tafsirs/16?chapter_number=${n}` ] },
  saadi: { name: 'تفسير السعدي', srcs: [
    n => `https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/ar-tafseer-al-saddi/${n}.json`,
    n => `https://api.quran.com/api/v4/quran/tafsirs/91?chapter_number=${n}` ] }
};
async function buildTafsir() {
  const out = { names: {}, data: {} };
  for (const [key, T] of Object.entries(TAFSIRS)) {
    for (let si = 0; si < T.srcs.length; si++) {
      const res = await pool([...Array(114).keys()], 6, async c => {
        const j = await getJSON(T.srcs[si](c + 1)); return j ? extract(j, counts[c]) : null;
      });
      if (res.some(x => !x)) { console.warn(`WARN ${key}: المصدر ${si + 1} ناقص`); continue; }
      const filled = res.reduce((a, x) => a + x.filter(Boolean).length, 0);
      if (filled / 6236 < 0.5) { console.warn(`WARN ${key}: المصدر ${si + 1} قليل المحتوى`); continue; }
      out.names[key] = T.name; out.data[key] = res; console.log(`OK ${T.name} (مصدر ${si + 1})`); break;
    }
  }
  if (Object.keys(out.data).length) write('tafsir.json', out); else console.warn('WARN لن يظهر التفسير');
}

(async () => {
  try { await buildMeta(); } catch (e) { console.warn('WARN meta', e.message); }
  try { await buildTafsir(); } catch (e) { console.warn('WARN tafsir', e.message); }
})();
