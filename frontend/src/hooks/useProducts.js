// src/hooks/useProducts.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import productService, { PRODUCT_KEYS } from '../services/productService';
import toast from 'react-hot-toast';

// Hook for fetching active products
export const useProducts = (options = {}) => {
  return useQuery({
    queryKey: PRODUCT_KEYS.active(),
    queryFn: () => productService.getActiveProducts(),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    ...options,
  });
};

// Hook for fetching all products (including inactive)
export const useAllProducts = (options = {}) => {
  return useQuery({
    queryKey: PRODUCT_KEYS.all,
    queryFn: () => productService.getAllProducts(),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    ...options,
  });
};

// Hook for fetching inactive products
export const useInactiveProducts = (options = {}) => {
  return useQuery({
    queryKey: PRODUCT_KEYS.inactive(),
    queryFn: () => productService.getInactiveProducts(),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    ...options,
  });
};

// Hook for fetching product stats
export const useProductStats = (options = {}) => {
  return useQuery({
    queryKey: PRODUCT_KEYS.stats(),
    queryFn: () => productService.getStats(),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    ...options,
  });
};

// Hook for product mutations
export const useProductMutations = () => {
  const queryClient = useQueryClient();

  // Invalidate all product queries
  const invalidateProducts = () => {
    queryClient.invalidateQueries({ queryKey: PRODUCT_KEYS.all });
  };

  // Create product
  const createProduct = useMutation({
    mutationFn: (data) => productService.createProduct(data),
    onSuccess: () => {
      toast.success('Product created successfully!');
      invalidateProducts();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create product');
    },
  });

  // Update product
  const updateProduct = useMutation({
    mutationFn: ({ id, data }) => productService.updateProduct(id, data),
    onSuccess: (data, variables) => {
      toast.success('Product updated successfully!');
      queryClient.invalidateQueries({ queryKey: PRODUCT_KEYS.detail(variables.id) });
      invalidateProducts();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update product');
    },
  });

  // Toggle product status
  const toggleProductStatus = useMutation({
    mutationFn: (id) => productService.toggleProductStatus(id),
    onSuccess: (data) => {
      const status = data.data.is_active ? 'activated' : 'deactivated';
      toast.success(`Product ${status} successfully!`);
      invalidateProducts();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to toggle product status');
    },
  });

  // Deactivate product
  const deactivateProduct = useMutation({
    mutationFn: (id) => productService.deactivateProduct(id),
    onSuccess: () => {
      toast.success('Product deactivated successfully!');
      invalidateProducts();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to deactivate product');
    },
  });

  // Activate product
  const activateProduct = useMutation({
    mutationFn: (id) => productService.activateProduct(id),
    onSuccess: () => {
      toast.success('Product activated successfully!');
      invalidateProducts();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to activate product');
    },
  });

  // Bulk deactivate
  const bulkDeactivate = useMutation({
    mutationFn: (ids) => productService.bulkDeactivate(ids),
    onSuccess: (data) => {
      toast.success(`${data.data?.length || 0} products deactivated successfully!`);
      invalidateProducts();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to bulk deactivate products');
    },
  });

  // Bulk activate
  const bulkActivate = useMutation({
    mutationFn: (ids) => productService.bulkActivate(ids),
    onSuccess: (data) => {
      toast.success(`${data.data?.length || 0} products activated successfully!`);
      invalidateProducts();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to bulk activate products');
    },
  });

  return {
    createProduct,
    updateProduct,
    toggleProductStatus,
    deactivateProduct,
    activateProduct,
    bulkDeactivate,
    bulkActivate,
    invalidateProducts,
  };
};