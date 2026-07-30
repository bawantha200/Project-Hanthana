// src/services/productService.js
import api from './api';

// Cache keys for React Query
export const PRODUCT_KEYS = {
  all: ['products'],
  lists: () => [...PRODUCT_KEYS.all, 'list'],
  list: (filters) => [...PRODUCT_KEYS.lists(), { filters }],
  details: () => [...PRODUCT_KEYS.all, 'detail'],
  detail: (id) => [...PRODUCT_KEYS.details(), id],
  stats: () => [...PRODUCT_KEYS.all, 'stats'],
  active: () => [...PRODUCT_KEYS.all, 'active'],
  inactive: () => [...PRODUCT_KEYS.all, 'inactive'],
};

class ProductService {
  // Get all active products
  async getActiveProducts() {
    const response = await api.get('/products');
    return response.data;
  }

  // Get all products including inactive
  async getAllProducts() {
    const response = await api.get('/products/admin/all');
    return response.data;
  }

  // Get only inactive products
  async getInactiveProducts() {
    const response = await api.get('/products/admin/inactive');
    return response.data;
  }

  // Get single product by ID
  async getProductById(id) {
    const response = await api.get(`/products/${id}`);
    return response.data;
  }

  // Get product with inactive (admin)
  async getProductByIdWithInactive(id) {
    const response = await api.get(`/products/admin/${id}`);
    return response.data;
  }

  // Create product
  async createProduct(productData) {
    const response = await api.post('/products', productData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }

  // Update product
  async updateProduct(id, productData) {
    const response = await api.put(`/products/${id}`, productData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }

  // Deactivate product (soft delete)
  async deactivateProduct(id) {
    const response = await api.delete(`/products/${id}`);
    return response.data;
  }

  // Activate product
  async activateProduct(id) {
    const response = await api.post(`/products/${id}/activate`);
    return response.data;
  }

  // Toggle product status
  async toggleProductStatus(id) {
    const response = await api.post(`/products/${id}/toggle`);
    return response.data;
  }

  // Bulk deactivate
  async bulkDeactivate(ids) {
    const response = await api.post('/products/bulk/deactivate', { ids });
    return response.data;
  }

  // Bulk activate
  async bulkActivate(ids) {
    const response = await api.post('/products/bulk/activate', { ids });
    return response.data;
  }

  // Get statistics
  async getStats() {
    const response = await api.get('/products/stats');
    return response.data;
  }
}

export default new ProductService();