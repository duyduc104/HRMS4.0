import { useState, useEffect } from 'react';
import { Layers, Eye, EyeOff, Edit2, Save, X, Plus, Trash2, Check, HelpCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardBody } from '../../components/ui/Card/Card';
import { Button } from '../../components/ui/Button/Button';
import { Badge } from '../../components/ui/Badge/Badge';
import { Modal } from '../../components/ui/Modal/Modal';
import { toast } from '../../stores/useToastStore';
import { useMenuStore } from '../../stores/useMenuStore';
import api from '../../services/api';

const AVAILABLE_ICONS = [
  'LayoutDashboard', 'BookOpen', 'MessageSquare', 'Rocket', 
  'CalendarDays', 'Users', 'CalendarClock', 'FileText', 
  'Target', 'Wallet', 'Settings', 'Shield'
];

const AVAILABLE_GROUPS = ['OVERVIEW', 'WORKFORCE', 'TIME & LEAVE', 'FINANCE', 'ADMIN'];

export function MenuManagementTab() {
  const [allMenus, setAllMenus] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal 1: Create New Menu Item
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSavingCreate, setIsSavingCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    key: '',
    title: '',
    path: '',
    icon: 'FileText',
    group: 'OVERVIEW',
    order: 1,
    allowedRoles: ['admin', 'hr_manager', 'department_manager', 'employee'],
    featureKey: '',
    isVisible: true
  });

  // Modal 2: Edit Menu Item
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    path: '',
    icon: 'FileText',
    group: 'OVERVIEW',
    order: 1,
    allowedRoles: [] as string[],
    featureKey: '',
    isVisible: true
  });

  useEffect(() => {
    fetchAdminMenus();
  }, []);

  const fetchAdminMenus = async () => {
    try {
      setLoading(true);
      const res = await api.get('/menu/admin');
      setAllMenus(res.data || []);
    } catch (err) {
      console.error('Lỗi khi tải danh sách menu Admin:', err);
      toast.error('Không thể tải danh sách menu quản trị');
    } finally {
      setLoading(false);
    }
  };

  // Toggle Hide/Show
  const handleToggleVisibility = async (item: any) => {
    try {
      const newVisibility = !item.isVisible;
      await api.put(`/menu/${item.id}`, { isVisible: newVisibility });
      toast.success(newVisibility ? `Đã hiện menu [${item.title}]` : `Đã ẩn menu [${item.title}]`);
      
      setAllMenus(prev => prev.map(m => m.id === item.id ? { ...m, isVisible: newVisibility } : m));
      useMenuStore.getState().fetchMenus();
    } catch (err) {
      toast.error('Lỗi khi cập nhật trạng thái menu');
    }
  };

  // Delete Menu Item
  const handleDeleteMenu = async (item: any) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa vĩnh viễn menu [${item.title}] (${item.key})?`)) return;
    try {
      await api.delete(`/menu/${item.id}`);
      toast.success('Xóa menu item thành công');
      setAllMenus(prev => prev.filter(m => m.id !== item.id));
      useMenuStore.getState().fetchMenus();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi khi xóa menu');
    }
  };

  // Submit Create New Menu
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.key || !createForm.title || !createForm.path) {
      toast.error('Vui lòng nhập đầy đủ Key, Tên hiển thị và Đường dẫn Path');
      return;
    }

    setIsSavingCreate(true);
    try {
      await api.post('/menu', createForm);
      toast.success('Tạo mới menu thành công!');
      setIsCreateModalOpen(false);
      setCreateForm({
        key: '',
        title: '',
        path: '',
        icon: 'FileText',
        group: 'OVERVIEW',
        order: 1,
        allowedRoles: ['admin', 'hr_manager', 'department_manager', 'employee'],
        featureKey: '',
        isVisible: true
      });
      fetchAdminMenus();
      useMenuStore.getState().fetchMenus();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể tạo mới menu');
    } finally {
      setIsSavingCreate(false);
    }
  };

  // Open Edit Modal
  const handleOpenEditModal = (item: any) => {
    setEditingItem(item);
    let roles: string[] = [];
    try {
      roles = typeof item.allowedRoles === 'string' ? JSON.parse(item.allowedRoles) : (item.allowedRoles || []);
    } catch {
      roles = ['admin', 'hr_manager', 'department_manager', 'employee'];
    }

    setEditForm({
      title: item.title,
      path: item.path,
      icon: item.icon,
      group: item.group,
      order: item.order || 1,
      allowedRoles: roles,
      featureKey: item.featureKey || '',
      isVisible: !!item.isVisible
    });
    setIsEditModalOpen(true);
  };

  // Submit Edit Menu
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    setIsSavingEdit(true);
    try {
      await api.put(`/menu/${editingItem.id}`, editForm);
      toast.success('Cập nhật thông tin menu thành công!');
      setIsEditModalOpen(false);
      fetchAdminMenus();
      useMenuStore.getState().fetchMenus();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi khi cập nhật menu');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const toggleCreateRole = (roleName: string) => {
    setCreateForm(prev => ({
      ...prev,
      allowedRoles: prev.allowedRoles.includes(roleName)
        ? prev.allowedRoles.filter(r => r !== roleName)
        : [...prev.allowedRoles, roleName]
    }));
  };

  const toggleEditRole = (roleName: string) => {
    setEditForm(prev => ({
      ...prev,
      allowedRoles: prev.allowedRoles.includes(roleName)
        ? prev.allowedRoles.filter(r => r !== roleName)
        : [...prev.allowedRoles, roleName]
    }));
  };

  const groups = Array.from(new Set(allMenus.map(m => m.group))).filter(Boolean);

  return (
    <Card className="animate-fade-in">
      <CardHeader className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-brand-500" />
            Quản lý Dynamic Navigation Menu (Database API CRUD)
          </CardTitle>
          <p className="text-xs text-text-sec mt-1">
            Toàn bộ Sidebar được lưu và tải từ Database qua API `/api/menu`. Bạn có thể Thêm mới, Sửa, Ẩn/Hiện hoặc Xóa menu trực tiếp tại đây.
          </p>
        </div>

        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> Thêm Menu Mới
        </Button>
      </CardHeader>

      <CardBody className="p-6 space-y-6">
        {loading ? (
          <div className="p-8 text-center text-text-muted animate-pulse">Đang tải danh mục menu từ Database...</div>
        ) : (
          <div className="space-y-6">
            {groups.map(groupName => {
              const groupItems = allMenus.filter(m => m.group === groupName);
              return (
                <div key={groupName} className="space-y-3">
                  <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-brand-500"></span>
                    Nhóm Menu: {groupName} ({groupItems.length} items)
                  </h4>

                  <div className="overflow-x-auto border border-border rounded-xl">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-surface-alt border-b border-border text-xs text-text-sec uppercase font-bold">
                        <tr>
                          <th className="px-4 py-3">Mã Key</th>
                          <th className="px-4 py-3">Tên hiển thị</th>
                          <th className="px-4 py-3">Route Path</th>
                          <th className="px-4 py-3">Icon</th>
                          <th className="px-4 py-3">Feature Toggle</th>
                          <th className="px-4 py-3 text-center">Thứ tự</th>
                          <th className="px-4 py-3 text-center">Trạng thái</th>
                          <th className="px-4 py-3 text-right">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {groupItems.map(item => (
                          <tr key={item.id} className="hover:bg-surface-alt/50 transition-colors">
                            <td className="px-4 py-3 font-mono text-xs font-bold text-brand-600">
                              {item.key}
                            </td>

                            <td className="px-4 py-3 font-semibold text-text-primary">
                              {item.title}
                            </td>

                            <td className="px-4 py-3 text-xs font-mono text-text-sec">
                              {item.path}
                            </td>

                            <td className="px-4 py-3 text-xs font-mono text-text-sec">
                              <Badge variant="outline">{item.icon}</Badge>
                            </td>

                            <td className="px-4 py-3 text-xs font-mono text-text-muted">
                              {item.featureKey ? <Badge variant="info">{item.featureKey}</Badge> : '—'}
                            </td>

                            <td className="px-4 py-3 text-center font-bold text-xs">
                              {item.order}
                            </td>

                            <td className="px-4 py-3 text-center">
                              <Badge variant={item.isVisible ? 'active' : 'danger'}>
                                {item.isVisible ? 'Hiển thị' : 'Đã ẩn'}
                              </Badge>
                            </td>

                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button size="sm" variant="ghost" onClick={() => handleOpenEditModal(item)} title="Chỉnh sửa menu">
                                  <Edit2 className="w-3.5 h-3.5 text-brand-600" />
                                </Button>

                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className={item.isVisible ? 'text-amber-600 border-amber-200 hover:bg-amber-50' : 'text-emerald-600 border-emerald-200 hover:bg-emerald-50'}
                                  onClick={() => handleToggleVisibility(item)}
                                  title={item.isVisible ? 'Ẩn menu khỏi Sidebar' : 'Hiện menu lên Sidebar'}
                                >
                                  {item.isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </Button>

                                <Button size="sm" variant="ghost" className="text-red-500 hover:bg-red-50" onClick={() => handleDeleteMenu(item)} title="Xóa menu này">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardBody>

      {/* Modal CREATE New Menu Item */}
      {isCreateModalOpen && (
        <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Thêm Menu Mới vào Database">
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-text-sec uppercase mb-1 block">Mã Key (Unique)*</label>
                <input
                  required
                  type="text"
                  placeholder="VD: documents, reports"
                  className="w-full h-9 px-3 rounded-lg border border-border bg-surface text-sm focus:ring-2 focus:ring-brand-500"
                  value={createForm.key}
                  onChange={e => setCreateForm({ ...createForm, key: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-text-sec uppercase mb-1 block">Tên hiển thị*</label>
                <input
                  required
                  type="text"
                  placeholder="VD: Báo cáo Thống kê"
                  className="w-full h-9 px-3 rounded-lg border border-border bg-surface text-sm focus:ring-2 focus:ring-brand-500"
                  value={createForm.title}
                  onChange={e => setCreateForm({ ...createForm, title: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-text-sec uppercase mb-1 block">Đường dẫn Route Path*</label>
                <input
                  required
                  type="text"
                  placeholder="VD: /reports, /documents"
                  className="w-full h-9 px-3 rounded-lg border border-border bg-surface text-sm focus:ring-2 focus:ring-brand-500"
                  value={createForm.path}
                  onChange={e => setCreateForm({ ...createForm, path: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-text-sec uppercase mb-1 block">Icon Lucide</label>
                <select
                  className="w-full h-9 px-3 rounded-lg border border-border bg-surface text-sm focus:ring-2 focus:ring-brand-500"
                  value={createForm.icon}
                  onChange={e => setCreateForm({ ...createForm, icon: e.target.value })}
                >
                  {AVAILABLE_ICONS.map(ic => (
                    <option key={ic} value={ic}>{ic}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold text-text-sec uppercase mb-1 block">Nhóm Menu</label>
                <select
                  className="w-full h-9 px-3 rounded-lg border border-border bg-surface text-sm focus:ring-2 focus:ring-brand-500"
                  value={createForm.group}
                  onChange={e => setCreateForm({ ...createForm, group: e.target.value })}
                >
                  {AVAILABLE_GROUPS.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-text-sec uppercase mb-1 block">Thứ tự Order</label>
                <input
                  type="number"
                  className="w-full h-9 px-3 rounded-lg border border-border bg-surface text-sm focus:ring-2 focus:ring-brand-500"
                  value={createForm.order}
                  onChange={e => setCreateForm({ ...createForm, order: parseInt(e.target.value) || 1 })}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-text-sec uppercase mb-1 block">Feature Key (Tùy chọn)</label>
                <input
                  type="text"
                  placeholder="VD: ENABLE_REPORTS"
                  className="w-full h-9 px-3 rounded-lg border border-border bg-surface text-sm focus:ring-2 focus:ring-brand-500"
                  value={createForm.featureKey}
                  onChange={e => setCreateForm({ ...createForm, featureKey: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-text-sec uppercase mb-2 block">Roles được phép xem:</label>
              <div className="flex flex-wrap gap-2">
                {['admin', 'hr_manager', 'department_manager', 'employee'].map(r => {
                  const isChecked = createForm.allowedRoles.includes(r);
                  return (
                    <button
                      type="button"
                      key={r}
                      onClick={() => toggleCreateRole(r)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                        isChecked 
                          ? 'bg-brand-600 text-white border-brand-600' 
                          : 'bg-surface-alt border-border text-text-sec'
                      }`}
                    >
                      {r} {isChecked && '✓'}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>Hủy</Button>
              <Button type="submit" isLoading={isSavingCreate}>
                <Check className="w-4 h-4 mr-1.5" /> Tạo Menu Mới
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal EDIT Menu Item */}
      {isEditModalOpen && editingItem && (
        <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title={`Chỉnh sửa Menu: ${editingItem.key}`}>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-text-sec uppercase mb-1 block">Tên hiển thị*</label>
                <input
                  required
                  type="text"
                  className="w-full h-9 px-3 rounded-lg border border-border bg-surface text-sm focus:ring-2 focus:ring-brand-500"
                  value={editForm.title}
                  onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-text-sec uppercase mb-1 block">Đường dẫn Route Path*</label>
                <input
                  required
                  type="text"
                  className="w-full h-9 px-3 rounded-lg border border-border bg-surface text-sm focus:ring-2 focus:ring-brand-500"
                  value={editForm.path}
                  onChange={e => setEditForm({ ...editForm, path: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold text-text-sec uppercase mb-1 block">Icon Lucide</label>
                <select
                  className="w-full h-9 px-3 rounded-lg border border-border bg-surface text-sm focus:ring-2 focus:ring-brand-500"
                  value={editForm.icon}
                  onChange={e => setEditForm({ ...editForm, icon: e.target.value })}
                >
                  {AVAILABLE_ICONS.map(ic => (
                    <option key={ic} value={ic}>{ic}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-text-sec uppercase mb-1 block">Nhóm Menu</label>
                <select
                  className="w-full h-9 px-3 rounded-lg border border-border bg-surface text-sm focus:ring-2 focus:ring-brand-500"
                  value={editForm.group}
                  onChange={e => setEditForm({ ...editForm, group: e.target.value })}
                >
                  {AVAILABLE_GROUPS.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-text-sec uppercase mb-1 block">Thứ tự Order</label>
                <input
                  type="number"
                  className="w-full h-9 px-3 rounded-lg border border-border bg-surface text-sm focus:ring-2 focus:ring-brand-500"
                  value={editForm.order}
                  onChange={e => setEditForm({ ...editForm, order: parseInt(e.target.value) || 1 })}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-text-sec uppercase mb-1 block">Feature Key (Tùy chọn)</label>
              <input
                type="text"
                className="w-full h-9 px-3 rounded-lg border border-border bg-surface text-sm focus:ring-2 focus:ring-brand-500"
                value={editForm.featureKey}
                onChange={e => setEditForm({ ...editForm, featureKey: e.target.value })}
              />
            </div>

            <div>
              <label className="text-xs font-bold text-text-sec uppercase mb-2 block">Roles được phép xem:</label>
              <div className="flex flex-wrap gap-2">
                {['admin', 'hr_manager', 'department_manager', 'employee'].map(r => {
                  const isChecked = editForm.allowedRoles.includes(r);
                  return (
                    <button
                      type="button"
                      key={r}
                      onClick={() => toggleEditRole(r)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                        isChecked 
                          ? 'bg-brand-600 text-white border-brand-600' 
                          : 'bg-surface-alt border-border text-text-sec'
                      }`}
                    >
                      {r} {isChecked && '✓'}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>Hủy</Button>
              <Button type="submit" isLoading={isSavingEdit}>
                <Check className="w-4 h-4 mr-1.5" /> Lưu Thay Đổi
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </Card>
  );
}
