import React, { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen, Plus, MoreVertical, FolderKanban } from 'lucide-react';
import type { DocumentCategory } from '../api/documentCategoryApi';

interface CategoryTreeProps {
  categories: DocumentCategory[];
  selectedCategoryId: string | null;
  onSelectCategory: (id: string | null) => void;
  onCreateCategory?: (parentId: string | null) => void;
}

export const CategoryTree: React.FC<CategoryTreeProps> = ({
  categories,
  selectedCategoryId,
  onSelectCategory,
  onCreateCategory
}) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Build tree structure
  const rootCategories = useMemo(() => {
    const map = new Map<string, DocumentCategory & { children: any[] }>();
    categories.forEach(c => map.set(c.id, { ...c, children: [] }));
    
    const roots: any[] = [];
    map.forEach(c => {
      if (c.parentId && map.has(c.parentId)) {
        map.get(c.parentId)!.children.push(c);
      } else {
        roots.push(c);
      }
    });
    return roots;
  }, [categories]);

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  const renderTree = (nodes: any[], level = 0) => {
    return nodes.map(node => {
      const isExpanded = expandedIds.has(node.id);
      const isSelected = selectedCategoryId === node.id;
      const hasChildren = node.children && node.children.length > 0;

      return (
        <div key={node.id} className="w-full">
          <div 
            className={`flex items-center group cursor-pointer py-1.5 px-2 rounded-lg mb-1 transition-colors ${isSelected ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
            style={{ paddingLeft: `${level * 1.5 + 0.5}rem` }}
            onClick={() => onSelectCategory(node.id)}
          >
            <div 
              className={`w-5 h-5 flex items-center justify-center mr-1 ${hasChildren ? 'cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 rounded' : ''}`}
              onClick={(e) => hasChildren ? toggleExpand(node.id, e) : undefined}
            >
              {hasChildren ? (
                isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />
              ) : (
                <span className="w-4 h-4 inline-block" />
              )}
            </div>
            
            {isExpanded && hasChildren ? (
               <FolderOpen className={`w-4 h-4 mr-2 ${isSelected ? 'text-blue-500' : 'text-gray-400'}`} />
            ) : (
               <Folder className={`w-4 h-4 mr-2 ${isSelected ? 'text-blue-500' : 'text-gray-400'}`} />
            )}
            
            <span className="text-sm font-medium truncate flex-1">{node.name}</span>

            {onCreateCategory && (
              <button 
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white dark:hover:bg-gray-700 rounded text-gray-400 hover:text-blue-500 transition-all"
                onClick={(e) => { e.stopPropagation(); onCreateCategory(node.id); }}
                title="Thêm danh mục con"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          
          {isExpanded && hasChildren && (
            <div className="w-full">
              {renderTree(node.children, level + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto pr-2">
      <div 
        className={`flex items-center group cursor-pointer py-2 px-2 rounded-lg mb-2 transition-colors ${selectedCategoryId === null ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
        onClick={() => onSelectCategory(null)}
      >
        <FolderKanban className={`w-5 h-5 mr-3 ${selectedCategoryId === null ? 'text-blue-600' : 'text-gray-500'}`} />
        <span className="text-sm flex-1">Tất cả tài liệu</span>
      </div>

      <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 mt-4 px-2 flex justify-between items-center">
        Danh mục
        {onCreateCategory && (
          <button 
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-400 hover:text-blue-500 transition-colors"
            onClick={() => onCreateCategory(null)}
            title="Thêm danh mục gốc"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>

      {categories.length === 0 ? (
        <div className="px-2 py-4 text-center text-sm text-gray-500 italic">
          Chưa có danh mục nào
        </div>
      ) : (
        renderTree(rootCategories)
      )}
    </div>
  );
};
