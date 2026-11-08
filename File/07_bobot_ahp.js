// ============================================================
// ID      : S07
// Judul   : Bobot AHP, bobot sama rata, dan daftar skenario bobot
// Tujuan  : T1 (bobot), T4 (dasar perbandingan dan sensitivitas)
// RM      : 1, 4 | Laporan: 2.3, 2.4, 3.1 (Tabel bobot), 3.4 (konsistensi)
// Input   : matriks M di bawah
// Output  : asset bobot_skenario (10 baris: idx, nama, w_pop, w_bld, w_eco, w_road,
//           lambda, ci, cr). idx 0 = AHP, 1 = sama rata, 2-9 = variasi bobot.
// Versi   : v1.1 | Tanggal: 06 - 11 - 2026 | Penulis: Zaidan Zulkaisi Setiaji
// ============================================================
var C = require('users/radhityane/pratubes_pcd:00_config');

// 'lama'  : bobot satu parameter dikalikan 0,8 / 1,2 lalu SEMUA bobot dinormalisasi ulang
// 'tepat' : bobot satu parameter berubah tepat -20% / +20%, bobot lain menyusut proporsional
var MODE_VARIASI = 'lama';

// Matriks perbandingan berpasangan (urutan: Populasi, Bangunan, Ekonomi, Jalan).
var M = [
  [1,     2,     3,   2],
  [1 / 2, 1,     2,   1],
  [1 / 3, 1 / 2, 1,   1 / 2],
  [1 / 2, 1,     2,   1]
];

function hitungAHP(M) {
  var n = M.length, i, j;
  var kolSum = [];
  for (j = 0; j < n; j++) {
    var s = 0;
    for (i = 0; i < n; i++) { s += M[i][j]; }
    kolSum.push(s);
  }
  var w = [];
  for (i = 0; i < n; i++) {
    var r = 0;
    for (j = 0; j < n; j++) { r += M[i][j] / kolSum[j]; }
    w.push(r / n);
  }
  var lam = 0;
  for (i = 0; i < n; i++) {
    var aw = 0;
    for (j = 0; j < n; j++) { aw += M[i][j] * w[j]; }
    lam += aw / w[i];
  }
  lam = lam / n;
  var CI = (lam - n) / (n - 1);
  var RI = {2: 0, 3: 0.58, 4: 0.90, 5: 1.12}[n];
  return {w: w, lambda: lam, CI: CI, CR: CI / RI};
}

var ahp = hitungAHP(M);
print('Bobot AHP [pop, bld, eco, jalan]:', ahp.w);
print('Lambda maks:', ahp.lambda);
print('CR (harus < 0.1):', ahp.CR);
if (ahp.CR >= 0.1) { throw new Error('CR >= 0,1: revisi nilai perbandingan di matriks M.'); }

var skenario = [
  {nama: 'AHP (dasar)', w: ahp.w},
  {nama: 'Sama rata',   w: [0.25, 0.25, 0.25, 0.25]}
];
[0.8, 1.2].forEach(function (fak) {
  for (var i = 0; i < 4; i++) {
    var w2;
    if (MODE_VARIASI === 'tepat') {
      var wi = ahp.w[i] * fak;
      var sisa = (1 - wi) / (1 - ahp.w[i]);
      w2 = ahp.w.map(function (x) { return x * sisa; });
      w2[i] = wi;
    } else {
      w2 = ahp.w.slice();
      w2[i] = w2[i] * fak;
      var tot = w2[0] + w2[1] + w2[2] + w2[3];
      w2 = w2.map(function (x) { return x / tot; });
    }
    var label = (MODE_VARIASI === 'tepat')
      ? (fak < 1 ? ' -20%' : ' +20%')
      : (fak < 1 ? ' x0,8' : ' x1,2');
    skenario.push({nama: C.NAMA_KRIT[i] + label, w: w2});
  }
});

var TITIK_DUMMY = ee.Geometry.Point([107.62, -6.93]);
var fitur = skenario.map(function (s, idx) {
  return ee.Feature(TITIK_DUMMY, {
    idx: idx, nama: s.nama, mode_variasi: MODE_VARIASI,
    w_pop: s.w[0], w_bld: s.w[1], w_eco: s.w[2], w_road: s.w[3],
    lambda: ahp.lambda, ci: ahp.CI, cr: ahp.CR
  });
});
var tabel = ee.FeatureCollection(fitur);
print('Jumlah skenario (harus 10):', tabel.size());
print('Tabel skenario bobot:', tabel);
skenario.forEach(function (s) {
  print(s.nama + ' | jumlah bobot (harus 1):', s.w[0] + s.w[1] + s.w[2] + s.w[3]);
});

Export.table.toAsset({
  collection: tabel,
  description: 'bobot_skenario',
  assetId: C.ASSET.bobot
});