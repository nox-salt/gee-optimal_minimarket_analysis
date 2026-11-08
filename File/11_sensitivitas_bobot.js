// ============================================================
// ID      : S11
// Judul   : Sensitivitas bobot (skenario idx 2-9 dibanding AHP dasar)
// Tujuan  : T4 | RM 4 | Laporan: 3.4 (Tabel sensitivitas), 3.5
// Input   : hasil_overlay (memuat kelas_ahp), bobot_skenario
// Output  : CSV sensitivitas_bobot (skenario, sel berpindah, persen)
// Versi   : v1.0 | Tanggal: 08 - 11 -2026 | Penulis: Radhitya Maulana Arrafi
// ============================================================
var C = require('users/radhityane/pratubes_pcd:00_config');

var ov = ee.FeatureCollection(C.ASSET.overlay);
var bobot = ee.FeatureCollection(C.ASSET.bobot);
var total = ov.size();
print('Jumlah sel dipakai:', total);
print('Skenario bobot:', bobot.sort('idx').aggregate_array('nama'));

var hasil = ee.FeatureCollection(ee.List.sequence(2, 9).map(function (i) {
  var sc = ee.Feature(bobot.filter(ee.Filter.eq('idx', i)).first());
  var wd = ee.Dictionary(sc.toDictionary());
  var ubah = ov.map(function (f) {
    var k = C.kelasDariSkor(C.skorAkhir(f, wd));
    return f.set('beda', ee.Number(f.get('kelas_ahp')).neq(k));
  });
  var n = ee.Number(ubah.aggregate_sum('beda'));
  return ee.Feature(null, {
    idx: i,
    skenario: sc.get('nama'),
    mode_variasi: sc.get('mode_variasi'),
    sel_berpindah: n,
    persen_berpindah: n.divide(total).multiply(100)
  });
}));
print('Sel berpindah kelas vs AHP dasar:', hasil);
print('Persen terkecil dan terbesar:',
      hasil.aggregate_min('persen_berpindah'), hasil.aggregate_max('persen_berpindah'));

Export.table.toDrive({
  collection: hasil,
  description: 'sensitivitas_bobot',
  fileFormat: 'CSV'
});
