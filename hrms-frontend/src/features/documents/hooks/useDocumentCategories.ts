import { useQuery } from '@tanstack/react-query';
import { documentCategoryApi } from '../api/documentCategoryApi';
import type { DocumentCategory } from '../api/documentCategoryApi';

export const useDocumentCategories = () => {
  const { data: categories = [], isLoading, error, refetch } = useQuery({
    queryKey: ['documentCategories'],
    queryFn: documentCategoryApi.getCategories,
  });

  return {
    categories,
    isLoading,
    error: error ? (error as Error).message : null,
    refetch,
  };
};
