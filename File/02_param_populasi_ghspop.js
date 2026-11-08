// ============================================================
// ID      : S02
// Judul   : Parameter populasi (GHS-POP 2025, proyeksi)
// Tujuan  : T1 | RM 1 | Laporan: 2.2, 2.3, 3.1 (peta skor populasi)
// Input   : grid_250, JRC/GHSL/P2023A/GHS_POP/2025 (band population_count, 100 m)
// Output  : asset par_pop (cell_id, kecamatan, pop_raw, s_pop)
// Versi   : v1.0 | Tanggal: 01 - 11 - 2026 | Penulis: Zaidan Zulkaisi Setiaji
// ============================================================
var C = require('users/radhityane/pratubes_pcd:00_config');

var EPOCH = '2025';                 
var RADIUS_FOKAL_M = 0;             

var TOTAL_BPS_5_KEC_2026 = 489693; 

var grid = ee.FeatureCollection(C.ASSET.grid);
print('Jumlah sel grid:', grid.size());
Map.centerObject(grid, 13);

var pop = ee.Image('JRC/GHSL/P2023A/GHS_POP/' + EPOCH).select('population_count');
if (RADIUS_FOKAL_M > 0) {
  pop = pop.reduceNeighborhood({
    reducer: ee.Reducer.sum(),
    kernel: ee.Kernel.circle({radius: RADIUS_FOKAL_M, units: 'meters'})
  });
}

var g = pop.reduceRegions({
  collection: grid,
  reducer: ee.Reducer.sum().setOutputs(['pop_raw']),
  scale: 100,
  tileScale: 4
});
print('Sel pop_raw kosong (null), akan dianggap 0:',
      g.filter(ee.Filter.notNull(['pop_raw']).not()).size());

var hasil = C.beriSkor(g, 'pop_raw', 's_pop', false);
print('Contoh 3 sel:', hasil.limit(3));
print('Sebaran skor populasi:', hasil.aggregate_histogram('s_pop'));
if (RADIUS_FOKAL_M === 0) {
  print('Total penduduk seluruh sel (bandingkan dengan BPS 2026 = ' + TOTAL_BPS_5_KEC_2026 + '):',
        hasil.aggregate_sum('pop_raw'));
}
Map.addLayer(hasil.reduceToImage(['s_pop'], ee.Reducer.first()),
             {min: 1, max: 5, palette: C.PALET_SKOR}, 'Skor populasi');

if (BANDINGKAN_DENGAN_A_LAMA) {
  var sama = ee.Filter.equals({leftField: 'cell_id', rightField: 'cell_id'});
  var gab = ee.Join.inner().apply(hasil, ee.FeatureCollection(C.ASSET.A_lama), sama)
    .map(function (p) {
      var a = ee.Feature(p.get('primary')), b = ee.Feature(p.get('secondary'));
      return ee.Feature(null, {
        sama: ee.Number(a.get('s_pop')).eq(ee.Number(b.get('s_pop'))),
        baru: a.get('pop_raw'), lama: b.get('pop_raw')
      });
    });
  print('Sel yang dibandingkan:', gab.size());
  print('Persen skor s_pop SAMA dengan A_params lama (target 100):',
        ee.Number(gab.aggregate_mean('sama')).multiply(100));
  print('Spearman pop_raw baru vs lama:',
        gab.reduceColumns(ee.Reducer.spearmansCorrelation(), ['baru', 'lama']));
}

Export.table.toAsset({
  collection: hasil.select(['cell_id', 'kecamatan', 'pop_raw', 's_pop']),
  description: 'par_pop',
  assetId: C.ASSET.pop
});
