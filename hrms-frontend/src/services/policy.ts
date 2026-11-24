import api from './api';

export interface PolicyDocumentItem {
  id: string;
  title: string;
  category: 'POLICY' | 'ANNOUNCEMENT' | 'EVENT' | 'GUIDELINE';
  description?: string;
  content?: string;
  fileUrl?: string;
  fileName?: string;
  contactEmployeeId?: string;
  contactPerson?: {
    id: string;
    fullName: string;
    email?: string;
    phone?: string;
    username?: string;
  };
  targetRoles: string[];
  scheduledPublishAt?: string;
  status: 'DRAFT' | 'SCHEDULED' | 'PUBLISHED';
  createdAt: string;
  createdBy?: {
    id: string;
    fullName: string;
  };
}

// Service giao tiep API quan ly van ban chinh sach, thong bao noi bo va hoi dap RAG AI

export const policyServices = {
  // Ham nay dung de lay danh sach cac van ban chinh sach/thong bao phu hop voi vai tro nguoi dung
  getPolicies: async () => {
    const res = await api.get('/policies');
    return res.data;
  },

  // Ham nay dung de tao moi mot van ban chinh sach (ho tro hen gio phat hanh SCHEDULED va gioi han targetRoles)
  createPolicy: async (data: Partial<PolicyDocumentItem>) => {
    const res = await api.post('/policies', data);
    return res.data;
  },

  // Ham nay dung de cap nhat noi dung hoac trang thai cua mot van ban chinh sach
  updatePolicy: async (id: string, data: Partial<PolicyDocumentItem>) => {
    const res = await api.put(`/policies/${id}`, data);
    return res.data;
  },

  // Ham nay dung de xoa bo mot van ban chinh sach theo id
  deletePolicy: async (id: string) => {
    const res = await api.delete(`/policies/${id}`);
    return res.data;
  },

  // Ham nay dung de hoi dap truc tiep voi Gemini AI dua tren noi dung cua tai lieu chinh sach (RAG Chat)
  askAIPolicy: async (id: string, question: string, history: any[] = []) => {
    const res = await api.post(`/policies/${id}/ask-ai`, { question, history });
    return res.data;
  }
};
