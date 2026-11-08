// ============================================================
// ID      : S08
// Judul   : Weighted overlay, klasifikasi 5 kelas, luas dan sebaran per kecamatan
// Tujuan  : T1 (model), T2 (peta kelas dan ringkasan per kecamatan)
// RM      : 1, 2 | Laporan: 3.2 (Gambar peta AHP dan sama rata, Tabel kelas)
// Input   : params_all, bobot_skenario (idx 0 = AHP, idx 1 = sama rata)
// Output  : asset hasil_overlay (s_*, skor_ahp, kelas_ahp, skor_sr, kelas_sr),
//           CSV tabel_kelas_per_kecamatan
// Versi   : v1.0 | Tanggal: 06 - 11 -2026 | Penulis: Zaidan Zulkaisi Setiaji
// ============================================================
var C = require('users/radhityane/pratubes_pcd:00_config');

var params = ee.FeatureCollection(C.ASSET.params);
var wAhp = C.bobotDari(0);
var wSr  = C.bobotDari(1);
print('Bobot AHP:', wAhp);
print('Bobot sama rata:', wSr);
print('Jumlah sel dipakai (harus sama dengan grid):', params.size());

var ov = params.map(function (f) {
  var sa = C.skorAkhir(f, wAhp);
  var ss = C.skorAkhir(f, wSr);
  return f.set({
    skor_ahp: sa, kelas_ahp: C.kelasDariSkor(sa),
    skor_sr:  ss, kelas_sr:  C.kelasDariSkor(ss)
  });
});

// Jumlah sel per kelas (luas km2 = jumlah sel x 0,0625; pendekatan)
print('Jumlah sel per kelas (AHP):', ov.aggregate_histogram('kelas_ahp'));
print('Jumlah sel per kelas (sama rata):', ov.aggregate_histogram('kelas_sr'));

// Tabel kelas per kecamatan
var daftarKec = ee.List(ov.aggregate_array('kecamatan')).distinct();
var tabel = ee.FeatureCollection(daftarKec.map(function (k) {
  var sub = ov.filter(ee.Filter.eq('kecamatan', k));
  var d = {kecamatan: k, jumlah_sel: sub.size()};
  for (var j = 1; j <= 5; j++) {
    d['ahp_k' + j] = sub.filter(ee.Filter.eq('kelas_ahp', j)).size();
    d['sr_k' + j]  = sub.filter(ee.Filter.eq('kelas_sr', j)).size();
  }
  return ee.Feature(null, d);
}));
print('Tabel kelas per kecamatan:', tabel);

// Peta dan legenda
function legenda(judul) {
  var p = ui.Panel({style: {position: 'bottom-left', padding: '8px 12px'}});
  p.add(ui.Label(judul, {fontWeight: 'bold'}));
  C.KELAS_NAMA.forEach(function (n, i) {
    p.add(ui.Panel([
      ui.Label('', {backgroundColor: '#' + C.PALET_KELAS[i], padding: '8px', margin: '0 6px 4px 0'}),
      ui.Label(n, {margin: '0 0 4px 0'})
    ], ui.Panel.Layout.Flow('horizontal')));
  });
  return p;
}
Map.centerObject(ov, 13);
Map.addLayer(ov.reduceToImage(['kelas_sr'], ee.Reducer.first()),
             {min: 1, max: 5, palette: C.PALET_KELAS}, 'Kelas (sama rata)', false);
Map.addLayer(ov.reduceToImage(['kelas_ahp'], ee.Reducer.first()),
             {min: 1, max: 5, palette: C.PALET_KELAS}, 'Kelas (AHP)');
Map.add(legenda('Kelas kesesuaian'));

Export.table.toAsset({
  collection: ov.select(['cell_id', 'kecamatan', 's_pop', 's_bld', 's_eco', 's_road',
                         'skor_ahp', 'kelas_ahp', 'skor_sr', 'kelas_sr']),
  description: 'hasil_overlay',
  assetId: C.ASSET.overlay
});
Export.table.toDrive({
  collection: tabel,
  description: 'tabel_kelas_per_kecamatan',
  fileFormat: 'CSV'
});
