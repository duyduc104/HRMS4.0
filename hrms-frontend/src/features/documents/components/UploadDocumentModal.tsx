import React, { useState, useEffect, useMemo } from 'react';
import { useCreateDocument } from '../hooks/useDocuments';
import { useDocumentCategories } from '../hooks/useDocumentCategories';
import { X, Upload, File as FileIcon, Building, Shield, Users, Check, Search, AlertCircle } from 'lucide-react';
import { toast } from '../../../stores/useToastStore';
import api from '../../../services/api';

interface UploadDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DepartmentItem {
  id: string | number;
  name: string;
}

interface EmployeeItem {
  id: string | number;
  fullName: string;
  code?: string;
  department?: string;
  position?: string;
}

const AVAILABLE_ROLES = [
  { key: 'admin', label: 'Quản trị viên (Admin)' },
  { key: 'hr_manager', label: 'Quản lý nhân sự (HR Manager)' },
  { key: 'department_manager', label: 'Trưởng phòng (Department Manager)' },
  { key: 'employee', label: 'Nhân viên (Employee)' }
];

export const UploadDocumentModal: React.FC<UploadDocumentModalProps> = ({ isOpen, onClose }) => {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [visibility, setVisibility] = useState<'PUBLIC' | 'PRIVATE'>('PUBLIC');
  const [categoryId, setCategoryId] = useState<string>('');

  // Scopes for PRIVATE documents
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<(string | number)[]>([]);

  // Fetched data for selectors
  const [departmentsList, setDepartmentsList] = useState<DepartmentItem[]>([]);
  const [employeesList, setEmployeesList] = useState<EmployeeItem[]>([]);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);

  const createDocumentMutation = useCreateDocument();
  const { categories } = useDocumentCategories();

  useEffect(() => {
    if (isOpen) {
      setIsLoadingMetadata(true);
      Promise.all([
        api.get('/departments').catch(() => ({ data: [] })),
        api.get('/employees').catch(() => ({ data: [] }))
      ]).then(([deptRes, empRes]) => {
        setDepartmentsList(Array.isArray(deptRes.data) ? deptRes.data : []);
        setEmployeesList(Array.isArray(empRes.data) ? empRes.data : []);
      }).finally(() => {
        setIsLoadingMetadata(false);
      });
    }
  }, [isOpen]);

  // Filter employees for selector
  const filteredEmployees = useMemo(() => {
    if (!employeeSearch.trim()) return employeesList.slice(0, 15);
    const searchLower = employeeSearch.toLowerCase().trim();
    return employeesList.filter(emp => 
      (emp.fullName && emp.fullName.toLowerCase().includes(searchLower)) ||
      (emp.code && emp.code.toLowerCase().includes(searchLower)) ||
      (emp.department && emp.department.toLowerCase().includes(searchLower))
    ).slice(0, 20);
  }, [employeesList, employeeSearch]);

  const toggleDepartment = (deptName: string) => {
    setSelectedDepartments(prev => 
      prev.includes(deptName) ? prev.filter(d => d !== deptName) : [...prev, deptName]
    );
  };

  const toggleAllDepartments = () => {
    if (selectedDepartments.length === departmentsList.length) {
      setSelectedDepartments([]);
    } else {
      setSelectedDepartments(departmentsList.map(d => d.name));
    }
  };

  const toggleRole = (roleKey: string) => {
    setSelectedRoles(prev => 
      prev.includes(roleKey) ? prev.filter(r => r !== roleKey) : [...prev, roleKey]
    );
  };

  const toggleEmployee = (empId: string | number) => {
    setSelectedEmployees(prev => 
      prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]
    );
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error('Vui lòng chọn một file');
      return;
    }
    if (!title.trim()) {
      toast.error('Vui lòng nhập tên tài liệu');
      return;
    }

    if (visibility === 'PRIVATE') {
      if (selectedDepartments.length === 0 && selectedRoles.length === 0 && selectedEmployees.length === 0) {
        toast.error('Vui lòng chọn ít nhất một phòng ban, vai trò hoặc nhân viên được phép truy cập');
        return;
      }
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title.trim());
    formData.append('visibility', visibility);
    if (categoryId) formData.append('categoryId', categoryId);
    
    if (visibility === 'PRIVATE') {
      formData.append('targetDepartments', JSON.stringify(selectedDepartments));
      formData.append('targetRoles', JSON.stringify(selectedRoles));
      formData.append('targetEmployees', JSON.stringify(selectedEmployees));
    }

    createDocumentMutation.mutate(formData, {
      onSuccess: () => {
        toast.success('Tải lên thành công!', 'Đã lưu và bóc tách dữ liệu.');
        onClose();
        setFile(null);
        setTitle('');
        setVisibility('PUBLIC');
        setSelectedDepartments([]);
        setSelectedRoles([]);
        setSelectedEmployees([]);
        setEmployeeSearch('');
      },
      onError: (err: any) => {
        toast.error('Tải lên thất bại', err.message);
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-800">
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Tải Lên Tài Liệu Mới
              </h2>
              <p className="text-xs text-gray-500">
                Tài liệu sẽ được tự động OCR và đánh chỉ mục tìm kiếm thông minh.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* File Upload Box */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              File đính kèm <span className="text-red-500">*</span>
            </label>
            <div className="flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-700 border-dashed rounded-xl hover:bg-gray-50/70 dark:hover:bg-gray-800/50 transition-colors">
              <div className="space-y-2 text-center">
                {file ? (
                  <div className="flex flex-col items-center">
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl mb-1">
                      <FileIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100 max-w-sm truncate">
                      {file.name}
                    </span>
                    <span className="text-xs text-gray-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                    <button 
                      type="button" 
                      onClick={() => setFile(null)} 
                      className="text-xs text-red-500 hover:underline mt-1 font-medium"
                    >
                      Đổi file khác
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload className="mx-auto h-10 w-10 text-gray-400" />
                    <div className="flex text-sm text-gray-600 dark:text-gray-400 justify-center">
                      <label 
                        htmlFor="file-upload" 
                        className="relative cursor-pointer font-semibold text-blue-600 hover:text-blue-500 focus-within:outline-none"
                      >
                        <span>Chọn tập tin</span>
                        <input 
                          id="file-upload" 
                          name="file-upload" 
                          type="file" 
                          className="sr-only" 
                          onChange={(e) => {
                            const f = e.target.files?.[0] || null;
                            setFile(f);
                            if (f && !title) {
                              setTitle(f.name.replace(/\.[^/.]+$/, ''));
                            }
                          }} 
                        />
                      </label>
                      <span className="pl-1">hoặc kéo thả vào đây</span>
                    </div>
                    <p className="text-xs text-gray-500">Hỗ trợ PDF, DOCX, XLSX, TXT, Hình ảnh (tối đa 25MB)</p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Title Input */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Tên tài liệu <span className="text-red-500">*</span>
            </label>
            <input 
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white text-sm"
              placeholder="Nhập tên tài liệu hiển thị..."
            />
          </div>

          {/* Category Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Thư mục / Danh mục
            </label>
            <select 
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3.5 py-2 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white text-sm"
            >
              <option value="">-- Không phân loại (Thư mục gốc) --</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          {/* Visibility Mode */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Chế độ phân quyền truy cập
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setVisibility('PUBLIC')}
                className={`flex flex-col p-3 rounded-xl border text-left transition-all ${
                  visibility === 'PUBLIC'
                    ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-900/20 ring-2 ring-blue-500/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-bold text-gray-900 dark:text-white">Công khai</span>
                  {visibility === 'PUBLIC' && <Check className="w-4 h-4 text-blue-600" />}
                </div>
                <p className="text-xs text-gray-500">Mọi nhân viên trong tổ chức đều có thể xem và tra cứu.</p>
              </button>

              <button
                type="button"
                onClick={() => setVisibility('PRIVATE')}
                className={`flex flex-col p-3 rounded-xl border text-left transition-all ${
                  visibility === 'PRIVATE'
                    ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-900/20 ring-2 ring-blue-500/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-bold text-gray-900 dark:text-white">Riêng tư / Giới hạn</span>
                  {visibility === 'PRIVATE' && <Check className="w-4 h-4 text-blue-600" />}
                </div>
                <p className="text-xs text-gray-500">Chỉ cấp quyền cho phòng ban, vai trò hoặc nhân viên được chọn.</p>
              </button>
            </div>
          </div>

          {/* Granular Permission Scope for PRIVATE Documents */}
          {visibility === 'PRIVATE' && (
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-gray-700">
                <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center">
                  <Shield className="w-4 h-4 mr-1.5 text-blue-600" />
                  Cấu hình quyền xem (Private Scope)
                </h4>
                <span className="text-xs text-gray-500">Ít nhất 1 phạm vi bắt buộc</span>
              </div>

              {/* 1. Target Departments */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center">
                    <Building className="w-3.5 h-3.5 mr-1 text-gray-500" />
                    Phòng ban được xem:
                  </label>
                  {departmentsList.length > 0 && (
                    <button
                      type="button"
                      onClick={toggleAllDepartments}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
                    >
                      {selectedDepartments.length === departmentsList.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả phòng ban'}
                    </button>
                  )}
                </div>
                {departmentsList.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">Không tìm thấy dữ liệu phòng ban</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {departmentsList.map(dept => {
                      const isSelected = selectedDepartments.includes(dept.name);
                      return (
                        <button
                          key={dept.id}
                          type="button"
                          onClick={() => toggleDepartment(dept.name)}
                          className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors flex items-center gap-1.5 ${
                            isSelected
                              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3" />}
                          {dept.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 2. Target Roles */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                  <Shield className="w-3.5 h-3.5 mr-1 text-gray-500" />
                  Vai trò / Cấp bậc được xem:
                </label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_ROLES.map(role => {
                    const isSelected = selectedRoles.includes(role.key);
                    return (
                      <button
                        key={role.key}
                        type="button"
                        onClick={() => toggleRole(role.key)}
                        className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                        {role.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Target Specific Employees */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center">
                    <Users className="w-3.5 h-3.5 mr-1 text-gray-500" />
                    Chỉ định nhân viên cụ thể ({selectedEmployees.length} đã chọn):
                  </label>
                  {selectedEmployees.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedEmployees([])}
                      className="text-xs text-red-500 hover:underline font-medium"
                    >
                      Xóa chọn tất cả
                    </button>
                  )}
                </div>

                <div className="relative mb-2">
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="Tìm theo tên hoặc mã nhân viên..."
                    value={employeeSearch}
                    onChange={(e) => setEmployeeSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white"
                  />
                </div>

                <div className="max-h-36 overflow-y-auto space-y-1 border border-gray-200 dark:border-gray-700 rounded-lg p-1.5 bg-white dark:bg-gray-900">
                  {filteredEmployees.length === 0 ? (
                    <div className="p-2 text-center text-xs text-gray-400 italic">
                      Không tìm thấy nhân viên phù hợp
                    </div>
                  ) : (
                    filteredEmployees.map(emp => {
                      const isSelected = selectedEmployees.includes(emp.id);
                      return (
                        <div
                          key={emp.id}
                          onClick={() => toggleEmployee(emp.id)}
                          className={`flex items-center justify-between px-2.5 py-1.5 rounded text-xs cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
                              : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          <div className="flex items-center space-x-2 truncate">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="rounded text-blue-600 focus:ring-blue-500 pointer-events-none"
                            />
                            <span className="truncate">{emp.fullName}</span>
                            {emp.code && (
                              <span className="text-[10px] text-gray-400">({emp.code})</span>
                            )}
                          </div>
                          {emp.department && (
                            <span className="text-[10px] text-gray-500 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                              {emp.department}
                            </span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Status Alert */}
              <div className="pt-1">
                {selectedDepartments.length === 0 && selectedRoles.length === 0 && selectedEmployees.length === 0 ? (
                  <div className="flex items-center p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-xs">
                    <AlertCircle className="w-4 h-4 mr-1.5 shrink-0" />
                    <span>Lưu ý: Vui lòng chọn ít nhất một phòng ban, vai trò hoặc nhân viên được phép truy cập.</span>
                  </div>
                ) : (
                  <div className="flex items-center p-2 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-xs">
                    <Check className="w-4 h-4 mr-1.5 shrink-0" />
                    <span>
                      Đã cấp quyền: <strong>{selectedDepartments.length}</strong> phòng ban, <strong>{selectedRoles.length}</strong> vai trò, <strong>{selectedEmployees.length}</strong> nhân viên cụ thể.
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="pt-2 flex justify-end space-x-3">
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 transition-colors"
            >
              Hủy
            </button>
            <button 
              type="submit" 
              disabled={createDocumentMutation.isPending}
              className="inline-flex justify-center items-center px-5 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {createDocumentMutation.isPending ? 'Đang OCR & Tải lên...' : 'Lưu Tài Liệu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
