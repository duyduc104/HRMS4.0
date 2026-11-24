import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardBody } from '../../components/ui/Card/Card';
import { Button } from '../../components/ui/Button/Button';
import { Input } from '../../components/ui/Input/Input';
import { Table, type ColumnDef } from '../../components/ui/Table/Table';
import { toast } from '../../stores/useToastStore';
import { Plus, Edit2, Trash2, Building2 } from 'lucide-react';
import api from '../../services/api';

export function DepartmentTab() {
  const [departments, setDepartments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  
  const [formData, setFormData] = useState({ name: '', description: '' });

  const fetchDepartments = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/departments');
      setDepartments(res.data);
    } catch (error) {
      toast.error('Lỗi khi tải danh sách phòng ban');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editItem) {
        await api.put(`/departments/${editItem.id}`, formData);
        toast.success('Cập nhật phòng ban thành công');
      } else {
        await api.post('/departments', formData);
        toast.success('Thêm phòng ban thành công');
      }
      setShowModal(false);
      fetchDepartments();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Bạn có chắc muốn xóa phòng ban này? (Dữ liệu sẽ được xóa mềm)')) return;
    try {
      await api.delete(`/departments/${id}`);
      toast.success('Xóa phòng ban thành công');
      fetchDepartments();
    } catch (error: any) {
      toast.error('Lỗi khi xóa phòng ban');
    }
  };

  const columns: ColumnDef<any>[] = [
    { accessor: 'id', label: 'ID' },
    { accessor: 'name', label: 'Tên phòng ban' },
    { accessor: 'description', label: 'Mô tả' },
    { 
      accessor: 'actions', 
      label: 'Hành động',
      render: (item) => (
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => { setEditItem(item); setFormData({ name: item.name, description: item.description || '' }); setShowModal(true); }}>
            <Edit2 className="w-4 h-4 text-blue-500" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)}>
            <Trash2 className="w-4 h-4 text-red-500" />
          </Button>
        </div>
      )
    }
  ];

  return (
    <Card className="animate-fade-in">
      <CardHeader className="flex flex-row justify-between items-center">
        <CardTitle className="flex items-center gap-2">
          <Building2 className="w-5 h-5" /> Quản lý Phòng ban
        </CardTitle>
        <Button size="sm" onClick={() => { setEditItem(null); setFormData({ name: '', description: '' }); setShowModal(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Thêm phòng ban
        </Button>
      </CardHeader>
      <CardBody>
        <Table columns={columns} data={departments} pagination pageSize={10} />
      </CardBody>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-surface w-full max-w-md rounded-xl shadow-xl p-6">
            <h3 className="text-xl font-bold mb-4">{editItem ? 'Sửa Phòng ban' : 'Thêm Phòng ban'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input 
                label="Tên phòng ban" 
                required 
                value={formData.name} 
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
              <Input 
                label="Mô tả" 
                value={formData.description} 
                onChange={e => setFormData({ ...formData, description: e.target.value })}
              />
              <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" type="button" onClick={() => setShowModal(false)}>Hủy</Button>
                <Button variant="primary" type="submit">Lưu</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Card>
  );
}
