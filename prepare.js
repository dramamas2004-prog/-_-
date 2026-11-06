// يحوّل بيانات القرآن إلى ملف مضغوط داخل التطبيق (يعمل بدون إنترنت)
const fs = require('fs'), path = require('path');
const src = path.join(__dirname, '..', 'node_modules', 'quran-json', 'dist', 'quran.json');
const data = JSON.parse(fs.readFileSync(src, 'utf8'));
const out = data.map(s => ({
  n: s.id, name: s.name, en: s.transliteration, type: s.type,
  v: s.verses.map(v => v.text)
}));
const total = out.reduce((a, s) => a + s.v.length, 0);
if (out.length !== 114 || total !== 6236) {
  console.error('خطأ: عدد السور/الآيات غير صحيح', out.length, total); process.exit(1);
}
fs.mkdirSync(path.join(__dirname, '..', 'www', 'data'), { recursive: true });
fs.writeFileSync(path.join(__dirname, '..', 'www', 'data', 'quran.json'), JSON.stringify(out));
console.log('OK: 114 سورة، 6236 آية');
