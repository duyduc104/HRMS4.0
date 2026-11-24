import React, { useState, useEffect } from 'react';
import { useDocuments, useDeleteDocument } from '../hooks/useDocuments';
import { DocumentList } from '../components/DocumentList';
import { UploadDocumentModal } from '../components/UploadDocumentModal';
import { DocumentViewerModal } from '../components/DocumentViewerModal';
import { CategoryTree } from '../components/CategoryTree';
import type { Document } from '../api/documentApi';
import { documentCategoryApi } from '../api/documentCategoryApi';
import { useDocumentCategories } from '../hooks/useDocumentCategories';
import { Search, Plus, FileText, Bot } from 'lucide-react';
import { toast } from '../../../stores/useToastStore';
import { useAuthStore } from '../../../stores/useAuthStore';

export const DocumentsPage: React.FC = () => {
  const { user } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null);

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  
  // Kiểm tra quyền quản lý danh mục (Admin, HR Manager, Department Manager)
  const canManageCategories = React.useMemo(() => {
    if (!user) return false;
    const userRole = (user.role || '').toLowerCase().replace(/\s+/g, '_');
    const userRoles = (user.roles || []).map((r: any) => 
      (typeof r === 'string' ? r : r.name || r.code || '').toLowerCase().replace(/\s+/g, '_')
    );
    const allRoles = [userRole, ...userRoles];
    return allRoles.some(r => ['admin', 'hr_manager', 'department_manager'].includes(r));
  }, [user]);

  // Category Creation State
  const { categories, refetch: refetchCategories } = useDocumentCategories();
  const [isCreateCategoryOpen, setIsCreateCategoryOpen] = useState(false);
  const [categoryParentId, setCategoryParentId] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const { data: documents = [], isLoading, refetch: refetchDocuments } = useDocuments(debouncedSearch, selectedCategoryId);
  const deleteDocumentMutation = useDeleteDocument();

  const handleDeleteDocumentClick = (doc: Document) => {
    setDocumentToDelete(doc);
  };

  const confirmDeleteDocument = () => {
    if (!documentToDelete) return;
    deleteDocumentMutation.mutate(documentToDelete.id, {
      onSuccess: () => {
        toast.success('Đã xóa tài liệu thành công');
        setDocumentToDelete(null);
      },
      onError: (error: any) => {
        toast.error(error?.response?.data?.message || 'Lỗi khi xóa tài liệu');
        setDocumentToDelete(null);
      }
    });
  };

  const handleCreateCategoryClick = (parentId: string | null) => {
    if (!canManageCategories) {
      toast.error('Bạn không có quyền quản lý danh mục tài liệu');
      return;
    }
    setCategoryParentId(parentId);
    setNewCategoryName('');
    setIsCreateCategoryOpen(true);
  };

  const submitCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    if (!canManageCategories) {
      toast.error('Bạn không có quyền quản lý danh mục tài liệu');
      return;
    }
    try {
      setIsCreatingCategory(true);
      await documentCategoryApi.createCategory({
        name: newCategoryName.trim(),
        parentId: categoryParentId
      });
      setIsCreateCategoryOpen(false);
      refetchCategories();
      toast.success('Tạo danh mục thành công');
    } catch (error) {
      console.error('Lỗi tạo danh mục', error);
      toast.error('Tạo danh mục thất bại');
    } finally {
      setIsCreatingCategory(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto h-full flex flex-col">
      {/* Header section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
            <FileText className="w-7 h-7 mr-2 text-blue-600" />
            Kho Tài Liệu AI
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Quản lý, tìm kiếm thông minh và hỏi đáp AI trực tiếp trên tài liệu.
          </p>
        </div>
        
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <div className="relative w-full md:w-80">
            <input
              type="text"
              placeholder="Tìm kiếm tài liệu thông minh..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white transition-all"
            />
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
          </div>
          
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="flex items-center justify-center w-full md:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors"
          >
            <Plus className="w-5 h-5 mr-1" />
            Tải lên
          </button>
        </div>
      </div>

      {/* Split View */}
      <div className="flex-1 flex flex-col md:flex-row gap-6 overflow-hidden">
        {/* Left Sidebar - Category Tree */}
        <div className="w-full md:w-64 lg:w-72 flex-shrink-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm p-4 h-64 md:h-full overflow-hidden">
          <CategoryTree 
            categories={categories}
            selectedCategoryId={selectedCategoryId}
            onSelectCategory={setSelectedCategoryId}
            onCreateCategory={canManageCategories ? handleCreateCategoryClick : undefined}
          />
        </div>

        {/* Right Content - Document List */}
        <div className="flex-1 overflow-y-auto pr-2 pb-10">
          <DocumentList 
            documents={documents} 
            isLoading={isLoading} 
            onDocumentClick={setSelectedDocument} 
            onDelete={handleDeleteDocumentClick}
          />
        </div>
      </div>

      {/* Modals */}
      <UploadDocumentModal 
        isOpen={isUploadModalOpen} 
        onClose={() => { setIsUploadModalOpen(false); refetchDocuments(); }} 
      />
      
      {selectedDocument && (
        <DocumentViewerModal 
          document={selectedDocument} 
          onClose={() => setSelectedDocument(null)} 
        />
      )}

      {/* Delete Confirmation Modal */}
      {documentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-xl shadow-2xl p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Xác nhận xóa</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Bạn có chắc chắn muốn xóa tài liệu <span className="font-semibold text-gray-900 dark:text-white">"{documentToDelete.title}"</span> không? Hành động này không thể hoàn tác.
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setDocumentToDelete(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                disabled={deleteDocumentMutation.isPending}
              >
                Hủy
              </button>
              <button 
                onClick={confirmDeleteDocument}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors flex items-center"
                disabled={deleteDocumentMutation.isPending}
              >
                {deleteDocumentMutation.isPending ? 'Đang xóa...' : 'Xóa tài liệu'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tạo Danh Mục */}
      {isCreateCategoryOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              Thêm thư mục {categoryParentId ? 'con' : 'mới'}
            </h3>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tên thư mục</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:text-white"
                placeholder="Nhập tên..."
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsCreateCategoryOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={submitCreateCategory}
                disabled={!newCategoryName.trim() || isCreatingCategory}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isCreatingCategory ? 'Đang tạo...' : 'Lưu lại'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
