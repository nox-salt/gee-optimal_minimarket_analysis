// ============================================================
// ID      : S06
// Judul   : Penggabungan empat parameter per sel (kunci: cell_id)
// Tujuan  : T1 | RM 1 | Laporan: 2.3, 3.1
// Input   : grid_250, par_pop, par_bld, par_eco, par_road
// Output  : asset params_all (cell_id, kecamatan, pop_raw, bld_raw, eco_raw,
//           road_dist, s_pop, s_bld, s_eco, s_road)
// Versi   : v1.0 | Tanggal: 04 - 11 - 2026 | Penulis: Raditya Maulana Arrafi
// ============================================================
var C = require('users/radhityane/pratubes_pcd:00_config');

var grid = ee.FeatureCollection(C.ASSET.grid);
var sama = ee.Filter.equals({leftField: 'cell_id', rightField: 'cell_id'});

function gabung(dasar, tambahan, kolom) {
  return ee.Join.inner().apply(dasar, tambahan, sama).map(function (p) {
    return ee.Feature(p.get('primary'))
             .copyProperties(ee.Feature(p.get('secondary')), kolom);
  });
}

var h = gabung(grid, ee.FeatureCollection(C.ASSET.pop),  ['pop_raw', 's_pop']);
h = gabung(h, ee.FeatureCollection(C.ASSET.bld),  ['bld_raw', 's_bld']);
h = gabung(h, ee.FeatureCollection(C.ASSET.eco),  ['eco_raw', 's_eco']);
h = gabung(h, ee.FeatureCollection(C.ASSET.road), ['road_dist', 's_road']);

print('Jumlah sel grid:', grid.size());
print('Jumlah sel setelah digabung (HARUS sama):', h.size());
print('Contoh 3 sel:', h.limit(3));
print('Sel dengan skor kosong (harus 0):',
      h.filter(ee.Filter.or(
        ee.Filter.notNull(['s_pop']).not(), ee.Filter.notNull(['s_bld']).not(),
        ee.Filter.notNull(['s_eco']).not(), ee.Filter.notNull(['s_road']).not())).size());

Export.table.toAsset({
  collection: h,
  description: 'params_all',
  assetId: C.ASSET.params
});
