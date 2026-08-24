import React, { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface ColumnDef<T> {
  accessor: keyof T | string;
  label: React.ReactNode;
  render?: (item: T) => React.ReactNode;
  width?: string | number;
}

export interface TableProps<T> extends React.TableHTMLAttributes<HTMLTableElement> {
  columns: ColumnDef<T>[];
  data: T[];
  isLoading?: boolean;
  emptyState?: React.ReactNode;
  onRowClick?: (item: T) => void;
  pagination?: boolean;
  pageSize?: number;
}

export function Table<T extends { id?: string | number }>({
  className,
  columns,
  data,
  isLoading,
  emptyState,
  onRowClick,
  pagination = false,
  pageSize = 10,
  ...props
}: TableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);

  // Reset page when data changes
  useEffect(() => {
    setCurrentPage(1);
  }, [data]);

  const safeData = Array.isArray(data) ? data : [];
  const totalPages = Math.ceil(safeData.length / pageSize);
  const displayData = pagination && !isLoading
    ? safeData.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : safeData;
  return (
    <div className="w-full overflow-auto rounded-lg border border-border bg-surface">
      <table className={twMerge(clsx('w-full text-left text-sm text-text-primary', className))} {...props}>
        <thead className="bg-surface-alt/50 sticky top-0 z-10 text-label uppercase text-text-muted border-b border-border">
          <tr>
            {columns.map((col, i) => (
              <th
                key={String(col.accessor) || i}
                scope="col"
                className="px-4 py-3 font-semibold"
                style={{ width: col.width }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            // Loading skeleton rows
            Array.from({ length: 5 }).map((_, i) => (
              <tr key={`skeleton-${i}`} className="border-b border-border/50 animate-pulse bg-surface-alt/10">
                {columns.map((_, j) => (
                  <td key={`skeleton-td-${j}`} className="px-4 py-3">
                    <div className="h-4 bg-border/50 rounded w-3/4"></div>
                  </td>
                ))}
              </tr>
            ))
          ) : displayData.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-text-muted">
                {emptyState || 'No data available'}
              </td>
            </tr>
          ) : (
            displayData.map((row, i) => (
              <tr
                key={row.id || i}
                onClick={() => onRowClick?.(row)}
                className={clsx(
                  'border-b border-border/50 transition-colors hover:bg-surface-alt group',
                  i % 2 === 1 ? 'bg-surface-alt/20' : 'bg-surface',
                  onRowClick && 'cursor-pointer'
                )}
              >
                {columns.map((col, j) => (
                  <td key={String(col.accessor) || j} className="px-4 py-3 text-body">
                    {col.render ? col.render(row) : (row as any)[col.accessor]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
      
      {pagination && safeData.length > pageSize && !isLoading && (
        <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 border-t border-border bg-surface-alt/30 gap-3">
          <div className="text-sm text-text-sec">
            Hiển thị <span className="font-medium text-text-primary">{(currentPage - 1) * pageSize + 1}</span> đến{' '}
            <span className="font-medium text-text-primary">{Math.min(currentPage * pageSize, safeData.length)}</span> trong số{' '}
            <span className="font-medium text-text-primary">{safeData.length}</span> kết quả
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1 rounded hover:bg-surface disabled:opacity-50 disabled:cursor-not-allowed border border-transparent hover:border-border transition-colors text-text-sec focus:outline-none"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </button>
            <div className="flex gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum = i + 1;
                if (totalPages > 5) {
                   if (currentPage > 3) {
                     pageNum = currentPage - 2 + i;
                     if (pageNum > totalPages) pageNum = totalPages - 4 + i;
                   }
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={clsx(
                      "min-w-[28px] h-7 px-2 text-xs font-medium rounded transition-colors flex items-center justify-center border focus:outline-none",
                      currentPage === pageNum
                        ? "bg-brand-500 text-white border-brand-500"
                        : "bg-surface hover:bg-surface-alt text-text-primary border-border"
                    )}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1 rounded hover:bg-surface disabled:opacity-50 disabled:cursor-not-allowed border border-transparent hover:border-border transition-colors text-text-sec focus:outline-none"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
