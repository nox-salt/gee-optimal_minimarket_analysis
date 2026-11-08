// ============================================================
// ID      : S05
// Judul   : Parameter jarak ke jalan utama (GRIP4)
// Tujuan  : T1 | RM 1 | Laporan: 2.2, 2.3, 3.1 (peta skor jalan)
// Input   : grid_250, GRIP4 Asia Tenggara (katalog komunitas)
// Output  : asset par_road (cell_id, kecamatan, road_dist, s_road)
// Versi   : v1.0 | Tanggal: 03 - 11 - 2026 | Penulis: Radhitya Maulana Arrafi
// ============================================================
var C = require('users/radhityane/pratubes_pcd:00_config');

var TIPE_MAKS = 3;   

var grid = ee.FeatureCollection(C.ASSET.grid);
print('Jumlah sel grid:', grid.size());
Map.centerObject(grid, 13);

var aoi = grid.geometry().bounds().buffer(6000);
var jalanSemua = ee.FeatureCollection('projects/sat-io/open-datasets/GRIP4/South-East-Asia')
  .filterBounds(aoi);
print('Contoh 1 ruas jalan (cek nama kolom GP_RTP):', jalanSemua.first());

var jalanUtama = jalanSemua.filter(ee.Filter.lte('GP_RTP', TIPE_MAKS));
print('Jumlah ruas jalan utama (harus > 0):', jalanUtama.size());
Map.addLayer(jalanUtama, {color: 'orange'}, 'Jalan utama (GRIP4)');

var jarak = jalanUtama.distance({searchRadius: 5000, maxError: 10});
var g = jarak.reduceRegions({
  collection: grid,
  reducer: ee.Reducer.mean().setOutputs(['road_dist']),
  scale: 30
});
print('Sel road_dist kosong (null), akan dianggap 0:',
      g.filter(ee.Filter.notNull(['road_dist']).not()).size());

var hasil = C.beriSkor(g, 'road_dist', 's_road', true);   
print('Contoh 3 sel:', hasil.limit(3));
print('Sebaran skor jalan:', hasil.aggregate_histogram('s_road'));
Map.addLayer(hasil.reduceToImage(['s_road'], ee.Reducer.first()),
             {min: 1, max: 5, palette: C.PALET_SKOR}, 'Skor jalan');

Export.table.toAsset({
  collection: hasil.select(['cell_id', 'kecamatan', 'road_dist', 's_road']),
  description: 'par_road',
  assetId: C.ASSET.road
});
