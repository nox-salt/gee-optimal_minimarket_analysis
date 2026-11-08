// ============================================================
// ID      : S09
// Judul   : Stabilitas = sel tetap berkelas Tinggi/Sangat Tinggi di SEMUA skenario bobot
// Tujuan  : T3 | RM 3 | Laporan: 3.3 (Gambar peta stabilitas, Tabel per kecamatan)
// Input   : hasil_overlay (memuat s_*), bobot_skenario (10 skenario)
// Output  : asset hasil_stabilitas (kmin, status), CSV tabel_stabilitas_per_kecamatan
// Versi   : v1.0 | Tanggal: 07 - 11 - 2026 | Penulis: Radhitya Maulana Arrafi
// status : 0 = bukan kelas tinggi (AHP), 1 = tinggi tapi tidak tahan bobot, 2 = tahan bobot
// ============================================================
var C = require('users/radhityane/pratubes_pcd:00_config');

var N = 10;   
var ov = ee.FeatureCollection(C.ASSET.overlay);
print('Jumlah skenario di asset bobot (harus 10):', ee.FeatureCollection(C.ASSET.bobot).size());
print('Jumlah sel dipakai:', ov.size());

var daftarW = [];
for (var i = 0; i < N; i++) { daftarW.push(C.bobotDari(i)); }

var fc = ov.map(function (f) {
  var ks = [];
  daftarW.forEach(function (wd, idx) {
    var k = C.kelasDariSkor(C.skorAkhir(f, wd));
    f = f.set('k' + idx, k);
    ks.push(k);
  });
  var kmin = ee.Number(ee.List(ks).reduce(ee.Reducer.min()));
  var tinggiDasar = ee.Number(f.get('k0')).gte(C.KELAS_TINGGI_MIN);
  var tahan = kmin.gte(C.KELAS_TINGGI_MIN);
  return f.set('kmin', kmin).set('status', tinggiDasar.add(tahan));
});

var nTinggi = fc.filter(ee.Filter.gte('k0', C.KELAS_TINGGI_MIN)).size();
var nTahan  = fc.filter(ee.Filter.eq('status', 2)).size();
print('Jumlah sel kelas Tinggi/Sangat Tinggi (AHP):', nTinggi);
print('Jumlah sel yang tahan bobot (stabil):', nTahan);
print('Persen sel kelas tinggi yang stabil:', ee.Number(nTahan).divide(nTinggi).multiply(100));

// Tabel per kecamatan
var daftarKec = ee.List(fc.aggregate_array('kecamatan')).distinct();
var tabel = ee.FeatureCollection(daftarKec.map(function (k) {
  var sub = fc.filter(ee.Filter.eq('kecamatan', k));
  return ee.Feature(null, {
    kecamatan: k,
    jumlah_sel: sub.size(),
    sel_tinggi_ahp: sub.filter(ee.Filter.gte('k0', C.KELAS_TINGGI_MIN)).size(),
    sel_stabil: sub.filter(ee.Filter.eq('status', 2)).size()
  });
}));
print('Tabel stabilitas per kecamatan:', tabel);

// Peta dan legenda
var warna = ['eeeeee', 'fdae61', '1a9641'];
var labelStatus = ['Bukan kelas tinggi', 'Tinggi, tidak stabil', 'Tinggi dan stabil'];
Map.centerObject(ov, 13);
Map.addLayer(fc.reduceToImage(['status'], ee.Reducer.first()),
             {min: 0, max: 2, palette: warna}, 'Stabilitas terhadap bobot');
var legend = ui.Panel({style: {position: 'bottom-left', padding: '8px 12px'}});
legend.add(ui.Label('Stabilitas', {fontWeight: 'bold'}));
labelStatus.forEach(function (nama, i) {
  legend.add(ui.Panel([
    ui.Label('', {backgroundColor: '#' + warna[i], padding: '8px', margin: '0 6px 4px 0'}),
    ui.Label(nama, {margin: '0 0 4px 0'})
  ], ui.Panel.Layout.Flow('horizontal')));
});
Map.add(legend);

Export.table.toAsset({
  collection: fc.select(['cell_id', 'kecamatan', 'kmin', 'status']),
  description: 'hasil_stabilitas',
  assetId: C.ASSET.stabil
});
Export.table.toDrive({
  collection: tabel,
  description: 'tabel_stabilitas_per_kecamatan',
  fileFormat: 'CSV'
});
