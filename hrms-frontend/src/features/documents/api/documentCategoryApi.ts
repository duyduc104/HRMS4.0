import api from '../../../services/api';

export interface DocumentCategory {
  id: string;
  name: string;
  parentId: string | null;
  order: number;
  createdAt: string;
}

export const documentCategoryApi = {
  getCategories: async (): Promise<DocumentCategory[]> => {
    const response = await api.get('/documents/categories');
    return response.data;
  },

  createCategory: async (data: { name: string; parentId?: string | null; order?: number }): Promise<DocumentCategory> => {
    const response = await api.post('/documents/categories', data);
    return response.data;
  },

  updateCategory: async (id: string, data: { name?: string; parentId?: string | null; order?: number }): Promise<DocumentCategory> => {
    const response = await api.put(`/documents/categories/${id}`, data);
    return response.data;
  },

  deleteCategory: async (id: string): Promise<void> => {
    await api.delete(`/documents/categories/${id}`);
  }
};
