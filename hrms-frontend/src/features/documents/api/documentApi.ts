import api from '../../../services/api';

export interface Document {
  id: string;
  title: string;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  size: number;
  content: string;
  visibility: 'PUBLIC' | 'PRIVATE';
  targetDepartments: string[];
  targetRoles: string[];
  targetEmployees: string[];
  senderId: string;
  viewCount: number;
  status: 'DRAFT' | 'SCHEDULED' | 'PUBLISHED';
  categoryId?: string | null;
  createdAt: string;
  sender: {
    id: string;
    fullName: string;
    email: string;
    department: string;
  };
}

export const documentApi = {
  getDocuments: async (keyword?: string, categoryId?: string | null): Promise<Document[]> => {
    const response = await api.get('/documents', {
      params: { keyword, categoryId }
    });
    return response.data;
  },

  createDocument: async (formData: FormData): Promise<Document> => {
    const response = await api.post('/documents', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  viewDocument: async (id: string): Promise<Document> => {
    const response = await api.put(`/documents/${id}/view`);
    return response.data;
  },

  askAIDocument: async (id: string, question: string, history: any[] = []): Promise<{ answer: string }> => {
    const response = await api.post(`/documents/${id}/ask-ai`, { question, history });
    return response.data;
  },

  deleteDocument: async (id: string): Promise<{ message: string }> => {
    const response = await api.delete(`/documents/${id}`);
    return response.data;
  },

  downloadDocument: async (id: string, fileName?: string): Promise<void> => {
    const response = await api.get(`/documents/${id}/download`, {
      responseType: 'blob'
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName || 'document');
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  getPreviewUrl: (id: string): string => {
    return `${api.defaults.baseURL || '/api'}/documents/${id}/preview`;
  }
};
