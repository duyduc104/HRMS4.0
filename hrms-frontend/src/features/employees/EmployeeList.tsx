import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Users, UserCheck, UserMinus, UserX, X, ShieldAlert } from 'lucide-react';
import { Card, CardHeader } from '../../components/ui/Card/Card';
import { Input } from '../../components/ui/Input/Input';
import { Button } from '../../components/ui/Button/Button';
import { Table, type ColumnDef } from '../../components/ui/Table/Table';
import { Badge } from '../../components/ui/Badge/Badge';
import { Avatar } from '../../components/ui/Avatar/Avatar';
import { useNavigate } from 'react-router-dom';
import { toast } from '../../stores/useToastStore';
import { useAuthStore } from '../../stores/useAuthStore';
import api from '../../services/api';

interface Employee {
  id: string;
  code: string;
  name: string;
  department: string;
  role: string;
  status: 'active' | 'probation' | 'resigned';
}


export function EmployeeList() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();
  const userRole = (currentUser?.role || '').toLowerCase().replace(/\s+/g, '_');
  const userRoles = (currentUser?.roles || []).map((r: any) => 
    (typeof r === 'string' ? r : r.name || '').toLowerCase().replace(/\s+/g, '_')
  );
  const allRoles = [...new Set([userRole, ...userRoles])];
  const isAdmin = allRoles.includes('admin');
  const isHR = allRoles.includes('hr_manager');
  const canAddEmployee = isAdmin || isHR;
  const [searchTerm, setSearchTerm] = useState('');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departmentsList, setDepartmentsList] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    password: '',
    code: '',
    email: '',
    department: 'Engineering',
    role: 'employee',
    position: '',
    joinDate: new Date().toISOString().split('T')[0],
    bankName: '',
    bankAccount: '',
    baseSalary: 15000000
  });

  const loadEmployees = useCallback(async () => {
    try {
      const res = await api.get('/employees');
      setEmployees(res.data);
    } catch (error) {
      console.error('Failed to load employees', error);
      toast.error('Không thể tải danh sách nhân viên');
      setEmployees([]);
    }
  }, []);

  const loadDepartments = useCallback(async () => {
    try {
      const res = await api.get('/departments');
      setDepartmentsList(res.data);
      if (res.data.length > 0) {
        setFormData(prev => prev.department ? prev : ({ ...prev, department: res.data[0].name }));
      }
    } catch (error) {
      console.error('Failed to load departments', error);
    }
  }, []);

  useEffect(() => {
    loadEmployees();
    loadDepartments();
  }, [loadEmployees, loadDepartments]);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdding(true);
    try {
      await api.post('/employees', formData);
      toast.success('Thêm nhân viên thành công!');
      setShowAddModal(false);
      setFormData({ fullName: '', username: '', password: '', code: '', email: '', department: 'Engineering', role: 'employee', position: '', joinDate: new Date().toISOString().split('T')[0], bankName: '', bankAccount: '', baseSalary: 15000000 });
      loadEmployees();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra khi thêm nhân viên');
    } finally {
      setIsAdding(false);
    }
  };

  const allNormalized = employees.map((e: any) => ({
    ...e,
    name: e.fullName || e.name,
    status: e.status || 'active',
    role: e.role || (e.roles && e.roles[0]?.name) || 'employee'
  }));

  const totalEmployees = allNormalized.length;
  const activeEmployees = allNormalized.filter(e => e.status === 'active').length;
  const probationEmployees = allNormalized.filter(e => e.status === 'probation').length;
  const resignedEmployees = allNormalized.filter(e => e.status === 'resigned').length;

  const stats = [
    { label: 'Tổng nhân viên', value: totalEmployees, icon: Users, color: 'text-brand-500', bg: 'bg-brand-50 dark:bg-brand-500/10' },
    { label: 'Đang làm việc', value: activeEmployees, icon: UserCheck, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-500/10' },
    { label: 'Thử việc', value: probationEmployees, icon: UserMinus, color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-500/10' },
    { label: 'Đã nghỉ', value: resignedEmployees, icon: UserX, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-500/10' },
  ];

  const columns: ColumnDef<Employee>[] = [
    { accessor: 'code', label: 'ID', render: (item) => <span className="font-mono text-text-muted">{item.code}</span> },
    {
      accessor: 'name',
      label: 'Họ tên',
      render: (item) => (
        <div className="flex items-center gap-3">
          <Avatar size="sm" alt={item.name} fallback={item.name.charAt(0)} />
          <span className="font-medium">{item.name}</span>
        </div>
      )
    },
    { accessor: 'department', label: 'Phòng ban' },
    { accessor: 'role', label: 'Vị trí' },
    {
      accessor: 'status',
      label: 'Trạng thái',
      render: (item) => {
        const variants = { active: 'active', probation: 'pending', resigned: 'inactive' } as const;
        const labels = { active: 'Chính thức', probation: 'Thử việc', resigned: 'Đã nghỉ' };
        return <Badge variant={variants[item.status]}>{labels[item.status]}</Badge>;
      }
    },
    {
      accessor: 'actions',
      label: '',
      render: (item) => (
        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/employees/${item.id}`); }}>
          Chi tiết
        </Button>
      )
    }
  ];

  const filteredData = allNormalized.filter(e => e.name?.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-h2 font-bold mb-1">Nhân viên</h1>
          <p className="text-text-sec">Quản lý danh sách nhân sự trong công ty.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="primary" size="sm" onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Thêm nhân viên
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <Card key={i} className="flex items-center p-4">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center mr-4 ${s.bg}`}>
                <Icon className={`w-6 h-6 ${s.color}`} />
              </div>
              <div>
                <p className="text-sm text-text-muted font-medium">{s.label}</p>
                <h3 className="text-2xl font-bold">{s.value}</h3>
              </div>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div className="w-full sm:w-72">
            <Input 
              placeholder="Tìm kiếm nhân viên..." 
              inputSize="sm"
              leftIcon={<Search className="w-4 h-4" />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="hidden sm:flex gap-2">
            {/* Additional filters can go here */}
          </div>
        </CardHeader>
        <div className="p-0">
          <Table 
            columns={columns} 
            data={filteredData}
            onRowClick={(item) => navigate(`/employees/${item.id}`)}
            pagination pageSize={10}
          />
        </div>
      </Card>

      {/* Add Employee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in">
          <div className="bg-surface w-full max-w-lg rounded-xl shadow-xl overflow-hidden">
            <div className="p-6 border-b border-border flex justify-between items-center">
              <h3 className="text-xl font-bold">Thêm Nhân Viên Mới</h3>
              <button onClick={() => setShowAddModal(false)} className="text-text-muted hover:text-text-primary">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Họ và tên *</label>
                  <Input required value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} placeholder="Nguyễn Văn A" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Mã nhân viên</label>
                  <Input value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} placeholder="EMP-005 (Tự tạo nếu trống)" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tên đăng nhập *</label>
                  <Input required value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} placeholder="nguyenvana" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Mật khẩu *</label>
                  <Input required type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder="••••••••" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="nguyenvana@company.com" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Phòng ban *</label>
                  <select 
                    value={formData.department}
                    onChange={e => setFormData({...formData, department: e.target.value})}
                    className="w-full h-10 px-3 rounded-md border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    required
                  >
                    {departmentsList.map(d => (
                      <option key={d.id} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Vai trò (Role) *</label>
                  <select 
                    value={formData.role}
                    onChange={e => setFormData({...formData, role: e.target.value})}
                    className="w-full h-10 px-3 rounded-md border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    required
                  >
                    <option value="employee">Nhân viên (Employee)</option>
                    {/* Chỉ Admin hoặc HR mới thấy và chọn được các role phù hợp */}
                    {(isAdmin || isHR) && (
                      <>
                        <option value="department_manager">Trưởng phòng (Dept. Manager)</option>
                        <option value="hr_manager">Quản lý HR (HR Manager)</option>
                        <option value="accountant">Kế toán (Accountant)</option>
                      </>
                    )}
                    {isAdmin && (
                      <option value="admin">Quản trị viên (Admin)</option>
                    )}
                  </select>
                  {!isAdmin && !isHR && (
                    <p className="text-xs text-text-muted flex items-center gap-1 mt-1">
                      <ShieldAlert className="w-3 h-3 text-yellow-500" />
                      Chỉ Admin hoặc HR mới có thể tạo tài khoản nhân viên.
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Chức vụ (Position)</label>
                  <Input value={formData.position} onChange={e => setFormData({...formData, position: e.target.value})} placeholder="Software Engineer" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Ngày vào làm</label>
                  <Input type="date" value={formData.joinDate} onChange={e => setFormData({...formData, joinDate: e.target.value})} />
                </div>
              </div>

              <div className="border-t border-border pt-4 mt-2">
                <h4 className="text-sm font-bold mb-3 text-brand-600">Thông tin Lương & Ngân hàng</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Ngân hàng (VD: mbbank, vcb)</label>
                    <Input value={formData.bankName} onChange={e => setFormData({...formData, bankName: e.target.value})} placeholder="mbbank" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Số tài khoản</label>
                    <Input value={formData.bankAccount} onChange={e => setFormData({...formData, bankAccount: e.target.value})} placeholder="0123456789" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Lương cơ bản (VND)</label>
                    <Input type="number" value={formData.baseSalary.toString()} onChange={e => setFormData({...formData, baseSalary: parseInt(e.target.value) || 0})} />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>Hủy</Button>
                <Button type="submit" variant="primary" isLoading={isAdding}>Thêm nhân viên</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
