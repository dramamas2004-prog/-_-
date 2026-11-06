(() => {
const $ = s => document.querySelector(s), app = $('#app'), sheet = $('#sheet'), toastEl = $('#toast');
const AR = n => String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d } catch { return d } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)) } catch {} }
};
let Q = [], norm = [], touched = false,
    st = { theme: store.get('theme', 'night'), fs: store.get('fs', 30), fri: store.get('fri', true) },
    marks = store.get('marks', []), last = store.get('last', null), kahf = store.get('kahf', '');
const todayKey = () => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate() };
const isFri = () => new Date().getDay() === 5;

const strip = t => t.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0640\u08D3-\u08FF]/g, '')
  .replace(/[ٱأإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ۡ/g, '');
const applyLook = () => {
  document.body.className = 'theme-' + st.theme + (document.body.classList.contains('reading') ? ' reading' : '');
  document.documentElement.style.setProperty('--fs', st.fs + 'px');
  document.querySelector('meta[name=theme-color]').content = { night: '#05120e', light: '#f2f2f7', sepia: '#efe2c6' }[st.theme];
};
const reading = on => document.body.classList.toggle('reading', on);
const hideSheet = () => { sheet.hidden = true; document.querySelectorAll('.a.sel').forEach(e => e.classList.remove('sel')); };
let tt; const toast = m => { toastEl.textContent = m; toastEl.hidden = false; clearTimeout(tt); tt = setTimeout(() => toastEl.hidden = true, 2200); };

/* ---------- الرجوع (زر الهاتف) ---------- */
function goBack() {
  if (!sheet.hidden) return hideSheet();
  const h = location.hash;
  if (!h || h === '#/') { try { window.Capacitor.Plugins.App.exitApp(); } catch {} return; }
  if (history.length > 1) history.back(); else location.hash = '#/';
}
try { window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App &&
  window.Capacitor.Plugins.App.addListener('backButton', goBack); } catch {}

/* ---------- الشاشات ---------- */
const BELL = '<svg viewBox="0 0 24 24"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10.3 20a1.9 1.9 0 0 0 3.4 0"/></svg>';

function home() {
  reading(false);
  const now = new Date();
  const wd = new Intl.DateTimeFormat('ar-EG', { weekday: 'long' }).format(now);
  const g = now.getDate() + '/' + (now.getMonth() + 1) + '/' + now.getFullYear();
  let hj = ''; try { hj = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura-nu-arab', { day: 'numeric', month: 'long', year: 'numeric' }).format(now); } catch {}
  const done = kahf === todayKey(), l = last && Q[last.s - 1];
  app.innerHTML = `
  <div class="head"><img class="logo" src="assets/logo.png" alt="">
    <div><div class="wd">${wd}</div><div class="gd">${g}</div><div class="hd">${hj}</div></div></div>
  ${isFri() && st.fri ? `<div class="fri glass ${done ? 'done' : ''}">
    <div class="bell">${BELL}${done ? '' : '<b class="dot"></b>'}</div>
    <div class="ft"><h3>${done ? 'ما شاء الله، أتممت سورة الكهف' : 'جمعة مباركة'}</h3>
      <p>${done ? 'تقبّل الله منك صالح الأعمال' : 'لا تنسَ قراءة سورة الكهف اليوم'}</p></div>
    <div class="acts"><a class="btn" href="#/s/18">${done ? 'مراجعة' : 'اقرأ'}</a>
      ${done ? '' : '<button class="btn ghost" id="kd">تمّت ✓</button>'}</div></div>` : ''}
  ${l ? `<div class="hero"><small>آخر قراءة</small><h2>سورة ${l.name}</h2>
     <a class="btn" href="#/s/${l.n}/${last.a}">أكمل القراءة · آية ${AR(last.a)}</a></div>`
     : `<div class="hero"><small>ابدأ رحلتك</small><h2>بسم الله الرحمن الرحيم</h2><a class="btn" href="#/s/1/1">ابدأ بالفاتحة</a></div>`}
  <input class="q" id="f" placeholder="ابحث عن سورة…" autocomplete="off">
  <div class="group glass" id="L"></div>`;
  const kd = $('#kd'); if (kd) kd.onclick = () => { kahf = todayKey(); store.set('kahf', kahf); home(); toast('تقبّل الله'); };
  const draw = v => {
    const k = strip(v.trim());
    $('#L').innerHTML = Q.filter(s => !k || strip(s.name).includes(k) || s.en.toLowerCase().includes(k.toLowerCase()) || String(s.n) === k)
      .map(s => `<a href="#/s/${s.n}"><div class="num">${AR(s.n)}</div>
      <div class="grow"><div class="nm">${s.name}</div>
      <div class="meta">${s.type === 'meccan' ? 'مكية' : 'مدنية'} · ${AR(s.v.length)} آية</div></div>
      ${s.n === 18 && isFri() && st.fri && !done ? '<span class="pill">اليوم</span>' : ''}</a>`).join('');
  };
  draw(''); $('#f').oninput = e => draw(e.target.value);
}

function jump(el) {
  const r = el.getBoundingClientRect(), a = app.getBoundingClientRect();
  app.scrollTop += r.top - a.top - app.clientHeight / 2 + r.height / 2;
}

function surah(n, ayah) {
  reading(true); hideSheet(); touched = false;
  const s = Q[n - 1]; if (!s) { location.hash = '#/'; return; }
  const bsm = (n !== 1 && n !== 9) ? '<div class="bsm">بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ</div>' : '';
  app.innerHTML = `
  <div class="top glass"><button id="bk" aria-label="رجوع">›</button><b>${s.name}</b>
    <button id="ft" aria-label="حجم الخط">Aa</button></div>
  <div class="page">
   <div class="banner glass"><small>${s.type === 'meccan' ? 'مكية' : 'مدنية'} · ${AR(s.v.length)} آية</small><h2>سورة ${s.name}</h2></div>
   ${bsm}
   <div class="ay txt">${s.v.map((t, i) => {
      const m = marks.some(x => x.s === n && x.a === i + 1);
      return `<span class="a${m ? ' mk' : ''}" data-a="${i + 1}">${t}<span class="e">${AR(i + 1)}</span></span> `;
   }).join('')}</div></div>`;
  app.querySelectorAll('.a').forEach(el => el.onclick = () => pick(n, +el.dataset.a, el));
  $('#bk').onclick = goBack;
  $('#ft').onclick = () => { st.fs = st.fs >= 44 ? 24 : st.fs + 4; store.set('fs', st.fs); applyLook(); };
  app.scrollTop = 0;
  const target = ayah && app.querySelector(`.a[data-a="${ayah}"]`);
  if (target) {
    target.classList.add('flash');
    const go = () => { if (!touched && target.isConnected) jump(target); };
    requestAnimationFrame(go);
    [100, 350, 800, 1500].forEach(t => setTimeout(go, t));
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(go);
    app.addEventListener('touchstart', () => touched = true, { once: true });
  }
  let tm; app.onscroll = () => {
    if (!sheet.hidden) hideSheet();
    clearTimeout(tm); tm = setTimeout(() => {
      saveLast(n);
      if (n === 18 && isFri() && kahf !== todayKey() && app.scrollTop + app.clientHeight >= app.scrollHeight - 140) {
        kahf = todayKey(); store.set('kahf', kahf); toast('تقبّل الله ختمة الكهف ✨');
      }
    }, 350);
  };
}
function saveLast(n) {
  const top = app.getBoundingClientRect().top + 110;
  for (const el of app.querySelectorAll('.a')) if (el.getBoundingClientRect().bottom > top) {
    last = { s: n, a: +el.dataset.a }; store.set('last', last); break;
  }
}
function pick(n, a, el) {
  hideSheet(); el.classList.add('sel');
  const has = marks.some(x => x.s === n && x.a === a);
  sheet.hidden = false;
  sheet.innerHTML = `<button class="btn" id="b1">${has ? 'إزالة العلامة' : '🔖 حفظ علامة'}</button>
    <button class="btn" id="b2">📋 نسخ الآية</button><button class="btn" id="b3">✕</button>`;
  $('#b1').onclick = () => {
    if (has) marks = marks.filter(x => !(x.s === n && x.a === a)); else marks.unshift({ s: n, a });
    store.set('marks', marks); el.classList.toggle('mk', !has); hideSheet(); toast(has ? 'أُزيلت العلامة' : 'تم حفظ العلامة');
  };
  $('#b2').onclick = async () => {
    try { await navigator.clipboard.writeText(`﴿${Q[n - 1].v[a - 1]}﴾ [${Q[n - 1].name}: ${a}]`); toast('تم النسخ'); } catch {}
    hideSheet();
  };
  $('#b3').onclick = hideSheet;
}

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
  app.innerHTML = `<h1 class="title">العلامات</h1><p class="sub">اضغط على الآية لتفتح عندها مباشرة</p>` +
    (marks.length ? marks.map(m => `<a class="res glass" href="#/s/${m.s}/${m.a}"><small>${Q[m.s - 1].name} · آية ${AR(m.a)}</small>
     <p>${Q[m.s - 1].v[m.a - 1]}</p></a>`).join('') : '<div class="empty">لا توجد علامات بعد<br>اضغط على أي آية لحفظها</div>');
}

function settings() {
  reading(false);
  app.innerHTML = `<h1 class="title">الإعدادات</h1><p class="sub">&nbsp;</p>
  <div class="set glass"><h3>المظهر</h3><div class="themes">
    <button data-t="night" style="background:#0b1f1a;color:#f3ecd8">ليلي</button>
    <button data-t="light" style="background:#f7f3e8;color:#1c2b26">نهاري</button>
    <button data-t="sepia" style="background:#efe2c6;color:#3b2a14">ورقي</button></div></div>
  <div class="set glass"><h3>حجم الخط</h3><input type="range" id="r" min="22" max="48" value="${st.fs}">
    <div class="preview" id="pv">ٱلۡحَمۡدُ لِلَّهِ رَبِّ ٱلۡعَٰلَمِينَ</div></div>
  <div class="set glass"><div class="row"><div><h3 style="margin:0">تنبيه سورة الكهف</h3>
    <div class="sub" style="margin:4px 0 0">يظهر يوم الجمعة</div></div><button class="sw ${st.fri ? 'on' : ''}" id="sw"></button></div></div>`;
  const mark = () => app.querySelectorAll('.themes button').forEach(b => b.classList.toggle('on', b.dataset.t === st.theme));
  mark();
  app.querySelectorAll('.themes button').forEach(b => b.onclick = () => { st.theme = b.dataset.t; store.set('theme', st.theme); applyLook(); mark(); });
  const pv = $('#pv'); pv.style.fontSize = st.fs + 'px';
  $('#r').oninput = e => { st.fs = +e.target.value; store.set('fs', st.fs); pv.style.fontSize = st.fs + 'px'; applyLook(); };
  $('#sw').onclick = e => { st.fri = !st.fri; store.set('fri', st.fri); e.currentTarget.classList.toggle('on', st.fri); };
}

/* ---------- التوجيه ---------- */
function route() {
  const h = location.hash.slice(1) || '/', p = h.split('/');
  hideSheet(); app.onscroll = null;
  document.querySelectorAll('#tabs a').forEach(a => a.classList.remove('on'));
  const tab = p[1] === 's' || h === '/' ? 'home' : p[1];
  const t = document.querySelector(`#tabs a[data-t="${tab}"]`); if (t) t.classList.add('on');
  if (p[1] === 's') surah(+p[2], +p[3] || 0);
  else if (p[1] === 'search') search();
  else if (p[1] === 'marks') marksView();
  else if (p[1] === 'settings') settings();
  else home();
}

applyLook();
app.innerHTML = '<div class="empty">جاري التحميل…</div>';
fetch('data/quran.json').then(r => r.json()).then(d => {
  Q = d;
  d.forEach(s => s.v.forEach((t, i) => norm.push({ s: s.n, a: i + 1, t: strip(t) })));
  addEventListener('hashchange', route); route();
}).catch(() => { app.innerHTML = '<div class="empty">تعذر تحميل بيانات القرآن</div>'; });
})();
