(() => {
'use strict';
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const app = $('#app'), sheet = $('#sheet'), toastEl = $('#toast'), modal = $('#modal');
const tbar = $('#tbar'), bbar = $('#bbar'), badge = $('#badge'), rhead = $('#rhead'), rnum = $('#rnum');
const AR = n => String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v) } catch { return d } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)) } catch {} }
};
function hideStatusBar() { try { const r = CAP().StatusBar.hide(); if (r && r.catch) r.catch(() => {}); } catch {} }
const _pl = {};
const plug = n => {
  if (_pl[n]) return _pl[n];
  try { const C = window.Capacitor; _pl[n] = (C.Plugins && C.Plugins[n]) || (C.registerPlugin && C.registerPlugin(n)) || null; } catch { _pl[n] = null; }
  return _pl[n];
};
const CAP = () => new Proxy({}, { get: (_, n) => plug(n) });
const esc = t => String(t).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

/* ---------- الحالة ---------- */
const DEF = { theme: 'night', fs: 30, fri: true, friT: '08:00', wirdOn: false, wirdT: '20:00', keep: false, dim: 0, taf: 'muyassar', read: 'pages' };
let st = Object.assign({}, DEF, store.get('st', null) || { theme: store.get('theme', 'night'), fs: store.get('fs', 30), fri: store.get('fri', true) });
const saveSt = () => store.set('st', st);
const COLORS = ['#f5d547', '#5ed39b', '#5aa9ff', '#ff7aa8', '#b48cff'];
let ann = store.get('ann', null);
if (!ann) { ann = {}; (store.get('marks', []) || []).forEach(m => ann[m.s + ':' + m.a] = { b: 1, t: Date.now() }); store.set('ann', ann); }
const saveAnn = () => store.set('ann', ann);
const key = (s, a) => s + ':' + a;
function setAnn(s, a, patch) {
  const k = key(s, a), o = Object.assign({}, ann[k] || {}, patch);
  if (!o.b) delete o.b; if (o.c == null) delete o.c; if (!o.n) delete o.n;
  if (!o.b && o.c === undefined && !o.n) delete ann[k]; else { o.t = Date.now(); ann[k] = o; }
  saveAnn();
}
let plan = store.get('plan', null), last = store.get('last', null), kahf = store.get('kahf', '');
let focusAyah = null, Q = [], norm = [], FS = [], FA = [], off = [], M = null, TAF = null, touched = false, navDir = '', homeTab = 's', mFilter = 'all';
const idx = (s, a) => off[s - 1] + a - 1;
const todayKey = () => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate() };
const isFri = () => new Date().getDay() === 5;
const dayStart = d => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
const parseKey = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d) };
const planDay = () => plan ? Math.floor((dayStart(new Date()) - dayStart(parseKey(plan.start))) / 864e5) : -1;
const wirdRange = day => [Math.floor(day * 604 / plan.days) + 1, Math.floor((day + 1) * 604 / plan.days)];
const savePlan = () => store.set('plan', plan);
const strip = t => t.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0640\u08D3-\u08FF]/g, '').replace(/[ٱأإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ۡ/g, '');

function rubLabel(r) {
  const h = Math.floor((r - 1) / 4) + 1, q = (r - 1) % 4, j = Math.ceil(r / 8);
  if (q === 0) return (r - 1) % 8 === 0 ? `الجزء ${AR(j)} · الحزب ${AR(h)}` : `الحزب ${AR(h)}`;
  return ['', 'ربع الحزب ', 'نصف الحزب ', 'ثلاثة أرباع الحزب '][q] + AR(h);
}
const pageOf = (s, a) => M ? M.pg[idx(s, a)] : 0;

/* ---------- المظهر ---------- */
const THEME_COLOR = { night: '#0a0a0b', light: '#fafafa', sepia: '#f1e6cb', warm: '#120b06' };
function applyLook() {
  const keepC = ['reading', 'pagemode'].filter(c => document.body.classList.contains(c));
  document.body.className = 'theme-' + st.theme + ' ' + keepC.join(' ');
  document.documentElement.style.setProperty('--fs', st.fs + 'px');
  document.querySelector('meta[name=theme-color]').content = THEME_COLOR[st.theme] || '#0a0a0b';
  $('#dim').style.opacity = (st.dim || 0) / 100;
}
const reading = on => { document.body.classList.toggle('reading', on); if (!on) readerOff(); };
const pageMode = on => document.body.classList.toggle('pagemode', on);
/* أشرطة القراءة: تظهر عند اللمس وتختفي بعد 7 ثوانٍ */
let barT, bgT;
function barsHide() { tbar.classList.add('hid'); bbar.classList.add('hid'); }
function barsShow() {
  tbar.classList.remove('hid'); if (!bbar.hidden) bbar.classList.remove('hid');
  clearTimeout(barT);
  barT = setTimeout(function chk() { if (!sheet.hidden || !modal.hidden) { barT = setTimeout(chk, 3000); return; } barsHide(); }, 7000);
}
const barsToggle = () => tbar.classList.contains('hid') ? barsShow() : barsHide();
function readerOff() {
  [tbar, bbar, badge, rhead, rnum].forEach(e => e.hidden = true);
  barsHide(); clearTimeout(barT); document.body.classList.remove('pagemode');
}
function announce(j, h) {
  badge.innerHTML = j ? `<span>الجزء ${AR(j)}</span>${h ? `<i></i><span>الحزب ${AR(h)}</span>` : ''}` : `<span>الحزب ${AR(h)}</span>`;
  badge.hidden = false; badge.classList.remove('show'); void badge.offsetWidth; badge.classList.add('show');
  clearTimeout(bgT); bgT = setTimeout(() => { badge.classList.remove('show'); setTimeout(() => { badge.hidden = true; }, 500); }, 3000);
}
function announceBetween(a, b) {
  if (!M || b <= a) return; let cand = 0;
  for (let r = 1; r <= 240; r += 4) { const i = M.rubStart[r]; if (i > a && i <= b) cand = r; }
  if (cand) announce((cand - 1) % 8 === 0 ? (cand - 1) / 8 + 1 : 0, Math.floor((cand - 1) / 4) + 1);
}
const pgsWord = n => n === 1 ? 'صفحة واحدة' : n === 2 ? 'صفحتان' : n <= 10 ? AR(n) + ' صفحات' : AR(n) + ' صفحة';
function tapHandler(e) {
  const el = e.target.closest('.a');
  if (el) { pick(+el.dataset.s, +el.dataset.a, el); barsShow(); return; }
  if (!sheet.hidden) { hideSheet(); return; }
  barsToggle();
}
function hint() { if (!store.get('hint2', false)) { store.set('hint2', true); setTimeout(() => toast('اضغط على الشاشة لإظهار الأدوات'), 600); } }
let awake = false;
function setAwake(on) {
  on = on && st.keep; if (on === awake) return; awake = on;
  const k = CAP().KeepAwake; if (!k) return;
  try { const r = on ? k.keepAwake() : k.allowSleep(); if (r && r.catch) r.catch(() => {}); } catch {}
}
const hideSheet = () => { sheet.hidden = true; $$('.a.sel').forEach(e => e.classList.remove('sel')); };
function openModal(html) {
  modal.innerHTML = `<div class="mc glass">${html}</div>`; modal.hidden = false;
  modal.onclick = e => { if (e.target === modal) closeModal(); };
  const c = modal.querySelector('[data-close]'); if (c) c.onclick = closeModal;
}
function closeModal() { modal.hidden = true; modal.innerHTML = ''; }
let tt; const toast = m => { toastEl.textContent = m; toastEl.hidden = false; clearTimeout(tt); tt = setTimeout(() => toastEl.hidden = true, 3000); };

/* ---------- الرجوع ---------- */
function goBack() {
  if (!modal.hidden) return closeModal();
  if (!sheet.hidden) return hideSheet();
  const h = location.hash;
  if (!h || h === '#/') { try { CAP().App.exitApp(); } catch {} return; }
  if (history.length > 1) history.back(); else location.hash = '#/';
}
try { CAP().App && CAP().App.addListener('backButton', goBack); CAP().App.addListener('appStateChange', s => { if (s && s.isActive) hideStatusBar(); }); } catch {}
hideStatusBar();

/* ---------- الإشعارات ---------- */
async function syncNotifs(ask) {
  const ln = CAP().LocalNotifications; if (!ln) return;
  try {
    const ids = { notifications: [{ id: 101 }, { id: 102 }] };
    if (!(st.fri || (st.wirdOn && plan))) { await ln.cancel(ids); return; }
    let p = await ln.checkPermissions();
    if (p.display !== 'granted') {
      if (!ask) return;
      p = await ln.requestPermissions();
      if (p.display !== 'granted') { toast('فعّل الإشعارات من إعدادات الهاتف'); return; }
    }
    await ln.cancel(ids);
    const hm = t => { const [h, m] = String(t).split(':').map(Number); return { hour: h || 0, minute: m || 0 }; };
    const list = [];
    if (st.fri) list.push({ id: 101, title: 'جمعة مباركة 🌙', body: 'لا تنسَ قراءة سورة الكهف اليوم', smallIcon: 'ic_stat_noor', largeIcon: 'noor_logo',
      schedule: { on: Object.assign({ weekday: 6 }, hm(st.friT)), allowWhileIdle: true } });
    if (st.wirdOn && plan) list.push({ id: 102, title: 'وردك اليومي 📖', body: 'حان موعد وردك من القرآن الكريم', smallIcon: 'ic_stat_noor', largeIcon: 'noor_logo',
      schedule: { on: hm(st.wirdT), allowWhileIdle: true } });
    if (list.length) await ln.schedule({ notifications: list });
  } catch (e) {}
}

/* ---------- عناصر مشتركة ---------- */
const BELL = '<svg viewBox="0 0 24 24"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10.3 20a1.9 1.9 0 0 0 3.4 0"/></svg>';
function ayahHTML(s, a, t) {
  const o = ann[key(s, a)] || {};
  const c = o.c !== undefined ? ` style="background:${COLORS[o.c]}40"` : '';
  return `<span class="a${o.b ? ' mk' : ''}" data-s="${s}" data-a="${a}"${c}>${t}<span class="e">${AR(a)}</span>${o.n ? '<span class="nt">✎</span>' : ''}</span> `;
}
function divider(i, pagesOnly) {
  if (!M) return '';
  const parts = [];
  if (M.pageStart[M.pg[i]] === i) parts.push('صفحة ' + AR(M.pg[i]));
  if (!pagesOnly && M.rubStart[M.rub[i]] === i) parts.push(rubLabel(M.rub[i]));
  return parts.length ? `<span class="pgm">${parts.join(' · ')}</span>` : '';
}
const bsmHTML = s => (s !== 1 && s !== 9) ? '<div class="bsm">بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ</div>' : '';
function dayAyah() {
  const d = new Date(); let seed = d.getFullYear() * 372 + d.getMonth() * 31 + d.getDate();
  for (let k = 0; k < 200; k++) {
    seed = (Math.imul(seed, 1103515245) + 12345) & 0x7fffffff;
    const i = seed % 6236, t = Q[FS[i] - 1].v[FA[i] - 1];
    if (t.length > 40 && t.length < 190) return { s: FS[i], a: FA[i] };
  }
  return { s: 2, a: 255 };
}
function topAyahEl() {
  const top = app.getBoundingClientRect().top + 24;
  for (const el of app.querySelectorAll('.a')) if (el.getBoundingClientRect().bottom > top) return el;
  return null;
}
function jump(el) {
  const r = el.getBoundingClientRect(), a = app.getBoundingClientRect();
  app.scrollTop += r.top - a.top - app.clientHeight / 2 + r.height / 2;
}
function scrollToAyah(target) {
  if (!target) return;
  target.classList.add('flash');
  const go = () => { if (!touched && target.isConnected) jump(target); };
  requestAnimationFrame(go);
  [100, 350, 800, 1500].forEach(t => setTimeout(go, t));
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(go);
  app.addEventListener('touchstart', () => touched = true, { once: true });
}

/* ---------- الصفحة الرئيسية ---------- */
function wirdCard() {
  if (!plan || !M) return '';
  const day = planDay(), D = plan.days; if (day < 0) return '';
  const cnt = Object.keys(plan.done).length, C = 163.4;
  if (day >= D) return `<div class="wird glass"><div class="ring"><svg viewBox="0 0 64 64"><circle class="rt" cx="32" cy="32" r="26"/><circle class="rf" cx="32" cy="32" r="26" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - cnt / D)}"/></svg><b>${AR(Math.round(cnt / D * 100))}٪</b></div>
    <div class="wt"><h3>انتهت مدة الخطة</h3><p>أكملت ${AR(cnt)} من ${AR(D)} يوم</p></div><button class="btn" id="wnew">خطة جديدة</button></div>`;
  const [a, b] = wirdRange(day), done = !!plan.done[day];
  let streak = 0; for (let d = done ? day : day - 1; d >= 0 && plan.done[d]; d--) streak++;
  let late = 0; for (let d = 0; d < day; d++) if (!plan.done[d]) late++;
  return `<div class="wird glass"><div class="ring"><svg viewBox="0 0 64 64"><circle class="rt" cx="32" cy="32" r="26"/><circle class="rf" cx="32" cy="32" r="26" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - cnt / D)}"/></svg><b>${AR(cnt)}/${AR(D)}</b></div>
    <div class="wt"><h3>${done ? 'ورد اليوم مكتمل ✓' : 'ورد اليوم'}</h3>
      <p>صفحات ${AR(a)}–${AR(b)} · اليوم ${AR(day + 1)}${streak > 1 ? ` · 🔥 ${AR(streak)} أيام متتالية` : ''}${late ? ` · متأخر ${AR(late)}` : ''}</p></div>
    <div class="acts"><a class="btn" href="#/p/${a}">${done ? 'مراجعة' : 'ابدأ'}</a>${done ? '' : '<button class="btn ghost" id="wdone">تمّ ✓</button>'}</div></div>`;
}
function juzHTML() {
  let h = `<div class="goto glass"><input class="q" id="gp" type="number" min="1" max="604" inputmode="numeric" placeholder="اذهب إلى صفحة (١–٦٠٤)"><button class="btn" id="gb">اذهب</button></div><div class="group glass">`;
  for (let j = 1; j <= 30; j++) {
    const r0 = (j - 1) * 8 + 1, i = M.rubStart[r0];
    h += `<details class="jz"><summary><div class="num">${AR(j)}</div><div class="grow"><div class="nm">الجزء ${AR(j)}</div>
      <div class="meta">${Q[FS[i] - 1].name} · آية ${AR(FA[i])} · صفحة ${AR(M.pg[i])}</div></div><span class="chev">‹</span></summary><div class="rubs">`;
    for (let k = 0; k < 8; k++) {
      const r = r0 + k, ii = M.rubStart[r];
      h += `<a href="#/s/${FS[ii]}/${FA[ii]}"><span>${rubLabel(r)}</span><small>${Q[FS[ii] - 1].name} ${AR(FA[ii])} · ص ${AR(M.pg[ii])}</small></a>`;
    }
    h += '</div></details>';
  }
  return h + '</div>';
}
function home() {
  reading(false);
  const now = new Date();
  const wd = new Intl.DateTimeFormat('ar-EG', { weekday: 'long' }).format(now);
  const g = now.getDate() + '/' + (now.getMonth() + 1) + '/' + now.getFullYear();
  let hj = ''; try { hj = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura-nu-arab', { day: 'numeric', month: 'long', year: 'numeric' }).format(now); } catch {}
  const done = kahf === todayKey(), l = last && Q[last.s - 1], D = dayAyah();
  const href = l ? `#/s/${last.s}/${last.a}` : '#/s/1/1';
  app.innerHTML = `
  <div class="head"><img class="logo" src="assets/logo.png" alt="">
    <div class="hx"><div class="wd">${wd}</div><div class="dts"><span class="gd">${g}</span>${hj ? '<i></i>' : ''}<span class="hd">${hj}</span></div></div></div>
  ${isFri() && st.fri ? `<div class="fri glass ${done ? 'done' : ''}">
    <div class="bell">${BELL}${done ? '' : '<b class="dot"></b>'}</div>
    <div class="ft"><h3>${done ? 'ما شاء الله، أتممت سورة الكهف' : 'جمعة مباركة'}</h3>
      <p>${done ? 'تقبّل الله منك صالح الأعمال' : 'لا تنسَ قراءة سورة الكهف اليوم'}</p></div>
    <div class="acts"><a class="btn" href="#/s/18">${done ? 'مراجعة' : 'اقرأ'}</a>
      ${done ? '' : '<button class="btn ghost" id="kd">تمّت ✓</button>'}</div></div>` : ''}
  ${wirdCard()}
  <div class="daily glass"><small>✦ آية اليوم</small><div class="dt">﴿${Q[D.s - 1].v[D.a - 1]}﴾</div>
    <div class="dr">${Q[D.s - 1].name} · آية ${AR(D.a)}</div>
    <div class="drow"><button class="btn ghost" data-d="taf">📖 تفسير</button><button class="btn ghost" data-d="img">🖼 صورة</button><a class="btn ghost" href="#/s/${D.s}/${D.a}">افتح</a></div></div>
  ${l ? `<div class="hero"><div class="hl"><small>آخر قراءة · آية ${AR(last.a)}${M ? ' · صفحة ' + AR(pageOf(last.s, last.a)) : ''}</small><h2>سورة ${l.name}</h2></div><a class="btn" href="${href}">أكمل القراءة</a></div>`
     : `<div class="hero"><div class="hl"><small>ابدأ رحلتك</small><h2>سورة الفاتحة</h2></div><a class="btn" href="#/s/1/1">ابدأ القراءة</a></div>`}
  ${M ? `<div class="seg glass"><button data-t="s" class="${homeTab === 's' ? 'on' : ''}">السور</button><button data-t="j" class="${homeTab === 'j' ? 'on' : ''}">الأجزاء والصفحات</button></div>` : ''}
  <div id="C"></div>`;
  $$('.seg button').forEach(b => b.onclick = () => { homeTab = b.dataset.t; home(); });
  const kd = $('#kd'); if (kd) kd.onclick = () => { kahf = todayKey(); store.set('kahf', kahf); home(); toast('تقبّل الله'); };
  const wd2 = $('#wdone'); if (wd2) wd2.onclick = () => { plan.done[planDay()] = true; savePlan(); home(); toast('تقبّل الله ورد اليوم 🌟'); };
  const wn = $('#wnew'); if (wn) wn.onclick = () => { location.hash = '#/settings'; };
  $$('[data-d]').forEach(b => b.onclick = () => b.dataset.d === 'taf' ? openTafsir(D.s, D.a) : openShare(D.s, D.a));
  const C = $('#C');
  if (homeTab === 'j' && M) {
    C.innerHTML = juzHTML();
    const go = () => { const n = +$('#gp').value; if (n >= 1 && n <= 604) location.hash = '#/p/' + n; else toast('اكتب رقم من ١ إلى ٦٠٤'); };
    $('#gb').onclick = go; $('#gp').onkeydown = e => { if (e.key === 'Enter') go(); };
  } else {
    C.innerHTML = '<input class="q" id="f" placeholder="ابحث عن سورة…" autocomplete="off"><div class="group glass" id="L"></div>';
    const draw = v => {
      const k = strip(v.trim());
      $('#L').innerHTML = Q.filter(s => !k || strip(s.name).includes(k) || s.en.toLowerCase().includes(k.toLowerCase()) || String(s.n) === k)
        .map(s => `<a href="#/s/${s.n}"><div class="num">${AR(s.n)}</div>
        <div class="grow"><div class="nm">${s.name}</div>
        <div class="meta">${s.type === 'meccan' ? 'مكية' : 'مدنية'} · ${AR(s.v.length)} آية${M ? ' · صفحة ' + AR(pageOf(s.n, 1)) : ''}</div></div>
        ${s.n === 18 && isFri() && st.fri && !done ? '<span class="pill">اليوم</span>' : ''}</a>`).join('');
    };
    draw(''); $('#f').oninput = e => draw(e.target.value);
  }
}

/* ---------- قراءة بالسورة ---------- */
function surah(n, ayah, keep) {
  reading(true); pageMode(false); hideSheet(); touched = false; setAwake(true);
  const s = Q[n - 1]; if (!s) { location.hash = '#/'; return; }
  rhead.hidden = true; rnum.hidden = true; bbar.hidden = true; tbar.hidden = false;
  tbar.innerHTML = `<button id="bk" aria-label="رجوع">›</button><div class="ttl"><b>${s.name}</b><small>${s.type === 'meccan' ? 'مكية' : 'مدنية'} · ${AR(s.v.length)} آية</small></div>
    <button id="ft" aria-label="حجم الخط">Aa</button>`;
  barsHide();
  app.innerHTML = `
  <div class="page">
   <div class="banner glass"><small>${s.type === 'meccan' ? 'مكية' : 'مدنية'} · ${AR(s.v.length)} آية</small><h2>سورة ${s.name}</h2></div>
   ${bsmHTML(n)}
   <div class="ay txt">${s.v.map((t, i) => divider(idx(n, i + 1), true) + ayahHTML(n, i + 1, t)).join('')}</div></div>`;
  app.onclick = tapHandler;
  $('#bk').onclick = goBack;
  $('#ft').onclick = () => { st.fs = st.fs >= 44 ? 24 : st.fs + 4; saveSt(); applyLook(); barsShow(); };
  app.scrollTop = 0;
  if (ayah) scrollToAyah(app.querySelector(`.a[data-a="${ayah}"]`));
  const updPg = () => { if (!M) return; const el = topAyahEl(); if (el) { rnum.textContent = 'صفحة ' + AR(pageOf(n, +el.dataset.a)); } };
  if (M) { rnum.hidden = false; rnum.className = 'r pl'; rnum.textContent = 'صفحة ' + AR(pageOf(n, ayah || 1)); [400, 1700].forEach(t => setTimeout(() => { if (rnum.classList.contains('pl')) updPg(); }, t)); }
  if (!keep) hint();
  let pt; 
  let tm; app.onscroll = () => {
    if (!sheet.hidden) hideSheet();
    if (!tbar.classList.contains('hid')) barsHide();
    if (!pt) pt = setTimeout(() => { pt = 0; updPg(); }, 140);
    clearTimeout(tm); tm = setTimeout(() => {
      const el = topAyahEl();
      if (el) {
        const a = +el.dataset.a; last = { s: n, a, m: 's' }; store.set('last', last);
      }
      if (n === 18 && isFri() && kahf !== todayKey() && app.scrollTop + app.clientHeight >= app.scrollHeight - 140) {
        kahf = todayKey(); store.set('kahf', kahf); toast('تقبّل الله ختمة الكهف ✨');
      }
    }, 350);
  };
}

/* ---------- قراءة بالصفحات (المصحف) — تنقل سلس بالسحب ---------- */
let PG = null;
function pageInfo(p) {
  const i0 = M.pageStart[p], i1 = p < 604 ? M.pageStart[p + 1] : 6236;
  const r0 = M.rub[i0], j = Math.ceil(r0 / 8), hz = Math.floor((r0 - 1) / 4) + 1;
  const names = [...new Set(Array.from({ length: i1 - i0 }, (_, k) => Q[FS[i0 + k] - 1].name))];
  let hit = null; for (let i = i0; i < i1; i++) { const r = M.rub[i]; if (M.rubStart[r] === i && (r - 1) % 4 === 0) hit = r; }
  let rem;
  if (j < 30) { const d = M.pg[M.rubStart[j * 8 + 1]] - p; rem = d <= 0 ? `الجزء ${AR(j + 1)} يبدأ هنا` : `باقي ${pgsWord(d)} للجزء ${AR(j + 1)}`; }
  else { const d = 604 - p; rem = d ? `باقي ${pgsWord(d)} للختام` : 'ختام المصحف 🤍'; }
  return { i0, i1, j, hz, names, hit, rem };
}
function pageHTML(p) {
  const { i0, i1 } = pageInfo(p); let html = '';
  for (let i = i0; i < i1; i++) {
    const s = FS[i], a = FA[i];
    if (a === 1) html += `<div class="banner glass"><h2>سورة ${Q[s - 1].name}</h2></div>${bsmHTML(s)}`;
    html += ayahHTML(s, a, Q[s - 1].v[a - 1]);
  }
  return html;
}
function fitPanel(el) {
  const box = el.querySelector('.pgbox'), inner = el.querySelector('.pg'), H = box.clientHeight; if (!H) return;
  let lo = 12, hi = 34;
  for (let k = 0; k < 9; k++) { const m = (lo + hi) / 2; box.style.setProperty('--fs', m + 'px'); if (inner.offsetHeight <= H) lo = m; else hi = m; }
  box.style.setProperty('--fs', lo + 'px');
}
const place = (el, x, anim) => { if (!el) return; el.style.transition = anim ? 'transform .42s cubic-bezier(.22,.8,.2,1)' : 'none'; el.style.transform = `translate3d(${x}px,0,0)`; };
function mkPanel(q, x) {
  const el = document.createElement('div'); el.className = 'pgp';
  el.innerHTML = `<div class="pgbox"><div class="ay txt pg">${pageHTML(q)}</div></div>`;
  PG.host.appendChild(el); fitPanel(el); place(el, x); return el;
}
function setPageInfo(p, keep) {
  const I = pageInfo(p);
  rhead.hidden = false;
  rhead.innerHTML = `<span class="rs">${I.names.join(' · ')}</span><span class="rc"><b>الجزء ${AR(I.j)}</b><i></i><b>الحزب ${AR(I.hz)}</b></span><span class="rl">${I.rem}</span>`;
  rhead.classList.remove('fade'); void rhead.offsetWidth; rhead.classList.add('fade');
  rnum.hidden = false; rnum.className = p % 2 ? 'r' : 'l'; rnum.textContent = AR(p);
  const tb = tbar.querySelector('.ttl b'), ts = tbar.querySelector('.ttl small'), pc = $('#pc');
  if (tb) tb.textContent = 'صفحة ' + AR(p); if (ts) ts.textContent = I.names.join(' · '); if (pc) pc.textContent = AR(p) + ' / ' + AR(604);
  last = { s: FS[I.i0], a: FA[I.i0], m: 'p', p }; store.set('last', last);
  if (location.hash !== '#/p/' + p) { try { history.replaceState(null, '', '#/p/' + p); } catch {} }
  const old = $('#wd'); if (old) old.remove();
  if (plan && planDay() >= 0 && planDay() < plan.days && !plan.done[planDay()] && wirdRange(planDay())[1] === p) {
    const b = document.createElement('button'); b.className = 'btn wbtn'; b.id = 'wd'; b.textContent = 'تمّ ورد اليوم ✓';
    b.onclick = e => { e.stopPropagation(); plan.done[planDay()] = true; savePlan(); b.remove(); toast('تقبّل الله ورد اليوم 🌟'); };
    app.appendChild(b);
  }
  if (I.hit && !keep) announce((I.hit - 1) % 8 === 0 ? (I.hit - 1) / 8 + 1 : 0, Math.floor((I.hit - 1) / 4) + 1);
}
function pgSnap() { const { cur, next, prev, W } = PG; place(cur, 0, 1); place(next, -W, 1); place(prev, W, 1); }
function pgCommit(dir) {
  if (!PG || PG.busy) return;
  const to = PG.p + dir; if (to < 1 || to > 604) return pgSnap();
  const { cur, next, prev, W, tok } = PG, tgt = dir > 0 ? next : prev;
  if (!tgt) return pgSnap();
  PG.busy = true; hideSheet();
  if (dir > 0) { place(cur, W, 1); place(next, 0, 1); } else { place(cur, -W, 1); place(prev, 0, 1); }
  PG.p = to; setPageInfo(to);
  setTimeout(() => {
    if (!PG || PG.tok !== tok) return;
    if (dir > 0) { if (prev) prev.remove(); PG.prev = cur; PG.cur = next; PG.next = null; }
    else { if (next) next.remove(); PG.next = cur; PG.cur = prev; PG.prev = null; }
    const nn = to + dir;
    if (nn >= 1 && nn <= 604) { if (dir > 0) PG.next = mkPanel(nn, -W); else PG.prev = mkPanel(nn, W); }
    PG.busy = false;
  }, 450);
}
function pageView(p, keep) {
  if (!M || !(p >= 1 && p <= 604)) { location.hash = '#/'; return; }
  reading(true); pageMode(true); hideSheet(); touched = false; setAwake(true);
  tbar.hidden = false; bbar.hidden = false;
  tbar.innerHTML = '<button id="bk" aria-label="رجوع">›</button><div class="ttl"><b></b><small></small></div><span style="width:40px"></span>';
  bbar.innerHTML = '<button id="pp">السابقة ›</button><button class="cnt" id="pc"></button><button id="pn">‹ التالية</button>';
  barsHide();
  app.innerHTML = '<div id="pgs"></div>';
  const host = $('#pgs');
  PG = { host, p, W: host.clientWidth || window.innerWidth || 360, busy: false, tok: Math.random() };
  const tok = PG.tok, W = PG.W;
  PG.cur = mkPanel(p, 0);
  setPageInfo(p, keep);
  if (focusAyah && focusAyah.a) { const t = PG.cur.querySelector(`.a[data-s="${focusAyah.s}"][data-a="${focusAyah.a}"]`); if (t) t.classList.add('flash'); }
  focusAyah = null;
  setTimeout(() => { if (PG && PG.tok === tok) { if (p < 604) PG.next = mkPanel(p + 1, -W); if (p > 1) PG.prev = mkPanel(p - 1, W); } }, 60);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (PG && PG.tok === tok) [PG.cur, PG.next, PG.prev].forEach(e => e && fitPanel(e)); });
  $('#pn').onclick = () => pgCommit(1); $('#pp').onclick = () => pgCommit(-1);
  $('#bk').onclick = goBack;
  $('#pc').onclick = () => {
    openModal(`<div class="mh"><b>اذهب إلى صفحة</b><button data-close>✕</button></div>
      <input class="q" id="gp" type="number" min="1" max="604" inputmode="numeric" placeholder="١ – ٦٠٤"><button class="btn" id="gb" style="width:100%">اذهب</button>`);
    const go = () => { const n = +$('#gp').value; if (n >= 1 && n <= 604) { closeModal(); location.hash = '#/p/' + n; } else toast('اكتب رقم من ١ إلى ٦٠٤'); };
    $('#gb').onclick = go; $('#gp').focus();
  };
  app.onclick = tapHandler;
  let sx = 0, sy = 0, dx = 0, t0 = 0, drag = false, lock = false;
  host.ontouchstart = e => { if (PG.busy) return; sx = e.touches[0].clientX; sy = e.touches[0].clientY; dx = 0; t0 = Date.now(); drag = true; lock = false; };
  host.ontouchmove = e => {
    if (!drag) return;
    dx = e.touches[0].clientX - sx; const dy = e.touches[0].clientY - sy;
    if (!lock) { if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) lock = true; else return; }
    if (!sheet.hidden) hideSheet(); if (!tbar.classList.contains('hid')) barsHide();
    let x = dx; if ((x > 0 && !PG.next) || (x < 0 && !PG.prev)) x *= .25;
    place(PG.cur, x); place(PG.next, x - PG.W); place(PG.prev, x + PG.W);
  };
  host.ontouchend = () => {
    if (!drag) return; drag = false; if (!lock) return;
    const v = dx / Math.max(1, Date.now() - t0), thr = PG.W * .22;
    if ((dx > thr || v > .5) && PG.next) pgCommit(1); else if ((dx < -thr || v < -.5) && PG.prev) pgCommit(-1); else pgSnap();
  };
  if (!keep) hint();
}

/* ---------- قائمة الآية: علامة / لون / ملاحظة / تفسير / صورة ---------- */
function pick(s, a, el) {
  hideSheet(); el.classList.add('sel');
  const o = ann[key(s, a)] || {};
  sheet.hidden = false;
  sheet.innerHTML = `<div class="cols">${COLORS.map((c, i) => `<button class="cd${o.c === i ? ' on' : ''}" data-c="${i}" style="background:${c}"></button>`).join('')}<button class="cd x" data-c="-1">✕</button></div>
    <div class="acts2"><button data-x="b"><i>🔖</i>${o.b ? 'إزالة العلامة' : 'علامة'}</button><button data-x="n"><i>📝</i>${o.n ? 'تعديل الملاحظة' : 'ملاحظة'}</button><button data-x="t"><i>📖</i>تفسير</button>
    <button data-x="i"><i>🖼</i>صورة</button><button data-x="c"><i>📋</i>نسخ</button><button data-x="x"><i>✖</i>إغلاق</button></div>`;
  sheet.querySelectorAll('[data-c]').forEach(b => b.onclick = () => {
    const c = +b.dataset.c; setAnn(s, a, { c: c < 0 ? null : c });
    el.style.background = c < 0 ? '' : COLORS[c] + '40'; hideSheet();
  });
  sheet.querySelectorAll('[data-x]').forEach(b => b.onclick = async () => {
    const x = b.dataset.x;
    if (x === 'b') { setAnn(s, a, { b: !o.b }); el.classList.toggle('mk', !o.b); hideSheet(); toast(o.b ? 'أُزيلت العلامة' : 'تم حفظ العلامة'); }
    else if (x === 'n') { hideSheet(); openNote(s, a, el); }
    else if (x === 't') { hideSheet(); openTafsir(s, a); }
    else if (x === 'i') { hideSheet(); openShare(s, a); }
    else if (x === 'c') { try { await navigator.clipboard.writeText(`﴿${Q[s - 1].v[a - 1]}﴾ [${Q[s - 1].name}: ${a}]`); toast('تم النسخ'); } catch {} hideSheet(); }
    else hideSheet();
  });
}
function openNote(s, a, el) {
  const o = ann[key(s, a)] || {};
  openModal(`<div class="mh"><b>ملاحظة · ${Q[s - 1].name} ${AR(a)}</b><button data-close>✕</button></div>
    <textarea class="nta" id="nt" placeholder="اكتب ملاحظتك على الآية…">${esc(o.n || '')}</textarea>
    <div class="mnav"><button class="btn" id="ns">حفظ</button>${o.n ? '<button class="btn ghost" id="nd">حذف</button>' : ''}</div>`);
  $('#ns').onclick = () => { setAnn(s, a, { n: $('#nt').value.trim() }); closeModal(); route(true); toast('تم الحفظ'); };
  const nd = $('#nd'); if (nd) nd.onclick = () => { setAnn(s, a, { n: '' }); closeModal(); route(true); };
}

/* ---------- التفسير ---------- */
async function loadTaf() {
  if (TAF !== null) return TAF;
  try { const r = await fetch('data/tafsir.json'); TAF = r.ok ? await r.json() : false; } catch { TAF = false; }
  return TAF;
}
async function openTafsir(s, a) {
  const T = await loadTaf();
  if (!T || !T.data || !Object.keys(T.data).length) { toast('التفسير غير متوفر في هذا الإصدار'); return; }
  const keys = Object.keys(T.data); if (!T.data[st.taf]) st.taf = keys[0];
  const render = () => {
    const arr = T.data[st.taf][s - 1] || []; let j = a - 1;
    while (j > 0 && !arr[j]) j--;
    const txt = arr[j] || 'لا يوجد تفسير لهذه الآية في هذا المصدر.';
    openModal(`<div class="mh"><b>${Q[s - 1].name} · آية ${AR(a)}</b><button data-close>✕</button></div>
      <div class="mayah">﴿${Q[s - 1].v[a - 1]}﴾</div>
      ${keys.length > 1 ? `<div class="chips">${keys.map(k => `<button class="chip${k === st.taf ? ' on' : ''}" data-k="${k}">${T.names[k]}</button>`).join('')}</div>` : `<div class="tafnote">${T.names[keys[0]]}</div>`}
      ${j !== a - 1 && arr[j] ? `<div class="tafnote">تفسير مجمّع مع الآية ${AR(j + 1)}</div>` : ''}
      <div class="tafbody" id="tb"></div>
      <div class="mnav"><button class="btn ghost" id="tp">› السابقة</button><button class="btn ghost" id="tn">التالية ‹</button></div>`);
    $('#tb').textContent = txt;
    modal.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { st.taf = b.dataset.k; saveSt(); render(); });
    const step = d => { let ns = s, na = a + d; if (na < 1) { ns--; if (ns < 1) return; na = Q[ns - 1].v.length; } else if (na > Q[s - 1].v.length) { ns++; if (ns > 114) return; na = 1; } s = ns; a = na; render(); };
    $('#tp').onclick = () => step(-1); $('#tn').onclick = () => step(1);
  };
  render();
}

/* ---------- مشاركة الآية كصورة ---------- */
const STYLES = [
  { n: 'زمردي', bg: ['#0f4a3a', '#04100c'], glow: 'rgba(217,180,91,.28)', ink: '#f5efdc', gold: '#e2bd62', card: 'rgba(255,255,255,.07)', line: 'rgba(255,255,255,.22)' },
  { n: 'ملكي', bg: ['#4a1a8a', '#120630'], glow: 'rgba(240,200,96,.30)', ink: '#fbf3dc', gold: '#f0c860', card: 'rgba(255,255,255,.08)', line: 'rgba(255,255,255,.24)' },
  { n: 'عاجي', bg: ['#fbf6e6', '#e9dcb8'], glow: 'rgba(168,121,27,.20)', ink: '#1f2a24', gold: '#9a6c14', card: 'rgba(255,255,255,.55)', line: 'rgba(0,0,0,.14)' }
];
function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function wrapText(c, text, maxW) {
  const words = text.split(' '), lines = []; let cur = '';
  for (const w of words) { const t = cur ? cur + ' ' + w : w; if (c.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
  if (cur) lines.push(cur); return lines;
}
async function drawCard(s, a, si) {
  const W = 1080, H = 1350, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d'), S = STYLES[si];
  try { await document.fonts.load('48px AmiriQ'); } catch {}
  const g = c.createLinearGradient(0, 0, W * .6, H); g.addColorStop(0, S.bg[0]); g.addColorStop(1, S.bg[1]); c.fillStyle = g; c.fillRect(0, 0, W, H);
  [[160, 200, 520], [980, 1100, 560]].forEach(([x, y, r]) => { const rg = c.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, S.glow); rg.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = rg; c.fillRect(0, 0, W, H); });
  rr(c, 70, 230, 940, 880, 56); c.fillStyle = S.card; c.fill(); c.lineWidth = 2; c.strokeStyle = S.line; c.stroke();
  await new Promise(res => { const im = new Image(); im.onload = () => { c.save(); rr(c, W / 2 - 60, 70, 120, 120, 30); c.clip(); c.drawImage(im, W / 2 - 60, 70, 120, 120); c.restore(); res(); }; im.onerror = res; im.src = 'assets/logo.png'; });
  c.direction = 'rtl'; c.textAlign = 'center'; c.textBaseline = 'middle';
  const text = '﴿ ' + Q[s - 1].v[a - 1] + ' ﴾', maxW = 800, availH = 700; let fs = 66, lines;
  for (; fs >= 30; fs -= 2) { c.font = `${fs}px AmiriQ, serif`; lines = wrapText(c, text, maxW); if (lines.length * fs * 1.95 <= availH) break; }
  const lh = fs * 1.95, y0 = 670 - (lines.length * lh) / 2 + lh / 2;
  c.fillStyle = S.ink; lines.forEach((ln, i) => c.fillText(ln, W / 2, y0 + i * lh));
  c.fillStyle = S.gold; c.font = '700 42px AmiriQ, serif'; c.fillText(`سورة ${Q[s - 1].name} · الآية ${AR(a)}`, W / 2, 1000);
  c.font = '600 34px AmiriQ, serif'; c.fillStyle = S.gold; c.globalAlpha = .9; c.fillText('نور القرآن', W / 2, 1230); c.globalAlpha = 1;
  return cv.toDataURL('image/png');
}
async function openShare(s, a) {
  let si = 0, url = '';
  const render = async () => {
    openModal(`<div class="mh"><b>مشاركة كصورة</b><button data-close>✕</button></div>
      <div class="chips">${STYLES.map((x, i) => `<button class="chip${i === si ? ' on' : ''}" data-i="${i}">${x.n}</button>`).join('')}</div>
      <img class="shimg" id="im" alt=""><div class="mnav"><button class="btn" id="sh">مشاركة</button></div>
      <div class="mini">يمكنك أيضًا الضغط مطولًا على الصورة لحفظها.</div>`);
    modal.querySelectorAll('[data-i]').forEach(b => b.onclick = () => { si = +b.dataset.i; render(); });
    url = await drawCard(s, a, si); const im = $('#im'); if (im) im.src = url;
    const sh = $('#sh'); if (sh) sh.onclick = async () => {
      const P = CAP(), b64 = url.split(',')[1];
      if (P.Filesystem && P.Share) {
        try {
          const f = await P.Filesystem.writeFile({ path: `noor_${s}_${a}.png`, data: b64, directory: 'CACHE' });
          await P.Share.share({ title: 'نور القرآن', text: `${Q[s - 1].name} : ${a}`, files: [f.uri], dialogTitle: 'مشاركة الآية' }); return;
        } catch (e) {}
      }
      toast('اضغط مطولًا على الصورة لحفظها');
    };
  };
  render();
}

/* ---------- البحث / العلامات ---------- */
function search() {
  reading(false);
  app.innerHTML = `<h1 class="title">البحث</h1><p class="sub">ابحث في كل آيات القرآن (بدون التشكيل)</p>
  <input class="q" id="f" placeholder="اكتب كلمة أو عبارة…" autocomplete="off"><div id="R"></div>`;
  let tm; $('#f').oninput = e => { clearTimeout(tm); tm = setTimeout(() => run(e.target.value), 250); };
  function run(v) {
    const k = strip(v.trim()), R = $('#R');
    if (k.length < 2) { R.innerHTML = '<div class="empty">اكتب حرفين على الأقل</div>'; return; }
    const out = [];
    for (let i = 0; i < norm.length && out.length < 60; i++) if (norm[i].t.includes(k)) out.push(norm[i]);
    R.innerHTML = out.length ? out.map(r => `<a class="res glass" href="#/s/${r.s}/${r.a}">
      <small>${Q[r.s - 1].name} · آية ${AR(r.a)}</small><p>${Q[r.s - 1].v[r.a - 1]}</p></a>`).join('')
      : '<div class="empty">لا توجد نتائج</div>';
  }
}
function marksView() {
  reading(false);
  const all = Object.entries(ann).map(([k, o]) => { const [s, a] = k.split(':').map(Number); return Object.assign({ s, a }, o); }).sort((x, y) => (y.t || 0) - (x.t || 0));
  const F = { all: () => true, b: o => o.b, n: o => o.n, c: o => o.c !== undefined };
  const list = all.filter(F[mFilter]);
  app.innerHTML = `<h1 class="title">العلامات</h1><p class="sub">${AR(all.length)} عنصر · اضغط للانتقال إلى الآية</p>
  <div class="chips">${[['all', 'الكل'], ['b', '🔖 علامات'], ['n', '📝 ملاحظات'], ['c', '🎨 ملوّنة']].map(([k, n]) => `<button class="chip${mFilter === k ? ' on' : ''}" data-f="${k}">${n}</button>`).join('')}</div>` +
    (list.length ? list.map(m => `<a class="res glass${m.c !== undefined ? ' cl' : ''}" style="${m.c !== undefined ? '--cc:' + COLORS[m.c] : ''}" href="#/s/${m.s}/${m.a}"><small>${m.b ? '🔖 ' : ''}${Q[m.s - 1].name} · آية ${AR(m.a)}${M ? ' · صفحة ' + AR(pageOf(m.s, m.a)) : ''}</small>
     <p>${Q[m.s - 1].v[m.a - 1]}</p>${m.n ? `<div class="note">${esc(m.n)}</div>` : ''}</a>`).join('') : '<div class="empty">لا يوجد شيء هنا بعد<br>اضغط على أي آية لإضافة علامة أو لون أو ملاحظة</div>');
  $$('[data-f]').forEach(b => b.onclick = () => { mFilter = b.dataset.f; marksView(); });
}

/* ---------- الإعدادات ---------- */
async function exportData() {
  const data = JSON.stringify({ v: 2, st, ann, plan, last, kahf, at: Date.now() }), P = CAP();
  if (P.Filesystem && P.Share) {
    try {
      const f = await P.Filesystem.writeFile({ path: 'noor-quran-backup.json', data, directory: 'CACHE', encoding: 'utf8' });
      await P.Share.share({ title: 'نسخة نور القرآن الاحتياطية', files: [f.uri], dialogTitle: 'حفظ النسخة الاحتياطية' }); return;
    } catch (e) {}
  }
  try { await navigator.clipboard.writeText(data); toast('تم نسخ البيانات إلى الحافظة'); } catch { toast('تعذر التصدير'); }
}
function importData(file) {
  const r = new FileReader();
  r.onload = () => {
    try {
      const d = JSON.parse(r.result); if (!d || !d.ann) throw 0;
      let n = 0; Object.entries(d.ann).forEach(([k, o]) => { if (!ann[k] || (o.t || 0) > (ann[k].t || 0)) { ann[k] = o; n++; } });
      saveAnn();
      if (d.plan && !plan) { plan = d.plan; savePlan(); }
      if (d.st) { st = Object.assign({}, st, d.st); saveSt(); applyLook(); }
      toast(`تم استيراد ${AR(n)} عنصر`); settings();
    } catch { toast('الملف غير صالح'); }
  };
  r.readAsText(file);
}
function settings() {
  reading(false);
  const sw = (id, on) => `<button class="sw ${on ? 'on' : ''}" id="${id}"></button>`;
  app.innerHTML = `<h1 class="title">الإعدادات</h1><p class="sub">&nbsp;</p>
  <div class="set glass"><h3>المظهر</h3><div class="tgrid">
    <button class="tb" data-t="night" style="background:#0a0a0b;color:#ececec;border-color:#2a2a2d">ليلي</button>
    <button class="tb" data-t="light" style="background:#fafafa;color:#111;border-color:#ddd">نهاري</button>
    <button class="tb" data-t="sepia" style="background:#efe2c6;color:#3b2a14">ورقي</button>
    <button class="tb" data-t="warm" style="background:#1b1108;color:#e9d6b2">ليلي دافئ 🌙</button></div></div>
  <div class="set glass"><h3>وضع القراءة</h3>
    <div class="seg2" id="rm"><button data-m="pages" ${M ? '' : 'disabled'}>ورقي<small>صفحات المصحف</small></button><button data-m="scroll">طولي<small>تمرير لأسفل</small></button></div>
    <div class="mini">${M ? 'الورقي: صفحة كاملة بدون تمرير، تقلّبها بالسحب.' : 'الوضع الورقي يحتاج بيانات الصفحات وهي غير متوفرة في هذا الإصدار.'}</div></div>
  <div class="set glass"><h3>حجم الخط</h3><input type="range" id="r" min="22" max="48" value="${st.fs}">
    <div class="preview" id="pv">ٱلۡحَمۡدُ لِلَّهِ رَبِّ ٱلۡعَٰلَمِينَ</div></div>
  <div class="set glass"><h3>راحة العين</h3>
    <div class="mini" style="margin:0 0 6px">تعتيم الشاشة داخل التطبيق</div><input type="range" id="dm" min="0" max="60" value="${st.dim}">
    <div class="row" style="margin-top:12px"><div>إبقاء الشاشة مضاءة أثناء القراءة</div>${sw('kp', st.keep)}</div></div>
  <div class="set glass"><h3>تنبيه الجمعة</h3>
    <div class="row"><div>تذكير بسورة الكهف</div>${sw('sf', st.fri)}</div>
    <div class="row" style="margin-top:12px"><div>الوقت</div><input type="time" id="ftm" value="${st.friT}"></div></div>
  <div class="set glass"><h3>الختمة والورد اليومي</h3>
    ${!M ? '<div class="mini">تحتاج هذه الميزة إلى بيانات الصفحات، وهي غير متوفرة في هذا الإصدار.</div>' : `
    ${plan ? `<div class="mini" style="margin:0 0 8px">الخطة الحالية: ختمة في ${AR(plan.days)} يوم · ${AR(Object.keys(plan.done).length)} يوم مكتمل · ${AR(Math.ceil(604 / plan.days))} صفحة يوميًا تقريبًا</div>` : '<div class="mini" style="margin:0 0 8px">اختر مدة الختمة وسنقسّم المصحف على الأيام.</div>'}
    <div class="chips">${[7, 10, 15, 30, 60, 90].map(d => `<button class="chip${plan && plan.days === d ? ' on' : ''}" data-pd="${d}">${AR(d)} يوم</button>`).join('')}</div>
    ${plan ? '<button class="btn ghost" id="pst">إيقاف الخطة</button>' : ''}
    <div class="row" style="margin-top:14px"><div>تذكير يومي بالورد</div>${sw('sw2', st.wirdOn)}</div>
    <div class="row" style="margin-top:12px"><div>الوقت</div><input type="time" id="wtm" value="${st.wirdT}"></div>`}</div>
  <div class="set glass"><h3>نسخة احتياطية</h3>
    <div class="mini" style="margin:0 0 8px">تشمل العلامات والألوان والملاحظات والخطة والإعدادات.</div>
    <button class="btn" id="ex">تصدير</button><button class="btn ghost" id="im">استيراد</button>
    <input type="file" id="fi" accept="application/json,.json" hidden></div>`;
  const mark = () => $$('.tb').forEach(b => b.classList.toggle('on', b.dataset.t === st.theme));
  mark();
  $$('.tb').forEach(b => b.onclick = () => { st.theme = b.dataset.t; saveSt(); applyLook(); mark(); });
  const rmk = () => $$('#rm button').forEach(b => b.classList.toggle('on', b.dataset.m === ((st.read === 'pages' && M) ? 'pages' : 'scroll')));
  rmk(); $$('#rm button').forEach(b => b.onclick = () => { if (b.disabled) return; st.read = b.dataset.m; saveSt(); rmk(); toast(st.read === 'pages' ? 'الوضع الورقي' : 'الوضع الطولي'); });
  const pv = $('#pv'); pv.style.fontSize = st.fs + 'px';
  $('#r').oninput = e => { st.fs = +e.target.value; saveSt(); pv.style.fontSize = st.fs + 'px'; applyLook(); };
  $('#dm').oninput = e => { st.dim = +e.target.value; saveSt(); applyLook(); };
  const tog = (id, k, fn) => { const b = $('#' + id); if (!b) return; b.onclick = () => { st[k] = !st[k]; saveSt(); b.classList.toggle('on', st[k]); fn && fn(); }; };
  tog('kp', 'keep', () => { if (!st.keep) setAwake(false); });
  tog('sf', 'fri', () => syncNotifs(true)); tog('sw2', 'wirdOn', () => { if (st.wirdOn && !plan) { toast('اختر مدة الختمة أولًا'); } syncNotifs(true); });
  const tm = (id, k) => { const i = $('#' + id); if (i) i.onchange = () => { st[k] = i.value || st[k]; saveSt(); syncNotifs(true); toast('تم حفظ الوقت'); }; };
  tm('ftm', 'friT'); tm('wtm', 'wirdT');
  $$('[data-pd]').forEach(b => b.onclick = () => { plan = { start: todayKey(), days: +b.dataset.pd, done: {} }; savePlan(); syncNotifs(false); toast(`بدأت ختمة في ${AR(plan.days)} يوم`); settings(); });
  const ps = $('#pst'); if (ps) ps.onclick = () => { plan = null; savePlan(); st.wirdOn = false; saveSt(); syncNotifs(false); settings(); };
  $('#ex').onclick = exportData; $('#im').onclick = () => $('#fi').click();
  $('#fi').onchange = e => { if (e.target.files[0]) importData(e.target.files[0]); };
}

/* ---------- التوجيه ---------- */
function route(keepScroll) {
  const h = location.hash.slice(1) || '/', p = h.split('/');
  if (!keepScroll) {
    if (p[1] === 's' && st.read === 'pages' && M && Q[+p[2] - 1]) {
      focusAyah = { s: +p[2], a: +p[3] || 0 };
      location.replace('#/p/' + pageOf(+p[2], +p[3] || 1)); return;
    }
    if (p[1] === 'p' && (st.read === 'scroll' || !M) && M && +p[2] >= 1 && +p[2] <= 604) {
      const i = M.pageStart[+p[2]]; location.replace(`#/s/${FS[i]}/${FA[i]}`); return;
    }
  }
  const y = app.scrollTop;
  hideSheet(); if (!keepScroll) closeModal();
  app.onscroll = null; app.onclick = null; app.ontouchstart = null; app.ontouchend = null;
  $$('#tabs a').forEach(a => a.classList.remove('on'));
  const tab = (p[1] === 's' || p[1] === 'p' || h === '/') ? 'home' : p[1];
  const t = document.querySelector(`#tabs a[data-t="${tab}"]`); if (t) t.classList.add('on');
  if (p[1] !== 's' && p[1] !== 'p') setAwake(false);
  if (p[1] === 's') surah(+p[2], +p[3] || 0, keepScroll);
  else if (p[1] === 'p') pageView(+p[2], keepScroll);
  else if (p[1] === 'search') search();
  else if (p[1] === 'marks') marksView();
  else if (p[1] === 'settings') settings();
  else home();
  if (keepScroll) { app.scrollTop = y; touched = true; return; }
  app.classList.remove('enter', 'slide-next', 'slide-prev'); void app.offsetWidth;
  app.classList.add(p[1] === 'p' && navDir ? 'slide-' + navDir : 'enter'); navDir = '';
}

/* ---------- التشغيل ---------- */
applyLook();
app.innerHTML = '<div class="empty">جاري التحميل…</div>';
const jget = u => fetch(u).then(r => r.ok ? r.json() : null).catch(() => null);
Promise.all([jget('data/quran.json'), jget('data/meta.json')]).then(([d, meta]) => {
  if (!d) throw 0;
  Q = d; let o = 0;
  d.forEach((s, si) => { off[si] = o; o += s.v.length; s.v.forEach((t, i) => { FS.push(s.n); FA.push(i + 1); norm.push({ s: s.n, a: i + 1, t: strip(t) }); }); });
  if (meta && meta.pg && meta.pg.length === 6236 && meta.rub && meta.rub.length === 6236) {
    const pageStart = new Array(606).fill(-1), rubStart = new Array(242).fill(-1);
    meta.pg.forEach((p, i) => { if (pageStart[p] < 0) pageStart[p] = i; });
    meta.rub.forEach((r, i) => { if (rubStart[r] < 0) rubStart[r] = i; });
    let ok = true; for (let p = 1; p <= 604; p++) if (pageStart[p] < 0) ok = false; for (let r = 1; r <= 240; r++) if (rubStart[r] < 0) ok = false;
    if (ok) M = { pg: meta.pg, rub: meta.rub, pageStart, rubStart };
  }
  addEventListener('hashchange', () => route()); addEventListener('resize', () => { if (/^#\/p\//.test(location.hash)) route(true); }); route();
  const asked = store.get('asked', false); store.set('asked', true); syncNotifs(!asked);
}).catch(() => { app.innerHTML = '<div class="empty">تعذر تحميل بيانات القرآن</div>'; });
})();

