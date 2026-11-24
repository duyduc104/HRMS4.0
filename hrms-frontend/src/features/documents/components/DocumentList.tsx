import React, { useState, useEffect } from 'react';
import type { Document } from '../api/documentApi';
import { DocumentCard } from './DocumentCard';
import { Pagination } from '../../../components/ui/Pagination/Pagination';

interface DocumentListProps {
  documents: Document[];
  isLoading: boolean;
  onDocumentClick: (doc: Document) => void;
  onDelete?: (doc: Document) => void;
  pageSize?: number;
}

export const DocumentList: React.FC<DocumentListProps> = ({ 
  documents, 
  isLoading, 
  onDocumentClick, 
  onDelete,
  pageSize = 8
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [currentPageSize, setCurrentPageSize] = useState(pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [documents]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex flex-col space-y-3">
            <div className="h-[125px] w-full rounded-xl bg-gray-200 dark:bg-gray-800 animate-pulse" />
            <div className="space-y-2">
              <div className="h-4 w-[250px] bg-gray-200 dark:bg-gray-800 animate-pulse rounded" />
              <div className="h-4 w-[200px] bg-gray-200 dark:bg-gray-800 animate-pulse rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-24 h-24 mb-6 text-gray-300 dark:text-gray-600">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Không tìm thấy tài liệu nào</h3>
        <p className="mt-1 text-sm text-gray-500">
          Bạn chưa có tài liệu nào hoặc không tìm thấy kết quả phù hợp.
        </p>
      </div>
    );
  }

  const safeDocs = Array.isArray(documents) ? documents : [];
  const paginatedDocs = safeDocs.slice((currentPage - 1) * currentPageSize, currentPage * currentPageSize);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {paginatedDocs.map((doc) => (
          <DocumentCard 
            key={doc.id} 
            document={doc} 
            onClick={onDocumentClick} 
            onDelete={onDelete}
          />
        ))}
      </div>

      {safeDocs.length > 0 && (
        <div className="rounded-lg border border-border overflow-hidden bg-surface shadow-sm">
          <Pagination
            currentPage={currentPage}
            totalItems={safeDocs.length}
            pageSize={currentPageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setCurrentPageSize}
            pageSizeOptions={[8, 16, 32, 64]}
            itemLabel="tài liệu"
          />
        </div>
      )}
    </div>
  );
};
