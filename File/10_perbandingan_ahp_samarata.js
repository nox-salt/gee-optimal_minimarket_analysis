// ============================================================
// ID      : S10
// Judul   : Perbandingan AHP vs bobot sama rata (persen kelas sama, Spearman, kappa)
// Tujuan  : T4 | RM 4 | Laporan: 3.4 (Tabel metrik), 3.5
// Input   : hasil_overlay
// Output  : CSV metrik_ahp_vs_samarata
// Versi   : v1.0 | Tanggal: 07 - 11 - 2026 | Penulis: Zaidan Zulkaisi Setiaji
// ============================================================
var C = require('users/radhityane/pratubes_pcd:00_config');

var ov = ee.FeatureCollection(C.ASSET.overlay);
var total = ov.size();
print('Jumlah sel dipakai:', total);

var bandingan = ov.map(function (f) {
  return f.set('sama', ee.Number(f.get('kelas_ahp')).eq(ee.Number(f.get('kelas_sr'))));
});
var nSama = ee.Number(bandingan.aggregate_sum('sama'));
var persenSama = nSama.divide(total).multiply(100);
var spearman = ov.reduceColumns({
  reducer: ee.Reducer.spearmansCorrelation(),
  selectors: ['skor_ahp', 'skor_sr']
});
var em = ov.errorMatrix('kelas_ahp', 'kelas_sr', [1, 2, 3, 4, 5]);

print('Sel dengan kelas sama:', nSama);
print('Persen sel dengan kelas SAMA (AHP vs sama rata):', persenSama);
print('Sel berbeda kelas:', total.subtract(nSama));
print('Korelasi Spearman skor AHP vs sama rata:', spearman);
print('Matriks silang kelas (baris AHP, kolom sama rata):', em.array());
print('Cohen kappa:', em.kappa());

Export.table.toDrive({
  collection: ee.FeatureCollection([ee.Feature(null, {
    jumlah_sel: total, sel_sama: nSama, sel_beda: total.subtract(nSama),
    persen_sama: persenSama, spearman: spearman.get('correlation'), kappa: em.kappa()
  })]),
  description: 'metrik_ahp_vs_samarata',
  fileFormat: 'CSV'
});
