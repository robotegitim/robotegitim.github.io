// Günlük tablosundaki (Google Form yanıtları) yeni kayıtları havuz.json'a işler.
// Kullanım:  node araclar/havuz-guncelle.js          -> önizleme (dosyaya yazmaz)
//            node araclar/havuz-guncelle.js --yaz    -> havuz.json'u günceller
//            node araclar/havuz-guncelle.js --yaz --atla=g123,g456   -> belirtilen kayıtları işlemeden geçer
'use strict';
const fs = require('fs'), path = require('path');
const { uygula, norm } = require('../havuz-mantik.js');
// Günlük tablosunun CSV linki gizlidir (öğretenlerin adlarını içerir); depoya girmez, .gunluk-csv-url dosyasında durur.
const URL_DOSYA = path.join(__dirname, '..', '.gunluk-csv-url');
if (!fs.existsSync(URL_DOSYA)) { console.error('.gunluk-csv-url dosyası yok. Google E-Tablo CSV yayın linkini bu dosyaya yaz.'); process.exit(1); }
const CSV_URL = fs.readFileSync(URL_DOSYA, 'utf8').trim();
const DOSYA = path.join(__dirname, '..', 'havuz.json');
const yaz = process.argv.includes('--yaz');
const atla = new Set(((process.argv.find(a => a.startsWith('--atla=')) || '').split('=')[1] || '').split(',').filter(Boolean));

function csvOku(t) {
  const satirlar = []; let s = [], h = '', tirnak = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (tirnak) { if (c === '"') { if (t[i + 1] === '"') { h += '"'; i++; } else tirnak = false; } else h += c; }
    else if (c === '"') tirnak = true;
    else if (c === ',') { s.push(h); h = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && t[i + 1] === '\n') i++; s.push(h); satirlar.push(s); s = []; h = ''; }
    else h += c;
  }
  if (h || s.length) { s.push(h); satirlar.push(s); }
  return satirlar;
}

(async () => {
  const havuz = JSON.parse(fs.readFileSync(DOSYA, 'utf8'));
  const islenen = new Set(havuz.islenenler);
  const yanit = await fetch(CSV_URL + '&t=' + Date.now());
  if (!yanit.ok) { console.error('Günlük tablosu okunamadı:', yanit.status); process.exit(1); }
  const satirlar = csvOku(await yanit.text()).slice(1).filter(r => r.length >= 2 && r[1]);
  const kayitlar = [];
  let bozuk = 0;
  for (const r of satirlar) { try { const g = JSON.parse(r[1]); if (g && g.lid) kayitlar.push(g); else bozuk++; } catch { bozuk++; } }
  kayitlar.sort((a, b) => String(a.zaman || '').localeCompare(String(b.zaman || '')));
  const yeni = kayitlar.filter(g => !islenen.has(g.lid));
  console.log(`Günlükte ${kayitlar.length} kayıt var, ${yeni.length} tanesi yeni.${bozuk ? ` (${bozuk} okunamayan satır atlandı)` : ''}`);
  let n = 0;
  for (const g of yeni) {
    const kim = (g.kim && g.kim.ad) || 'adsız';
    const konu = (havuz.konular.find(k => k.id === g.kid) || {}).ad || `YENİ KONU: ${g.konu_ad || '?'}`;
    if (atla.has(g.lid)) { console.log(`  [atlandı] ${g.lid}`); havuz.islenenler.push(g.lid); continue; }
    const tur = g.t === 'begen' ? '👍' : '✏️';
    console.log(`  ${tur} ${g.lid} · ${kim} · ${konu} · “${g.metin}”${g.t === 'ogret' ? ` → “${g.cevap}”${g.ruh && g.ruh !== '*' ? ` (${g.ruh})` : ''}` : ''}`);
    if (uygula(havuz, g)) n++;
    havuz.islenenler.push(g.lid);
  }
  havuz.guncelleme = new Date().toISOString();
  if (yaz && yeni.length) { fs.writeFileSync(DOSYA, JSON.stringify(havuz, null, 1) + '\n'); console.log(`havuz.json güncellendi: ${n} kayıt işlendi.`); }
  else if (yaz) console.log('Yeni kayıt yok, dosya değişmedi.');
  else console.log('Önizleme bitti. Uygulamak için --yaz ile çalıştır.');
})();
