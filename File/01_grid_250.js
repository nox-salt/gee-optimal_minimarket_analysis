// ============================================================
// ID      : S01
// Judul   : Grid 250 m untuk 5 kecamatan
// Tujuan  : T1 (landasan model) | RM 1 | Laporan: 2.1, 3.1 (Gambar grid)
// Input   : geoBoundaries ADM3 (katalog komunitas)
// Output  : asset grid_250 (cell_id, kecamatan)
// Versi   : v1.1 | Tanggal: 01 - 11 - 2026 | Penulis: Zaidan Zulkaisi
// ============================================================

var C = require('users/radhityane/pratubes_pcd:00_config');
var ADM3_ASSET = 'projects/sat-io/open-datasets/field-maps/edge-matched-humanitarian/adm3_polygons';
var PROP_NAMA  = 'adm3_name';

var adm3 = ee.FeatureCollection(ADM3_ASSET);
print('0.  Total fitur di asset ADM3 (harus > 0):', adm3.size());

function tambahNrm(f) {
  var nrm = ee.String(f.get(PROP_NAMA)).toLowerCase().replace('[^a-z]', '', 'g');
  return f.set('nrm', nrm);
}

var kotakBandung = ee.Geometry.Rectangle([107.50, -7.05, 107.75, -6.80]);
var mentah = adm3.filterBounds(kotakBandung);
print('1e. Nama-nama properti (cari yang berisi nama kecamatan):',
      ee.Feature(mentah.first()).propertyNames());
var sekitarBandung = mentah.map(tambahNrm);
print('1a. Fitur sekitar Bandung (harus > 0):', sekitarBandung.size());
print('1b. Nama (asli) sekitar Bandung:', sekitarBandung.aggregate_array(PROP_NAMA));
print('1c. Nama (normalisasi) -- bandingkan dengan NAMA_KEC_NRM:', sekitarBandung.aggregate_array('nrm'));
print('1d. NAMA_KEC_NRM di 00_config:', C.NAMA_KEC_NRM);

var kec = sekitarBandung.filter(ee.Filter.inList('nrm', C.NAMA_KEC_NRM));
print('2a. Kecamatan terpilih (HARUS 5):', kec.size());
print('2b. Nama terpilih:', kec.aggregate_array(PROP_NAMA));

Map.setCenter(107.63, -6.93, 12);
Map.addLayer(kec.style({color: 'red', fillColor: '00000000', width: 2}), {}, 'Kecamatan');

var proj = ee.Projection('EPSG:32748').atScale(250);
var grid0 = kec.geometry().coveringGrid(proj);
print('3a. Sel mentah (harus > 0):', grid0.size());
print('3b. Luas 1 sel m2 (sekitar 62500):', grid0.limit(1).geometry().area(1));

var grid1 = grid0.map(function (sel) {
  var titik = sel.geometry().centroid(1);
  var hit = kec.filterBounds(titik);
  var nama = ee.List(hit.aggregate_array(PROP_NAMA)).add('LUAR').get(0);
  var ll = titik.transform('EPSG:4326', 1).coordinates();
  var lonI = ee.Number(ll.get(0)).subtract(107).multiply(10000).round();
  var latI = ee.Number(ll.get(1)).multiply(-1).subtract(6).multiply(10000).round();
  var id = lonI.multiply(100000).add(latI).int();
  return sel.set({kecamatan: nama, cell_id: id});
}).filter(ee.Filter.neq('kecamatan', 'LUAR'));

var grid2 = grid1.select(['cell_id', 'kecamatan']);
print('4a. Jumlah sel grid (acuan: 460):', grid2.size());
print('4b. cell_id unik? (dua angka sama):', grid2.aggregate_count_distinct('cell_id'), grid2.size());
print('4c. Sel per kecamatan:', grid2.aggregate_histogram('kecamatan'));
Map.addLayer(grid2.style({color: '0000ff', fillColor: '00000000', width: 1}), {}, 'Grid 250 m');

Export.table.toAsset({
  collection: grid2,
  description: 'grid_250',
  assetId: C.ASSET.grid
});