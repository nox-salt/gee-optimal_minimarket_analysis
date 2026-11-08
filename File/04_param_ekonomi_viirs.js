// ============================================================
// ID      : S04
// Judul   : Parameter aktivitas ekonomi (VIIRS 2025)
// Tujuan  : T1 | RM 1 | Laporan: 2.2, 2.3, 3.1 (peta skor ekonomi)
// Input   : grid_250, NOAA/VIIRS/DNB/MONTHLY_V1/VCMCFG
// Output  : asset par_eco (cell_id, kecamatan, eco_raw, s_eco)
// Versi   : v1.1 | Tanggal: 02 - 11 - 2026 | Penulis: Zaidan Zulkaisi Setiaji
// ============================================================
var C = require('users/radhityane/pratubes_pcd:00_config');

var CF_MIN = 5; 
var TAHUN_AWAL = '2025-01-01', TAHUN_AKHIR = '2026-01-01';

var DENOISE_VIIRS = true;
var SIGMA_M = 400;              

var grid = ee.FeatureCollection(C.ASSET.grid);
print('Jumlah sel grid:', grid.size());
Map.centerObject(grid, 13);

var viirs = ee.ImageCollection('NOAA/VIIRS/DNB/MONTHLY_V1/VCMCFG')
  .filterDate(TAHUN_AWAL, TAHUN_AKHIR)
  .map(function (img) {
    return img.select('avg_rad').updateMask(img.select('cf_cvg').gte(CF_MIN));
  });
print('Jumlah bulan VIIRS (harus > 0; jika 0 pakai 2024 dan catat di laporan):', viirs.size());

var eco = viirs.median().max(0);
if (DENOISE_VIIRS) {
  eco = eco.unmask(0).reproject({crs: 'EPSG:32748', scale: 250}).convolve(
    ee.Kernel.gaussian({radius: 3 * SIGMA_M, sigma: SIGMA_M, units: 'meters', normalize: true}));
}
print('Denoise Gaussian aktif?', DENOISE_VIIRS);
var g = eco.reduceRegions({
  collection: grid,
  reducer: ee.Reducer.mean().setOutputs(['eco_raw']),
  scale: 250,
  tileScale: 4
});
print('Sel eco_raw kosong (null), akan dianggap 0:',
      g.filter(ee.Filter.notNull(['eco_raw']).not()).size());

var hasil = C.beriSkor(g, 'eco_raw', 's_eco', false);
print('Contoh 3 sel:', hasil.limit(3));
print('Sebaran skor ekonomi:', hasil.aggregate_histogram('s_eco'));
Map.addLayer(hasil.reduceToImage(['s_eco'], ee.Reducer.first()),
             {min: 1, max: 5, palette: C.PALET_SKOR}, 'Skor ekonomi');

Export.table.toAsset({
  collection: hasil.select(['cell_id', 'kecamatan', 'eco_raw', 's_eco']),
  description: 'par_eco',
  assetId: C.ASSET.eco
});