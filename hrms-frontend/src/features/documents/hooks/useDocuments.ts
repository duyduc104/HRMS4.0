import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { documentApi } from '../api/documentApi';

export const useDocuments = (keyword?: string, categoryId?: string | null) => {
  return useQuery({
    queryKey: ['documents', keyword, categoryId],
    queryFn: () => documentApi.getDocuments(keyword, categoryId),
  });
};

export const useCreateDocument = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: documentApi.createDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
};

export const useViewDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: documentApi.viewDocument,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
};

export const useAskAIDocument = () => {
  return useMutation({
    mutationFn: ({ id, question, history }: { id: string; question: string; history?: any[] }) => documentApi.askAIDocument(id, question, history),
  });
};

export const useDeleteDocument = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => documentApi.deleteDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
};
