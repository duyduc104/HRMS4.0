/**
 * leaveUtils.js — Hàm tính ngày nghỉ phép dùng chung
 *
 * Đảm bảo nhất quán giữa payrollController.js và telegramBot.js.
 * Logic: loại trừ T7, CN; xử lý nửa ngày; clip theo kỳ lương.
 */

/**
 * Tính số ngày nghỉ phép hợp lệ từ danh sách Leave objects.
 *
 * @param {Array}  leaves      - Mảng leave records từ DB (phải có startDate, endDate)
 * @param {Date}   [periodStart] - Giới hạn đầu kỳ (để tính trong tháng cụ thể)
 * @param {Date}   [periodEnd]   - Giới hạn cuối kỳ
 * @returns {number} Tổng số ngày nghỉ phép (có thể là 0.5 cho nửa ngày)
 */
function calculateLeaveDays(leaves, periodStart = null, periodEnd = null) {
  let totalDays = 0;

  leaves.forEach(leave => {
    const rawStart = new Date(leave.startDate);
    const rawEnd   = new Date(leave.endDate);

    // Clip về biên kỳ lương nếu được cung cấp
    const clippedStart = periodStart ? new Date(Math.max(rawStart, periodStart)) : rawStart;
    const clippedEnd   = periodEnd   ? new Date(Math.min(rawEnd,   periodEnd))   : rawEnd;

    // Normalize về đầu ngày (bỏ giờ phút giây)
    const start = new Date(clippedStart.getFullYear(), clippedStart.getMonth(), clippedStart.getDate());
    const end   = new Date(clippedEnd.getFullYear(),   clippedEnd.getMonth(),   clippedEnd.getDate());

    if (end < start) return; // Không nằm trong kỳ → bỏ qua

    // --- Cùng một ngày: kiểm tra nửa ngày hay cả ngày ---
    if (start.getTime() === end.getTime()) {
      if (start.getDay() === 0 || start.getDay() === 6) return; // T7, CN → bỏ qua
      const hours = (new Date(leave.endDate) - new Date(leave.startDate)) / (1000 * 60 * 60);
      totalDays += hours <= 4.5 ? 0.5 : 1;
      return;
    }

    // --- Nhiều ngày: đếm ngày làm việc (loại trừ T7, CN) ---
    let count = 0;
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const day = d.getDay();
      if (day !== 0 && day !== 6) count++;
    }
    totalDays += count;
  });

  return totalDays;
}

module.exports = { calculateLeaveDays };
