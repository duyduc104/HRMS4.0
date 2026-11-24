import React from 'react';
import type { Document } from '../api/documentApi';
import { FileText, FileImage, FileCode, File, Eye, Clock, Shield, Globe, Trash2 } from 'lucide-react';
import { useAuthStore } from '../../../stores/useAuthStore';


interface DocumentCardProps {
  document: Document;
  onClick: (document: Document) => void;
  onDelete?: (document: Document) => void;
}

export const DocumentCard: React.FC<DocumentCardProps> = ({ document, onClick, onDelete }) => {
  const { user } = useAuthStore();

  const canDelete = React.useMemo(() => {
    if (!user) return false;
    if (user.id === document.senderId) return true;
    const userRole = (user.role || '').toLowerCase().replace(/\s+/g, '_');
    const userRoles = (user.roles || []).map((r: any) => 
      (typeof r === 'string' ? r : r.name || r.code || '').toLowerCase().replace(/\s+/g, '_')
    );
    return [userRole, ...userRoles].includes('admin');
  }, [user, document.senderId]);

  const getFileIcon = (fileName: string, mimeType: string) => {
    if (mimeType.includes('pdf')) return <FileText className="w-10 h-10 text-red-500" />;
    if (mimeType.includes('image')) return <FileImage className="w-10 h-10 text-blue-500" />;
    if (mimeType.includes('word') || fileName.endsWith('.docx') || fileName.endsWith('.doc')) return <FileText className="w-10 h-10 text-blue-600" />;
    if (mimeType.includes('excel') || fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) return <FileCode className="w-10 h-10 text-green-600" />; // Mượn FileCode cho Excel
    return <File className="w-10 h-10 text-gray-500" />;
  };

  return (
    <div 
      className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col cursor-pointer overflow-hidden group"
      onClick={() => onClick(document)}
    >
      <div className="flex flex-row items-start p-5 pb-3 w-full">
        <div className="flex items-start space-x-4 w-full">
          <div className="shrink-0 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl group-hover:scale-105 transition-transform">
            {getFileIcon(document.fileName, document.mimeType)}
          </div>
          <div className="flex-1 min-w-0 pt-1">
            <h3 className="font-semibold text-base leading-tight text-gray-900 dark:text-gray-100 line-clamp-2 break-words" title={document.title}>
              {document.title}
            </h3>
            <p className="text-xs text-gray-500 truncate mt-1.5" title={document.fileName}>
              {document.fileName}
            </p>
          </div>
        </div>
      </div>
      
      <div className="px-5 pb-3 flex-1 flex flex-col justify-end">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
            <span className="font-medium mr-1 text-gray-700 dark:text-gray-300">Gửi bởi:</span> 
            <span className="truncate">{document.sender?.fullName || 'Hệ thống'}</span>
          </div>
          {canDelete && onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(document);
              }}
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              title="Xóa tài liệu"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex items-center text-xs text-gray-500 space-x-4">
          <span className="flex items-center space-x-1" title="Lượt xem">
            <Eye className="w-3.5 h-3.5" />
            <span>{document.viewCount} lượt xem</span>
          </span>
          <span className="flex items-center space-x-1" title="Ngày gửi">
            <Clock className="w-3.5 h-3.5" />
            <span>{new Date(document.createdAt).toLocaleDateString('vi-VN')}</span>
          </span>
        </div>
      </div>

      <div className="px-5 py-3 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center mt-auto">
        {document.visibility === 'PUBLIC' ? (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
            <Globe className="w-3 h-3 mr-1.5" /> Công khai
          </span>
        ) : (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
            <Shield className="w-3 h-3 mr-1.5" /> Nội bộ
          </span>
        )}
        <span className="text-xs font-medium text-gray-500 bg-white dark:bg-gray-800 px-2 py-1 rounded shadow-sm border border-gray-200 dark:border-gray-700">
          {(document.size / 1024 / 1024).toFixed(2)} MB
        </span>
      </div>
    </div>
  );
};
