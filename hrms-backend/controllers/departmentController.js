const { Department } = require('../models');
const { getPagination, formatPaginatedResponse } = require('../utils/pagination');

// Controller quan ly danh muc phong ban trong he thong

// Ham nay dung de lay danh sach cac phong ban chua bi xoa mem (Ho tro phan trang)
exports.getAll = async (req, res) => {
  try {
    const { isPaginated, page, limit, offset } = getPagination(req, 10, 100);
    const queryOptions = {
      where: { isDeleted: false },
      order: [['createdAt', 'ASC']]
    };

    if (isPaginated) {
      queryOptions.limit = limit;
      queryOptions.offset = offset;
      const { count, rows } = await Department.findAndCountAll(queryOptions);
      return formatPaginatedResponse(res, count, rows, page, limit);
    }

    const departments = await Department.findAll(queryOptions);
    res.json(departments);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// Ham nay dung de them moi mot phong ban, kiem tra trung lap ten phong ban
exports.create = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ message: 'Tên phòng ban là bắt buộc' });
    
    const dept = await Department.create({ name, description });
    res.status(201).json({ message: 'Thêm phòng ban thành công', department: dept });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ message: 'Tên phòng ban đã tồn tại' });
    }
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// Ham nay dung de cap nhat ten hoac mo ta cua phong ban theo id
exports.update = async (req, res) => {
  try {
    const { name, description } = req.body;
    const dept = await Department.findOne({ where: { id: req.params.id, isDeleted: false } });
    if (!dept) return res.status(404).json({ message: 'Không tìm thấy phòng ban' });
    
    if (name) dept.name = name;
    if (description !== undefined) dept.description = description;
    
    await dept.save();
    res.json({ message: 'Cập nhật thành công', department: dept });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ message: 'Tên phòng ban đã tồn tại' });
    }
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// Ham nay dung de xoa mem phong ban (chuyen co isDeleted = true)
exports.delete = async (req, res) => {
  try {
    const dept = await Department.findOne({ where: { id: req.params.id, isDeleted: false } });
    if (!dept) return res.status(404).json({ message: 'Không tìm thấy phòng ban' });
    
    await dept.update({ isDeleted: true });
    res.json({ message: 'Đã xóa mềm phòng ban' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};
