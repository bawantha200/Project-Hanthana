import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export const INVENTORY_QUERY_KEY = ['inventory'];

export const useOptimizedInventory = (page = 1, limit = 20, search = '') => {
  const queryClient = useQueryClient();

  // Query with optimized settings
  const query = useQuery({
    queryKey: [...INVENTORY_QUERY_KEY, page, limit, search],
    queryFn: () => api.getInventory(page, limit, search),
    staleTime: 10000, // 10 seconds
    gcTime: 300000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchInterval: 30000, // Refetch every 30 seconds
    placeholderData: (previousData) => previousData,
    retry: 2,
  });

  // Optimistic update mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => api.updateInventoryStatus(id, status),
    
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: INVENTORY_QUERY_KEY });
      
      const previousData = queryClient.getQueryData([...INVENTORY_QUERY_KEY, page, limit, search]);
      
      if (previousData?.data) {
        const updatedData = {
          ...previousData,
          data: previousData.data.map(item =>
            item.id === id ? { ...item, status } : item
          )
        };
        queryClient.setQueryData([...INVENTORY_QUERY_KEY, page, limit, search], updatedData);
      }
      
      return { previousData };
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVENTORY_QUERY_KEY });
    },

    onError: (error, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData([...INVENTORY_QUERY_KEY, page, limit, search], context.previousData);
      }
    }
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    updateStatus: updateStatusMutation.mutate,
    isUpdating: updateStatusMutation.isPending,
    refetch: query.refetch,
    pagination: query.data?.pagination,
    fromCache: query.data?.fromCache,
  };
};