import api from './api';

export interface ModuleItem {
  key: string;
  label: string;
}

export interface ActionItem {
  key: string;
  label: string;
}

export interface PermissionRecord {
  id?: string;
  department?: string;
  employeeId?: string;
  module: string;
  action: string;
  isAllowed: boolean;
}

// Service giao tiep API ma tran phan quyen RBAC theo phong ban va de quyen nhan vien

export const permissionServices = {
  // Ham nay dung de lay danh sach metadata cac module va action chuc nang trong he thong
  getMeta: async () => {
    const res = await api.get('/permissions/meta');
    return res.data as { modules: ModuleItem[]; actions: ActionItem[] };
  },

  // Ham nay dung de lay toan bo ma tran quyen theo phong ban
  getDepartmentPermissions: async () => {
    const res = await api.get('/permissions/department');
    return res.data as PermissionRecord[];
  },

  // Ham nay dung de luu cau hinh ma tran quyen cho mot phong ban cu the
  saveDepartmentPermissions: async (department: string, permissions: Partial<PermissionRecord>[]) => {
    const res = await api.post('/permissions/department', { department, permissions });
    return res.data;
  },

  // Ham nay dung de lay danh sach quyen rieng biet (quyen de/override) cua mot nhan vien
  getEmployeePermissions: async (employeeId: string) => {
    const res = await api.get(`/permissions/employee/${employeeId}`);
    return res.data as PermissionRecord[];
  },

  // Ham nay dung de luu quyen de rieng biet cho mot nhan vien cu the
  saveEmployeePermissions: async (employeeId: string, permissions: Partial<PermissionRecord>[]) => {
    const res = await api.post(`/permissions/employee/${employeeId}`, { permissions });
    return res.data;
  },

  // Ham nay dung de bat/tat dac quyen quan tri vien toan quyen (Admin Privilege) cho nhan vien
  toggleEmployeeAdmin: async (employeeId: string, isAdmin: boolean) => {
    const res = await api.put(`/permissions/employee/${employeeId}/admin`, { isAdmin });
    return res.data;
  }
};
