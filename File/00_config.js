exports.PROJECT = 'polbanpcd2026';
var BASE = 'projects/' + exports.PROJECT + '/assets/';

exports.ASSET = {
  grid:    BASE + 'grid_250',         
  pop:     BASE + 'par_pop',          
  bld:     BASE + 'par_bld',          
  eco:     BASE + 'par_eco',          
  road:    BASE + 'par_road',         
  params:  BASE + 'params_all',       
  bobot:   BASE + 'bobot_skenario',   
  overlay: BASE + 'hasil_overlay',    
  stabil:  BASE + 'hasil_stabilitas', 
};

// Nama kriteria 
exports.NAMA_KRIT = ['Populasi', 'Bangunan', 'Ekonomi', 'Jalan'];

// Daftar kecamatan 
exports.NAMA_KEC_NRM = ['batununggal', 'lengkong', 'kiaracondong', 'bandungkidul', 'buahbatu'];

// Parameter klasifikasi kelas
exports.LEBAR_KELAS = 0.8;        
exports.KELAS_TINGGI_MIN = 4;     
exports.LUAS_SEL_KM2 = 0.0625;    
exports.KELAS_NAMA = ['Sangat Rendah', 'Rendah', 'Sedang', 'Tinggi', 'Sangat Tinggi'];
exports.PALET_KELAS = ['d7191c', 'fdae61', 'ffffbf', 'a6d96a', '1a9641'];
exports.PALET_SKOR = ['d7191c', 'fdae61', 'ffffbf', 'a6d96a', '1a9641'];

// Konversi nilai mentah ke skor 1-5 
exports.beriSkor = function (fc, kolom, kolomSkor, dibalik) {
  fc = fc.map(function (f) {
    return f.set(kolom, ee.Algorithms.If(f.get(kolom), f.get(kolom), 0));
  });
  var p = fc.reduceColumns({
    reducer: ee.Reducer.percentile([20, 40, 60, 80]),
    selectors: [kolom]
  });
  var p20 = ee.Number(p.get('p20')), p40 = ee.Number(p.get('p40')),
      p60 = ee.Number(p.get('p60')), p80 = ee.Number(p.get('p80'));
  return fc.map(function (f) {
    var v = ee.Number(f.get(kolom));
    var s = ee.Number(1).add(v.gt(p20)).add(v.gt(p40))
              .add(v.gt(p60)).add(v.gt(p80));
    if (dibalik) { s = ee.Number(6).subtract(s); }
    return f.set(kolomSkor, s);
  });
};

// Ambil bobot skenario berdasarkan index baris
exports.bobotDari = function (idx) {
  var fc = ee.FeatureCollection(exports.ASSET.bobot).filter(ee.Filter.eq('idx', idx));
  return ee.Dictionary(ee.Feature(fc.first()).toDictionary());
};

// Hitung skor akhir (weighted sum)
exports.skorAkhir = function (f, wd) {
  wd = ee.Dictionary(wd);
  return ee.Number(f.get('s_pop')).multiply(ee.Number(wd.get('w_pop')))
    .add(ee.Number(f.get('s_bld')).multiply(ee.Number(wd.get('w_bld'))))
    .add(ee.Number(f.get('s_eco')).multiply(ee.Number(wd.get('w_eco'))))
    .add(ee.Number(f.get('s_road')).multiply(ee.Number(wd.get('w_road'))));
};

// Konversi skor (1-5) ke kelas (1-5)
exports.kelasDariSkor = function (skor) {
  return ee.Number(skor).subtract(1).divide(exports.LEBAR_KELAS)
           .floor().min(4).add(1).int();
};