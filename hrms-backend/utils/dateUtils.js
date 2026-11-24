/**
 * Tiện ích xử lý Ngày giờ chuẩn múi giờ Việt Nam (Asia/Ho_Chi_Minh - UTC+7)
 * Giải quyết triệt để lỗi toISOString() bị lùi ngày vào khung giờ 00:00 - 06:59 sáng tại Việt Nam.
 */

/**
 * Lấy chuỗi ngày YYYY-MM-DD theo múi giờ Việt Nam (UTC+7)
 * @param {Date|string|number} [date=new Date()]
 * @returns {string} định dạng YYYY-MM-DD
 */
function getVietnamDate(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  return new Intl.DateTimeFormat('en-CA', { 
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(d);
}

/**
 * Lấy chuỗi ngày giờ đầy đủ YYYY-MM-DD HH:mm:ss theo múi giờ Việt Nam
 * @param {Date|string|number} [date=new Date()]
 * @returns {string}
 */
function getVietnamDateTime(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
}

module.exports = {
  getVietnamDate,
  getVietnamDateTime
};
