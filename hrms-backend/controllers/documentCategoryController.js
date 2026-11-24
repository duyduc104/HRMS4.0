const { DocumentCategory } = require('../models');

// Ham nay dung de lay toan bo danh muc tai lieu, cong van trong he thong theo thu tu sap xep
exports.getCategories = async (req, res) => {
  try {
    const categories = await DocumentCategory.findAll({
      order: [['order', 'ASC'], ['createdAt', 'ASC']]
    });
    // Trả về dạng mảng phẳng, frontend sẽ tự dựng cây (tree) hoặc backend dựng sẵn
    res.json(categories);
  } catch (error) {
    console.error('Lỗi lấy danh mục tài liệu:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// Ham nay dung de tao moi mot danh muc tai lieu (ho tro phan cap cay thu muc cha - con qua parentId)
exports.createCategory = async (req, res) => {
  try {
    const { name, parentId, order } = req.body;
    if (!name) return res.status(400).json({ message: 'Vui lòng nhập tên danh mục' });

    const newCategory = await DocumentCategory.create({
      name,
      parentId: parentId || null,
      order: order || 0
    });

    res.status(201).json(newCategory);
  } catch (error) {
    console.error('Lỗi tạo danh mục tài liệu:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// Ham nay dung de cap nhat thong tin danh muc tai lieu (ten, danh muc cha, thu tu)
exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, parentId, order } = req.body;
    
    const category = await DocumentCategory.findByPk(id);
    if (!category) return res.status(404).json({ message: 'Không tìm thấy danh mục' });

    await category.update({
      name: name !== undefined ? name : category.name,
      parentId: parentId !== undefined ? parentId : category.parentId,
      order: order !== undefined ? order : category.order
    });

    res.json(category);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// Ham nay dung de xoa mot danh muc tai lieu
// Giai thich code khong thuan: Kiem tra rang buoc neu danh muc dang co danh muc con (children > 0) thi chan khong cho xoa de tranh mat lien ket cay thu muc
exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await DocumentCategory.findByPk(id);
    if (!category) return res.status(404).json({ message: 'Không tìm thấy danh mục' });

    // Cần kiểm tra xem có tài liệu hoặc danh mục con nào không trước khi xóa
    const children = await DocumentCategory.count({ where: { parentId: id } });
    if (children > 0) {
      return res.status(400).json({ message: 'Không thể xóa danh mục có chứa danh mục con' });
    }

    await category.destroy();
    res.json({ message: 'Đã xóa danh mục' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};
