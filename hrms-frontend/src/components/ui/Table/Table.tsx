import React, { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Pagination } from '../Pagination/Pagination';

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
  pageSizeOptions?: number[];
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
  pageSizeOptions = [5, 10, 20, 50],
  ...props
}: TableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);
  const [currentPageSize, setCurrentPageSize] = useState(pageSize);

  useEffect(() => {
    setCurrentPageSize(pageSize);
  }, [pageSize]);

  // Reset page when data changes
  useEffect(() => {
    setCurrentPage(1);
  }, [data]);

  const safeData = Array.isArray(data) ? data : [];
  const displayData = pagination && !isLoading
    ? safeData.slice((currentPage - 1) * currentPageSize, currentPage * currentPageSize)
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
      
      {pagination && safeData.length > 0 && !isLoading && (
        <Pagination
          currentPage={currentPage}
          totalItems={safeData.length}
          pageSize={currentPageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setCurrentPageSize}
          pageSizeOptions={pageSizeOptions}
        />
      )}
    </div>
  );
}
