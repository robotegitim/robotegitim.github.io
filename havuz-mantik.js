/* Havuz mantığı: hem site (tarayıcı) hem güncelleme aracı (Node) aynı kuralı kullanır.
   Bir günlük kaydı (g) havuza şöyle işlenir:
   - g.t = "begen": cümle konuya söyleniş olarak eklenir, beğenilen cevap "onay" olur.
   - g.t = "ogret": cümle söyleniş olarak eklenir, yeni cevap onaylı eklenir; aynı kapsamdaki eski cevap "red" olur.
   Konu yoksa ve kayıtta konu_ad varsa yeni konu açılır. */
(function (kok) {
  'use strict';
  const RUH = ['*', 'mutlu', 'üzgün', 'yorgun', 'heyecanlı'];
  const norm = s => String(s || '').toLocaleLowerCase('tr-TR').replace(/[^\p{L}\p{N}{}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
  const kisalt = (s, n) => String(s || '').trim().slice(0, n);
  function yeniHavuz() { return { surum: 1, guncelleme: null, islenenler: [], konular: [] }; }
  function uygula(h, g) {
    if (!g || typeof g !== 'object' || !g.lid || !g.kid) return false;
    let k = h.konular.find(x => x.id === g.kid);
    if (!k) {
      if (!g.konu_ad) return false;
      k = { id: kisalt(g.kid, 60), ad: kisalt(g.konu_ad, 80), sira: 1000, soylenisler: [], cevaplar: [] };
      h.konular.push(k);
    }
    const m = kisalt(g.metin, 200);
    if (m && !k.soylenisler.some(s => norm(s) === norm(m))) k.soylenisler.push(m);
    const kim = g.kim && typeof g.kim === 'object' ? g.kim : {};
    if (g.t === 'begen') {
      const c = k.cevaplar.find(x => x.id === g.cid);
      if (c && c.durum !== 'red') c.durum = 'onay';
    } else if (g.t === 'ogret') {
      const metin = kisalt(g.cevap, 300); if (!metin || !g.cid) return true;
      const ruh = RUH.includes(g.ruh) ? g.ruh : '*';
      if (g.eski) { const e = k.cevaplar.find(x => x.id === g.eski); if (e && (e.ruh || '*') === ruh) e.durum = 'red'; }
      if (!k.cevaplar.some(x => x.id === g.cid))
        k.cevaplar.push({ id: kisalt(g.cid, 60), ruh, metin, kaynak: 'kisi', yazan: kisalt(kim.id, 40) || null, yazan_ad: kisalt(kim.ad, 40) || null, durum: 'onay', zaman: g.zaman || null });
    }
    return true;
  }
  const api = { RUH, norm, yeniHavuz, uygula };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else kok.HavuzMantik = api;
})(typeof window !== 'undefined' ? window : this);
