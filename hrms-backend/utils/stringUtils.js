// utils/stringUtils.js

/**
 * Loại bỏ dấu tiếng Việt khỏi chuỗi
 * @param {string} str 
 * @returns {string} Chuỗi không dấu
 */
function removeAccents(str) {
  if (!str) return '';
  return str
    .normalize('NFD') // Tách tổ hợp ký tự (VD: 'ê' -> 'e' + '^')
    .replace(/[\u0300-\u036f]/g, '') // Bỏ các dấu thanh
    .replace(/đ/g, 'd').replace(/Đ/g, 'D') // Đổi đ -> d
    .toLowerCase();
}

module.exports = {
  removeAccents
};
