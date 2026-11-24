const { MenuItem, Setting } = require('../models');

// Danh sách Menu mặc định khởi tạo ban đầu
const DEFAULT_MENUS = [
  // Nhóm OVERVIEW
  { key: 'dashboard', title: 'Tổng quan', path: '/', icon: 'LayoutDashboard', group: 'OVERVIEW', order: 1, allowedRoles: JSON.stringify(['admin', 'hr_manager', 'department_manager', 'employee']), featureKey: null, isVisible: true },
  { key: 'policies', title: 'Chính sách & Tài liệu', path: '/policies', icon: 'BookOpen', group: 'OVERVIEW', order: 2, allowedRoles: JSON.stringify(['admin', 'hr_manager', 'department_manager', 'employee']), featureKey: 'ENABLE_POLICIES', isVisible: true },
  { key: 'chat', title: 'Mạng nội bộ (Chat)', path: '/chat', icon: 'MessageSquare', group: 'OVERVIEW', order: 3, allowedRoles: JSON.stringify(['admin', 'hr_manager', 'department_manager', 'employee']), featureKey: 'ENABLE_CHAT', isVisible: true },
  { key: 'onboarding', title: 'Onboarding', path: '/onboarding', icon: 'Rocket', group: 'OVERVIEW', order: 4, allowedRoles: JSON.stringify(['admin', 'hr_manager', 'department_manager', 'employee']), featureKey: 'ENABLE_ONBOARDING', isVisible: true },
  { key: 'events', title: 'Lịch & Sự kiện', path: '/events', icon: 'CalendarDays', group: 'OVERVIEW', order: 5, allowedRoles: JSON.stringify(['admin', 'hr_manager', 'department_manager', 'employee']), featureKey: 'ENABLE_EVENTS', isVisible: true },
  { key: 'ai_tools', title: 'Công cụ AI', path: '/ai-tools', icon: 'Bot', group: 'OVERVIEW', order: 6, allowedRoles: JSON.stringify(['admin', 'hr_manager', 'department_manager', 'employee']), featureKey: null, isVisible: true },
  { key: 'documents', title: 'Kho Tài liệu', path: '/documents', icon: 'FileText', group: 'OVERVIEW', order: 7, allowedRoles: JSON.stringify(['admin', 'hr_manager', 'department_manager', 'employee']), featureKey: null, isVisible: true },

  // Nhóm WORKFORCE
  { key: 'employees', title: 'Nhân viên', path: '/employees', icon: 'Users', group: 'WORKFORCE', order: 1, allowedRoles: JSON.stringify(['admin', 'hr_manager', 'department_manager']), featureKey: 'ENABLE_EMPLOYEES', isVisible: true },

  // Nhóm TIME & LEAVE
  { key: 'attendance', title: 'Chấm công', path: '/attendance', icon: 'CalendarClock', group: 'TIME & LEAVE', order: 1, allowedRoles: JSON.stringify(['admin', 'hr_manager', 'department_manager', 'employee']), featureKey: 'ENABLE_ATTENDANCE', isVisible: true },
  { key: 'leave', title: 'Nghỉ phép', path: '/leave', icon: 'FileText', group: 'TIME & LEAVE', order: 2, allowedRoles: JSON.stringify(['admin', 'hr_manager', 'department_manager', 'employee']), featureKey: 'ENABLE_LEAVE', isVisible: true },

  // Nhóm FINANCE
  { key: 'payroll', title: 'Payroll', path: '/payroll', icon: 'Wallet', group: 'FINANCE', order: 1, allowedRoles: JSON.stringify(['admin', 'hr_manager', 'department_manager', 'employee']), featureKey: 'ENABLE_PAYROLL', isVisible: true },

  // Nhóm ADMIN
  { key: 'settings', title: 'Settings', path: '/settings', icon: 'Settings', group: 'ADMIN', order: 1, allowedRoles: JSON.stringify(['admin']), featureKey: null, isVisible: true },
  { key: 'security', title: 'Security & Logs', path: '/security', icon: 'Shield', group: 'ADMIN', order: 2, allowedRoles: JSON.stringify(['admin']), featureKey: null, isVisible: true },
];

// Controller quan ly danh muc Navigation Menu dong va phan quyen hien thi Sidebar
// Giai thich code khong thuan:
// - He thong su dung mo hinh Dynamic Navigation Menu luu trong Database thay vi fix cung o Frontend.
// - Moi menu co the gan featureKey (vi du ENABLE_CHAT, ENABLE_POLICIES) lien ket voi bang Setting de bat/tat module theo thoi gian thuc.
// - Loc 2 lop: Kiem tra vai tro allowedRoles cua user va kiem tra trang thai bat/tat toggle tinh nang tu he thong truoc khi render Sidebar.

// Ham nay dung de tu dong khoi tao du lieu danh muc Menu mac dinh vao Database khi ung dung khoi dong
exports.seedDefaultMenus = async () => {
  try {
    // Tu dong don dep menu performance/kpi cu khoi DB neu co
    await MenuItem.destroy({ where: { key: 'performance' } });
    const count = await MenuItem.count();
    if (count === 0) {
      for (const item of DEFAULT_MENUS) {
        await MenuItem.create(item);
      }
      console.log('✅ Đã tự động seed danh mục Navigation Menu mặc định vào Database.');
    } else {
      // Dam bao item nao moi (nhu policies) chua co trong DB se duoc tu dong chen them
      for (const item of DEFAULT_MENUS) {
        await MenuItem.findOrCreate({
          where: { key: item.key },
          defaults: item
        });
      }
    }
  } catch (error) {
    console.error('Lỗi khi seed Navigation Menu:', error);
  }
};

// Ham nay dung de lay danh sach menu hien thi tren Sidebar cho nguoi dung hien tai (da loc theo Role va Setting feature toggle)
exports.getPublicMenus = async (req, res) => {
  try {
    const userRole = req.user.role ? req.user.role.toLowerCase().replace(/\s+/g, '_') : 'employee';
    const userRoles = (req.user.roles || [req.user.role]).map(r => 
      typeof r === 'string' ? r.toLowerCase().replace(/\s+/g, '_') : (r.name ? r.name.toLowerCase().replace(/\s+/g, '_') : '')
    );
    const allUserRoles = [...new Set([userRole, ...userRoles])];
    
    // Lay tat ca cai dat he thong de kiem tra featureKey (ENABLE_POLICIES, ENABLE_CHAT, ...)
    const settings = await Setting.findAll();
    const settingsMap = {};
    settings.forEach(s => { settingsMap[s.key] = s.value; });

    const allMenus = await MenuItem.findAll({
      where: { isVisible: true },
      order: [['order', 'ASC']]
    });

    // Loc theo Role & Feature Key Toggle tu Settings
    const allowedMenus = allMenus.filter(item => {
      // 1. Kiem tra Roles duoc phep (ho tro ca multi-roles)
      let roles = [];
      try {
        roles = typeof item.allowedRoles === 'string' ? JSON.parse(item.allowedRoles) : (item.allowedRoles || []);
      } catch {
        roles = ['admin', 'hr_manager', 'department_manager', 'employee'];
      }
      
      const hasRoleAccess = allUserRoles.includes('admin') || roles.some(r => allUserRoles.includes(r));
      if (!hasRoleAccess) {
        return false;
      }

      // 2. Kiem tra featureKey tu Settings
      if (item.featureKey && settingsMap.hasOwnProperty(item.featureKey)) {
        const isEnabled = settingsMap[item.featureKey] === 'true';
        if (!isEnabled) return false;
      }

      return true;
    });

    // Gom nhom theo field group
    const groupOrder = ['OVERVIEW', 'WORKFORCE', 'TIME & LEAVE', 'FINANCE', 'ADMIN'];
    const grouped = {};

    groupOrder.forEach(g => { grouped[g] = []; });

    allowedMenus.forEach(item => {
      const g = item.group || 'OVERVIEW';
      if (!grouped[g]) grouped[g] = [];
      grouped[g].push({
        id: item.id,
        key: item.key,
        title: item.title,
        path: item.path,
        icon: item.icon,
        order: item.order
      });
    });

    // Xoa cac nhom khong chua menu item nao
    const result = [];
    groupOrder.forEach(g => {
      if (grouped[g] && grouped[g].length > 0) {
        result.push({
          title: g,
          adminOnly: g === 'ADMIN',
          items: grouped[g]
        });
      }
    });

    res.json(result);
  } catch (error) {
    console.error('Lỗi khi lấy danh sách Navigation Menu:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// Ham nay dung de lay toan bo danh sach cac menu cho Admin quan ly va tuy chinh
exports.getAllMenus = async (req, res) => {
  try {
    const menus = await MenuItem.findAll({
      order: [['group', 'ASC'], ['order', 'ASC']]
    });
    res.json(menus);
  } catch (error) {
    console.error('Lỗi khi lấy menu cho Admin:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// Ham nay dung de cap nhat thong tin cua mot menu item danh cho Admin (tieu de, duong dan, icon, phan quyen roles, featureKey)
exports.updateMenuItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, path, icon, group, order, allowedRoles, featureKey, isVisible } = req.body;

    const item = await MenuItem.findByPk(id);
    if (!item) return res.status(404).json({ message: 'Không tìm thấy menu item' });

    if (title !== undefined) item.title = title;
    if (path !== undefined) item.path = path;
    if (icon !== undefined) item.icon = icon;
    if (group !== undefined) item.group = group;
    if (order !== undefined) item.order = order;
    if (allowedRoles !== undefined) item.allowedRoles = Array.isArray(allowedRoles) ? JSON.stringify(allowedRoles) : allowedRoles;
    if (featureKey !== undefined) item.featureKey = featureKey;
    if (isVisible !== undefined) item.isVisible = isVisible;

    await item.save();
    res.json({ message: 'Cập nhật menu thành công', menuItem: item });
  } catch (error) {
    console.error('Lỗi khi cập nhật menu:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// Ham nay dung de sap xep lai thu tu vi tri va nhom cua hang loat menu items (bulk reorder)
exports.reorderMenus = async (req, res) => {
  try {
    const { items } = req.body; // items = [{ id, order, group }]
    if (!Array.isArray(items)) return res.status(400).json({ message: 'Dữ liệu không hợp lệ' });

    for (const it of items) {
      await MenuItem.update(
        { order: it.order, group: it.group },
        { where: { id: it.id } }
      );
    }

    res.json({ message: 'Đã cập nhật thứ tự menu thành công' });
  } catch (error) {
    console.error('Lỗi khi sắp xếp lại menu:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// Ham nay dung de tao moi mot menu item vao he thong danh cho Admin quan tri
exports.createMenuItem = async (req, res) => {
  try {
    const { key, title, path, icon, group, order, allowedRoles, featureKey, isVisible } = req.body;

    if (!key || !title || !path) {
      return res.status(400).json({ message: 'Vui lòng nhập đầy đủ mã key, tên hiển thị và đường dẫn path' });
    }

    const existing = await MenuItem.findOne({ where: { key } });
    if (existing) {
      return res.status(400).json({ message: `Mã key [${key}] đã tồn tại!` });
    }

    const newMenu = await MenuItem.create({
      key,
      title,
      path,
      icon: icon || 'FileText',
      group: group || 'OVERVIEW',
      order: order ? parseInt(order) : 1,
      allowedRoles: Array.isArray(allowedRoles) ? JSON.stringify(allowedRoles) : (allowedRoles || JSON.stringify(['admin', 'hr_manager', 'department_manager', 'employee'])),
      featureKey: featureKey || null,
      isVisible: isVisible !== undefined ? isVisible : true
    });

    res.status(201).json({ message: 'Tạo menu thành công', menuItem: newMenu });
  } catch (error) {
    console.error('Lỗi khi tạo menu mới:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// Ham nay dung de xoa bo hoan toan mot menu item khoi he thong
exports.deleteMenuItem = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await MenuItem.findByPk(id);
    if (!item) return res.status(404).json({ message: 'Không tìm thấy menu item' });

    await item.destroy();
    res.json({ message: 'Đã xóa menu item thành công' });
  } catch (error) {
    console.error('Lỗi khi xóa menu:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};
