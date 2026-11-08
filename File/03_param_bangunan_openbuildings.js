// ============================================================
// ID      : S03
// Judul   : Parameter kepadatan bangunan (Open Buildings 2.5D Temporal, 2023)
// Tujuan  : T1 | RM 1 | Laporan: 2.2, 2.3, 3.1 (peta skor bangunan)
// Input   : grid_250, GOOGLE/Research/open-buildings-temporal/v1 (band building_fractional_count)
// Output  : asset par_bld (cell_id, kecamatan, bld_raw, s_bld)
// Versi   : v1.0 | Tanggal: 02 - 11 - 2026 | Penulis: Radhitya Maulana Arrafi
// ============================================================
var C = require('users/radhityane/pratubes_pcd:00_config');

var TAHUN = 2023;                   // data tahunan 2016-2023
var BANDINGKAN_DENGAN_A_LAMA = true;

var grid = ee.FeatureCollection(C.ASSET.grid);
print('Jumlah sel grid:', grid.size());
Map.centerObject(grid, 13);

var aoi = grid.geometry().bounds();
var col = ee.ImageCollection('GOOGLE/Research/open-buildings-temporal/v1')
  .filterBounds(aoi)
  .filterDate(TAHUN + '-01-01', (TAHUN + 1) + '-01-01');
print('Jumlah tile citra untuk ' + TAHUN + ' (harus > 0):', col.size());
print('Timestamp tile:', col.aggregate_array('system:time_start').distinct());

var bld = col.mosaic().select('building_fractional_count');

var g = bld.reduceRegions({
  collection: grid,
  reducer: ee.Reducer.sum().setOutputs(['bld_raw']),
  scale: 4,
  tileScale: 8
});
print('Sel bld_raw kosong (null), akan dianggap 0:',
      g.filter(ee.Filter.notNull(['bld_raw']).not()).size());

var hasil = C.beriSkor(g, 'bld_raw', 's_bld', false);
print('Contoh 3 sel:', hasil.limit(3));
print('Sebaran skor bangunan:', hasil.aggregate_histogram('s_bld'));
print('Total perkiraan bangunan seluruh sel:', hasil.aggregate_sum('bld_raw'));
Map.addLayer(hasil.reduceToImage(['s_bld'], ee.Reducer.first()),
             {min: 1, max: 5, palette: C.PALET_SKOR}, 'Skor bangunan');

if (BANDINGKAN_DENGAN_A_LAMA) {
  var sama = ee.Filter.equals({leftField: 'cell_id', rightField: 'cell_id'});
  var gab = ee.Join.inner().apply(hasil, ee.FeatureCollection(C.ASSET.A_lama), sama)
    .map(function (p) {
      var a = ee.Feature(p.get('primary')), b = ee.Feature(p.get('secondary'));
      return ee.Feature(null, {
        sama: ee.Number(a.get('s_bld')).eq(ee.Number(b.get('s_bld'))),
        baru: a.get('bld_raw'), lama: b.get('bld_raw')
      });
    });
  print('Sel yang dibandingkan:', gab.size());
  print('Persen skor s_bld SAMA dengan A_params lama (target 100):',
        ee.Number(gab.aggregate_mean('sama')).multiply(100));
  print('Spearman bld_raw baru vs lama:',
        gab.reduceColumns(ee.Reducer.spearmansCorrelation(), ['baru', 'lama']));
}

Export.table.toAsset({
  collection: hasil.select(['cell_id', 'kecamatan', 'bld_raw', 's_bld']),
  description: 'par_bld',
  assetId: C.ASSET.bld
});
