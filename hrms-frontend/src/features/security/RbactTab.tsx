import { useState, useEffect } from 'react';
import { Shield, Users, UserPlus, Check, Search, ShieldCheck } from 'lucide-react';
import { Card } from '../../components/ui/Card/Card';
import { Button } from '../../components/ui/Button/Button';
import { Badge } from '../../components/ui/Badge/Badge';
import { Modal } from '../../components/ui/Modal/Modal';
import { toast } from '../../stores/useToastStore';
import api from '../../services/api';

export function RbactTab() {
  const [roles, setRoles] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal 1: View employees in role
  const [isViewRoleModalOpen, setIsViewRoleModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<any>(null);

  // Modal 2: Assign roles to an employee
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedEmpId, setSelectedEmpId] = useState<string>('');
  const [selectedRoleNames, setSelectedRoleNames] = useState<string[]>(['employee']);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSavingAssign, setIsSavingAssign] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [rolesRes, empRes] = await Promise.all([
        api.get('/roles').catch(() => ({ data: [] })),
        api.get('/employees').catch(() => ({ data: [] }))
      ]);

      setRoles(rolesRes.data || []);
      const empList = empRes.data.data || empRes.data || [];
      setEmployees(empList);

      if (empList.length > 0) {
        setSelectedEmpId(empList[0].id.toString());
        const empRoles = (empList[0].roles || []).map((r: any) => r.name);
        setSelectedRoleNames(empRoles.length > 0 ? empRoles : ['employee']);
      }
    } catch (error) {
      console.error('Lỗi khi tải dữ liệu phân quyền:', error);
      toast.error('Lỗi', 'Không thể tải dữ liệu vai trò');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAssignModal = (emp?: any) => {
    const targetEmp = emp || employees[0];
    if (targetEmp) {
      setSelectedEmpId(targetEmp.id.toString());
      const currentRoles = (targetEmp.roles || []).map((r: any) => r.name);
      setSelectedRoleNames(currentRoles.length > 0 ? currentRoles : ['employee']);
    }
    setIsAssignModalOpen(true);
  };

  const handleSelectEmployeeForAssign = (empId: string) => {
    setSelectedEmpId(empId);
    const emp = employees.find(e => e.id.toString() === empId);
    if (emp) {
      const currentRoles = (emp.roles || []).map((r: any) => r.name);
      setSelectedRoleNames(currentRoles.length > 0 ? currentRoles : ['employee']);
    }
  };

  const toggleRoleSelection = (roleName: string) => {
    if (roleName === 'employee') return; // Always keep baseline employee role
    setSelectedRoleNames(prev => 
      prev.includes(roleName)
        ? prev.filter(r => r !== roleName)
        : [...prev, roleName]
    );
  };

  const handleSaveAssignRoles = async () => {
    if (!selectedEmpId) return;
    setIsSavingAssign(true);
    try {
      await api.put('/roles/assign', {
        employeeId: selectedEmpId,
        roleNames: selectedRoleNames
      });
      toast.success('Thành công', 'Đã cập nhật vai trò nhân viên!');
      setIsAssignModalOpen(false);
      fetchInitialData();
    } catch (error: any) {
      toast.error('Lỗi', error.response?.data?.message || 'Không thể gán vai trò nhân viên');
    } finally {
      setIsSavingAssign(false);
    }
  };

  const handleQuickChangeRole = async (empId: string, newRoleName: string) => {
    try {
      await api.put('/roles/assign', {
        employeeId: empId,
        roleNames: [newRoleName, 'employee']
      });
      toast.success('Thành công', 'Đã thay đổi vai trò nhân viên!');
      fetchInitialData();
    } catch (err: any) {
      toast.error('Lỗi', err.response?.data?.message || 'Không thể đổi vai trò');
    }
  };

  const filteredEmployees = employees.filter(e => 
    e.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.department?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedEmp = employees.find(e => e.id.toString() === selectedEmpId);

  return (
    <div className="space-y-6">
      
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface-alt p-4 rounded-xl border border-border">
        <div>
          <h3 className="font-bold text-base flex items-center gap-2 text-text-primary">
            <ShieldCheck className="w-5 h-5 text-brand-500" />
            Quản lý Vai trò System Roles
          </h3>
          <p className="text-xs text-text-sec mt-0.5">Phân quyền vai trò truy cập chính (Admin, HR Manager, Manager, Employee) cho nhân sự trong công ty.</p>
        </div>

        <Button onClick={() => handleOpenAssignModal()}>
          <UserPlus className="w-4 h-4 mr-2" /> Phân Vai Trò Cho Nhân Viên
        </Button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-text-muted animate-pulse">Đang tải vai trò hệ thống...</div>
      ) : (
        /* Role Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {roles.map((role) => {
            const roleEmps = employees.filter(e => (e.roles || []).some((r: any) => r.name === role.name));
            return (
              <Card key={role.id} className="p-5 flex flex-col justify-between hover:shadow-lg transition-all border border-border">
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div className={`p-3 rounded-xl ${
                      role.name === 'admin' 
                        ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-600' 
                        : role.name === 'hr_manager'
                        ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600'
                        : role.name === 'department_manager'
                        ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600'
                        : 'bg-brand-50 dark:bg-brand-900/20 text-brand-600'
                    }`}>
                      <Shield className="w-6 h-6" />
                    </div>
                    <Badge variant={role.name === 'admin' ? 'danger' : 'info'}>
                      {roleEmps.length} nhân viên
                    </Badge>
                  </div>

                  <h3 className="font-bold text-lg text-text-primary mb-1">{role.displayName || role.name}</h3>
                  <p className="text-xs text-text-sec leading-relaxed min-h-[36px]">{role.description || 'Vai trò hệ thống'}</p>
                </div>

                <div className="mt-5 pt-4 border-t border-border flex items-center justify-between">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20 font-semibold"
                    onClick={() => { setSelectedRole(role); setIsViewRoleModalOpen(true); }}
                  >
                    <Users className="w-4 h-4 mr-1.5" /> Xem nhân viên ({roleEmps.length})
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal 1: View Employees in Selected Role */}
      {isViewRoleModalOpen && selectedRole && (
        <Modal 
          isOpen={isViewRoleModalOpen} 
          onClose={() => setIsViewRoleModalOpen(false)} 
          title={`Danh sách nhân viên vai trò: ${selectedRole.displayName || selectedRole.name}`}
        >
          <div className="space-y-4">
            <p className="text-xs text-text-sec">{selectedRole.description}</p>
            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
              {employees
                .filter(e => (e.roles || []).some((r: any) => r.name === selectedRole.name))
                .map(emp => (
                  <div key={emp.id} className="p-3 bg-surface-alt rounded-xl flex items-center justify-between gap-4 text-sm border border-border">
                    <div>
                      <p className="font-semibold text-text-primary">{emp.fullName || emp.name}</p>
                      <p className="text-xs text-text-sec">{emp.email} &middot; {emp.department || 'Nhân sự'}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <select 
                        className="text-xs h-8 px-2 rounded-lg border border-border bg-surface font-medium"
                        value={selectedRole.name}
                        onChange={(e) => handleQuickChangeRole(emp.id.toString(), e.target.value)}
                      >
                        <option value="admin">Admin</option>
                        <option value="hr_manager">HR Manager</option>
                        <option value="department_manager">Department Manager</option>
                        <option value="employee">Employee</option>
                      </select>
                    </div>
                  </div>
                ))}

              {employees.filter(e => (e.roles || []).some((r: any) => r.name === selectedRole.name)).length === 0 && (
                <div className="p-8 text-center text-xs text-text-muted">Chưa có nhân viên nào thuộc vai trò này.</div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Modal 2: Assign Roles to Employee */}
      {isAssignModalOpen && (
        <Modal 
          isOpen={isAssignModalOpen} 
          onClose={() => setIsAssignModalOpen(false)} 
          title="Phân vai trò cho nhân viên"
        >
          <div className="space-y-5">
            {/* Employee Selector */}
            <div>
              <label className="block text-xs font-bold text-text-sec uppercase mb-1.5">Chọn nhân viên:</label>
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    type="text"
                    placeholder="Tìm theo tên, mã hoặc phòng ban..."
                    className="w-full h-9 pl-9 pr-3 rounded-lg border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <select
                  className="w-full h-10 px-3 rounded-xl border border-border bg-surface text-sm font-semibold text-brand-600 focus:ring-2 focus:ring-brand-500"
                  value={selectedEmpId}
                  onChange={(e) => handleSelectEmployeeForAssign(e.target.value)}
                >
                  {filteredEmployees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullName || emp.name} ({emp.department || 'Nhân sự'})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Role Checkboxes */}
            {selectedEmp && (
              <div className="space-y-3 pt-2 border-t border-border">
                <label className="block text-xs font-bold text-text-sec uppercase">
                  Chọn vai trò gán cho [{selectedEmp.fullName || selectedEmp.name}]:
                </label>

                <div className="space-y-2">
                  {[
                    { name: 'admin', label: 'Admin', desc: 'Toàn quyền quản trị hệ thống' },
                    { name: 'hr_manager', label: 'HR Manager', desc: 'Quản lý nhân sự, lương & báo cáo' },
                    { name: 'department_manager', label: 'Department Manager', desc: 'Quản lý và duyệt đơn phòng ban' },
                    { name: 'employee', label: 'Employee', desc: 'Quyền nhân viên cơ bản (Mặc định)' }
                  ].map(r => {
                    const isChecked = selectedRoleNames.includes(r.name);
                    const isDefault = r.name === 'employee';
                    return (
                      <label 
                        key={r.name}
                        onClick={() => toggleRoleSelection(r.name)}
                        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                          isChecked 
                            ? 'bg-brand-50 dark:bg-brand-900/20 border-brand-300 dark:border-brand-700' 
                            : 'bg-surface-alt border-border hover:border-brand-300'
                        }`}
                      >
                        <div className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center border transition-colors ${
                          isChecked ? 'bg-brand-600 border-brand-600 text-white' : 'border-border bg-surface'
                        }`}>
                          {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-text-primary">{r.label}</span>
                            {isDefault && <Badge variant="info">Baseline</Badge>}
                          </div>
                          <p className="text-xs text-text-sec mt-0.5">{r.desc}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button variant="outline" onClick={() => setIsAssignModalOpen(false)}>Hủy</Button>
              <Button onClick={handleSaveAssignRoles} isLoading={isSavingAssign}>
                <Check className="w-4 h-4 mr-1.5" /> Lưu Phân Vai Trò
              </Button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
}
