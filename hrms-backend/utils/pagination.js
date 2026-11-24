/**
 * Helper phân trang chuẩn Enterprise cho HRMS Backend
 * Hỗ trợ cả 2 chế độ:
 * 1. Chế độ phân trang (khi client truyền page/limit): trả về { data, total, page, limit, totalPages }
 * 2. Chế độ tương thích ngược (khi client không truyền page/limit): trả về mảng trực tiếp
 */

function getPagination(req, defaultLimit = 10, maxLimit = 100) {
  const page = parseInt(req.query.page, 10);
  const limit = parseInt(req.query.limit, 10);

  if (!page && !limit) {
    return { isPaginated: false };
  }

  const validPage = isNaN(page) || page < 1 ? 1 : page;
  const validLimit = isNaN(limit) || limit < 1 ? defaultLimit : Math.min(limit, maxLimit);
  const offset = (validPage - 1) * validLimit;

  return {
    isPaginated: true,
    page: validPage,
    limit: validLimit,
    offset
  };
}

function formatPaginatedResponse(res, count, rows, page, limit) {
  const totalPages = Math.ceil(count / limit);
  res.set('X-Total-Count', count.toString());
  res.set('X-Total-Pages', totalPages.toString());
  res.set('X-Current-Page', page.toString());
  res.set('X-Per-Page', limit.toString());

  return res.json({
    data: rows,
    total: count,
    page,
    limit,
    totalPages
  });
}

module.exports = {
  getPagination,
  formatPaginatedResponse
};
