// Tien ich xu ly chuoi van ban tieng Viet
// Giai thich code khong thuan:
// - Su dung Unicode Normalization Form Canonical Decomposition (NFD) de tach ky tu co dau thanh cap (chu cai goc + dau to hop).
// - Ap dung bieu thuc chinh quy regex /[\u0300-\u036f]/g de loai bo toan bo phan dau to hop (Combining Diacritical Marks).
// - Thay the ky tu dac biet đ/Đ thanh d/D giup chuan hoa chuoi khong dau phuc vu tim kiem Full-text Search va Elasticsearch.

// Ham nay dung de loai bo toan bo dau tieng Viet khoi chuoi van ban va chuyen ve chu thuong
function removeAccents(str) {
  if (!str) return '';
  return str
    .normalize('NFD') // Tach to hop ky tu
    .replace(/[\u0300-\u036f]/g, '') // Bo cac dau thanh
    .replace(/đ/g, 'd').replace(/Đ/g, 'D') // Doi đ -> d
    .toLowerCase();
}

module.exports = {
  removeAccents
};
