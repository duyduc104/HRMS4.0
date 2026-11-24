import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, MapPin, Building, Calendar, Briefcase } from 'lucide-react';
import { Card, CardBody } from '../../components/ui/Card/Card';
import { Avatar } from '../../components/ui/Avatar/Avatar';
import { Badge } from '../../components/ui/Badge/Badge';
import { Button } from '../../components/ui/Button/Button';
import { Tabs } from '../../components/ui/Tabs/Tabs';
import { toast } from '../../stores/useToastStore';
import api from '../../services/api';
import { useState, useEffect } from 'react';

export function EmployeeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [employee, setEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ fullName: '', department: '', status: '', position: '', joinDate: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [departmentsList, setDepartmentsList] = useState<any[]>([]);

  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        const res = await api.get(`/employees/${id}`);
        setEmployee({
          ...res.data,
          name: res.data.fullName,
          role: res.data.position || res.data.roles?.[0]?.name || 'employee',
          location: 'Văn phòng chính',
          phone: res.data.phone || 'Chưa cập nhật',
          joinDate: res.data.joinDate || 'Chưa cập nhật'
        });
      } catch (err) {
        toast.error('Không tải được thông tin nhân viên');
      } finally {
        setLoading(false);
      }
    };
    const fetchDepartments = async () => {
      try {
        const res = await api.get('/departments');
        setDepartmentsList(res.data);
      } catch (err) { }
    };
    if (id) fetchEmployee();
    fetchDepartments();
  }, [id]);

  const handleDeleteEmployee = async () => {
    if (!window.confirm('Bạn có chắc muốn xóa nhân viên này?')) return;
    try {
      await api.delete(`/employees/${id}`);
      toast.success('Xóa nhân viên thành công');
      navigate('/employees');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Lỗi khi xóa nhân viên');
    }
  };

  const handleForceLogout = async () => {
    if (!window.confirm('Bạn có chắc muốn đăng xuất nhân viên này khỏi tất cả thiết bị?')) return;
    try {
      await api.post(`/employees/${id}/force-logout`);
      toast.success('Đã gửi lệnh đăng xuất đến nhân viên');
    } catch (error: any) {
      toast.error('Lỗi khi gửi lệnh đăng xuất');
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.put(`/employees/${id}`, editForm);
      toast.success('Cập nhật thông tin thành công');
      setEmployee({ ...employee, ...editForm, name: editForm.fullName });
      setShowEditModal(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Lỗi khi cập nhật nhân viên');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleRemoteAttendance = async () => {
    if (!employee) return;
    try {
      const newVal = !employee.allowRemoteAttendance;
      await api.put(`/employees/${id}`, { allowRemoteAttendance: newVal });
      setEmployee({ ...employee, allowRemoteAttendance: newVal });
      toast.success(newVal ? 'Đã cấp quyền chấm công từ xa' : 'Đã thu hồi quyền chấm công từ xa');
    } catch (err) {
      toast.error('Lỗi khi cập nhật quyền');
    }
  };

  const [salaryForm, setSalaryForm] = useState({
    baseSalary: 15000000,
    hourlyRate: 50000,
    allowance: 0,
    bankAccount: '',
    bankName: ''
  });
  const [loadingSalary, setLoadingSalary] = useState(false);
  const [savingSalary, setSavingSalary] = useState(false);

  useEffect(() => {
    const fetchSalary = async () => {
      try {
        setLoadingSalary(true);
        const res = await api.get(`/employees/${id || employee.id}/salary`);
        if (res.data) {
          setSalaryForm({
            baseSalary: res.data.baseSalary,
            hourlyRate: res.data.hourlyRate,
            allowance: res.data.allowance || 0,
            bankAccount: res.data.bankAccount || '',
            bankName: res.data.bankName || ''
          });
        }
      } catch (err) {
        // If 404, it means no salary config yet, which is fine
      } finally {
        setLoadingSalary(false);
      }
    };
    fetchSalary();
  }, [id]);

  const handleSaveSalary = async () => {
    try {
      setSavingSalary(true);
      await api.put(`/employees/${id || employee.id}/salary`, salaryForm);
      toast.success('Thành công', 'Đã lưu cấu hình lương');
    } catch (error) {
      toast.error('Thất bại', 'Lỗi khi lưu cấu hình lương');
    } finally {
      setSavingSalary(false);
    }
  };

  // Guard sớm: không tính tabs khi employee chưa load xong
  if (loading) return <div className="p-8 text-center text-text-muted">Đang tải thông tin nhân viên...</div>;
  if (!employee) return <div className="p-8 text-center text-red-500">Không tìm thấy thông tin nhân viên</div>;

  const tabs = [
    {
      id: 'profile',
      label: 'Hồ sơ',
      content: (
        <div className="space-y-6 animate-fade-in">
          <h3 className="text-h4 font-semibold">Thông tin cá nhân</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-text-muted">Ngày sinh</p>
              <p className="font-medium">{employee.onboarding?.dob || 'Chưa cập nhật'}</p>
            </div>
            <div>
              <p className="text-sm text-text-muted">Địa chỉ thường trú</p>
              <p className="font-medium">{employee.onboarding?.address || 'Chưa cập nhật'}</p>
            </div>
            <div>
              <p className="text-sm text-text-muted">CCCD/CMND</p>
              <p className="font-medium">{employee.onboarding?.idCardNumber || 'Chưa cập nhật'}</p>
            </div>
            <div>
              <p className="text-sm text-text-muted">Ngân hàng</p>
              <p className="font-medium">
                {employee.onboarding?.bankName 
                  ? `${employee.onboarding?.bankName} - ${employee.onboarding?.bankAccountNumber}` 
                  : (salaryForm.bankName ? `${salaryForm.bankName} - ${salaryForm.bankAccount}` : 'Chưa cập nhật')}
              </p>
              {employee.onboarding?.bankAccountName && (
                <p className="text-xs text-text-sec mt-1 uppercase">{employee.onboarding?.bankAccountName}</p>
              )}
            </div>
          </div>
          
          <div className="mt-6 pt-6 border-t border-border">
            <h4 className="text-sm font-semibold mb-3">Quyền hạn & Bảo mật (Dành cho Admin)</h4>
            <div className="flex items-center justify-between p-4 bg-surface-alt rounded-lg border border-border">
              <div>
                <p className="font-medium text-sm">Cho phép chấm công từ xa (Bỏ qua Geofencing)</p>
                <p className="text-xs text-text-sec mt-1">Nhân viên này có thể check-in/out ở bất kỳ đâu, không bị giới hạn bởi vị trí văn phòng.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={!!employee?.allowRemoteAttendance} onChange={toggleRemoteAttendance} />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-brand-500"></div>
              </label>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'contract',
      label: 'Hợp đồng',
      content: <div className="animate-fade-in text-text-sec">Chưa có dữ liệu hợp đồng.</div>
    },
    {
      id: 'attendance',
      label: 'Chấm công',
      content: <div className="animate-fade-in text-text-sec">Biểu đồ chấm công sẽ hiển thị ở đây.</div>
    },
    {
      id: 'salary',
      label: 'Cấu hình Lương',
      content: (
        <div className="space-y-6 animate-fade-in">
          <div className="flex justify-between items-center">
            <h3 className="text-h4 font-semibold">Cấu hình Lương & Phụ cấp</h3>
            <Button variant="primary" size="sm" onClick={handleSaveSalary} disabled={savingSalary}>
              {savingSalary ? 'Đang lưu...' : 'Lưu cấu hình'}
            </Button>
          </div>
          {loadingSalary ? (
            <p className="text-text-muted">Đang tải...</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Lương cơ bản (Tháng)</label>
                <input
                  type="number"
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/30"
                  value={salaryForm.baseSalary}
                  onChange={(e) => setSalaryForm({ ...salaryForm, baseSalary: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Lương theo giờ (Hourly Rate)</label>
                <input
                  type="number"
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/30"
                  value={salaryForm.hourlyRate}
                  onChange={(e) => setSalaryForm({ ...salaryForm, hourlyRate: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Phụ cấp (VND)</label>
                <input
                  type="number"
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/30"
                  value={salaryForm.allowance}
                  onChange={(e) => setSalaryForm({ ...salaryForm, allowance: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Ngân hàng</label>
                <input
                  type="text"
                  placeholder="VD: VCB, TCB..."
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/30"
                  value={salaryForm.bankName}
                  onChange={(e) => setSalaryForm({ ...salaryForm, bankName: e.target.value })}
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <label className="text-sm font-medium">Số tài khoản</label>
                <input
                  type="text"
                  placeholder="Nhập số tài khoản..."
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/30"
                  value={salaryForm.bankAccount}
                  onChange={(e) => setSalaryForm({ ...salaryForm, bankAccount: e.target.value })}
                />
              </div>
            </div>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Profile Info */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/employees')} className="-ml-3 px-2">
          <ArrowLeft className="w-5 h-5 mr-1" />
          Trở lại
        </Button>
      </div>

      <div className="bg-surface border border-border rounded-lg p-6 flex flex-col md:flex-row gap-6 items-start md:items-center">
        <Avatar size="xl" alt={employee.name} fallback={employee.name.charAt(0)} />
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-h2 font-bold">{employee.name}</h1>
            <Badge variant="active">Đang làm việc</Badge>
          </div>
          <p className="text-text-sec text-lg">{employee.role} &middot; {employee.department}</p>
        </div>
        <div className="flex gap-2 mt-4 md:mt-0">
          <Button variant="outline" onClick={() => { 
            setEditForm({ fullName: employee.fullName, department: employee.department, status: employee.status, position: employee.position || '', joinDate: employee.joinDate || '' });
            setShowEditModal(true);
          }}>Sửa hồ sơ</Button>
          <Button variant="outline" className="text-orange-500 border-orange-200 hover:bg-orange-50" onClick={handleForceLogout}>Đăng xuất</Button>
          <Button variant="outline" className="text-red-500 border-red-200 hover:bg-red-50" onClick={handleDeleteEmployee}>Xóa</Button>
        </div>
      </div>

      {/* Main Content Layout Pattern C */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Sidebar Info */}
        <div className="space-y-6">
          <Card>
            <CardBody className="space-y-4">
              <h3 className="font-semibold text-sm uppercase text-text-muted tracking-wider">Thông tin liên hệ</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="w-4 h-4 text-text-muted" />
                  <span>{employee.email}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="w-4 h-4 text-text-muted" />
                  <span>{employee.phone}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <MapPin className="w-4 h-4 text-text-muted" />
                  <span>{employee.location}</span>
                </div>
              </div>
            </CardBody>
          </Card>
          
          <Card>
            <CardBody className="space-y-4">
              <h3 className="font-semibold text-sm uppercase text-text-muted tracking-wider">Công việc</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <Briefcase className="w-4 h-4 text-text-muted" />
                  <span>{employee.code}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Building className="w-4 h-4 text-text-muted" />
                  <span>{employee.department}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="w-4 h-4 text-text-muted" />
                  <span>Tham gia: {employee.joinDate}</span>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Right Content Tabs */}
        <div className="lg:col-span-2">
          <Card className="h-full min-h-[400px]">
            <CardBody>
              <Tabs tabs={tabs} />
            </CardBody>
          </Card>
        </div>
      </div>

      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-surface w-full max-w-md rounded-xl shadow-xl p-6 animate-fade-in">
            <h3 className="text-xl font-bold mb-4">Sửa thông tin nhân viên</h3>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Họ và tên</label>
                <input 
                  required
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500"
                  value={editForm.fullName}
                  onChange={e => setEditForm({...editForm, fullName: e.target.value})}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Phòng ban</label>
                <select 
                  required
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500"
                  value={editForm.department}
                  onChange={e => setEditForm({...editForm, department: e.target.value})}
                >
                  <option value="">Chọn phòng ban</option>
                  {departmentsList.map(d => (
                    <option key={d.id} value={d.name}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Chức vụ</label>
                  <input 
                    className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500"
                    value={editForm.position}
                    onChange={e => setEditForm({...editForm, position: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Ngày vào làm</label>
                  <input 
                    type="date"
                    className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500"
                    value={editForm.joinDate}
                    onChange={e => setEditForm({...editForm, joinDate: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Trạng thái</label>
                <select 
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500"
                  value={editForm.status}
                  onChange={e => setEditForm({...editForm, status: e.target.value})}
                >
                  <option value="active">Chính thức (Active)</option>
                  <option value="probation">Thử việc (Probation)</option>
                  <option value="inactive">Tạm nghỉ (Inactive)</option>
                  <option value="resigned">Đã nghỉ (Resigned)</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" type="button" onClick={() => setShowEditModal(false)}>Hủy</Button>
                <Button variant="primary" type="submit" isLoading={isSaving}>Lưu</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
