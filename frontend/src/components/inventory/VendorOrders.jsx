// frontend/src/components/inventory/VendorOrders.jsx
import { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ShoppingCart, Plus, RefreshCw, Truck, Package, 
  CircleDollarSign, Edit, X, AlertTriangle, Search,
  Filter, ChevronDown, FileText, Trash2, ChevronUp,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import { inventoryAPI } from '../../services/api';
import { 
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  Legend
} from 'recharts';

// ─── Query Keys ───
const QUERY_KEYS = {
  VENDOR_ORDERS: ['vendorOrders'],
  VENDOR_SUMMARY: ['vendorSummary'],
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d'];

// ─── Vendor Order Modal ───
const VendorOrderModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  mode, 
  item, 
  vendors = [], 
  products = [],
  isSubmitting 
}) => {
  const [formData, setFormData] = useState({
    vendor_id: '',
    product_id: '',
    order_type: 'bottle',
    quantity: 1,
    unit_price: 0,
    order_date: new Date().toISOString().split('T')[0],
    delivery_date: '',
    status: 'pending',
    notes: ''
  });

  // Reset form when modal opens or mode changes
  useState(() => {
    if (isOpen) {
      if (mode === 'edit' && item) {
        setFormData({
          vendor_id: item.vendor_id || '',
          product_id: item.product_id || '',
          order_type: item.order_type || 'bottle',
          quantity: item.quantity || 1,
          unit_price: item.unit_price || 0,
          order_date: item.order_date || new Date().toISOString().split('T')[0],
          delivery_date: item.delivery_date || '',
          status: item.status || 'pending',
          notes: item.notes || ''
        });
      } else {
        setFormData({
          vendor_id: vendors?.[0]?.id || '',
          product_id: products?.[0]?.id || '',
          order_type: 'bottle',
          quantity: 1,
          unit_price: 0,
          order_date: new Date().toISOString().split('T')[0],
          delivery_date: '',
          status: 'pending',
          notes: ''
        });
      }
    }
  }, [isOpen, mode, item, vendors, products]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.quantity <= 0) {
      toast.error('Quantity must be greater than 0');
      return;
    }
    if (formData.unit_price < 0) {
      toast.error('Unit price must be valid');
      return;
    }
    onSave(formData);
  };

  if (!isOpen) return null;

  const total = formData.quantity * formData.unit_price;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-2xl shadow-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
              <ShoppingCart size={18} className="text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              {mode === 'add' ? 'New Vendor Order' : 'Update Vendor Order'}
            </h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Vendor *</label>
              <select
                value={formData.vendor_id}
                onChange={(e) => setFormData({ ...formData, vendor_id: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                required
              >
                <option value="">Select vendor...</option>
                {vendors?.map(v => (
                  <option key={v.id} value={v.id}>{v.vendor_name || v.name || 'Unknown Vendor'}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Product *</label>
              <select
                value={formData.product_id}
                onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                required
              >
                <option value="">Select product...</option>
                {products?.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.type})</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Order Type</label>
            <select
              value={formData.order_type}
              onChange={(e) => setFormData({ ...formData, order_type: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
              required
            >
              <option value="bottle">Bottle (Affects Stock)</option>
              <option value="other">Other (Labels, Polythene, etc.)</option>
            </select>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Quantity *</label>
              <input
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                min="1"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Unit Price (LKR)</label>
              <input
                type="number"
                value={formData.unit_price}
                onChange={(e) => setFormData({ ...formData, unit_price: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                min="0"
                step="0.01"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Total</label>
              <div className="w-full px-3 py-2 text-sm font-semibold text-blue-600 bg-blue-50 rounded-lg border border-blue-100">
                LKR {total.toFixed(2)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Order Date</label>
              <input
                type="date"
                value={formData.order_date}
                onChange={(e) => setFormData({ ...formData, order_date: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Expected Delivery Date</label>
              <input
                type="date"
                value={formData.delivery_date}
                onChange={(e) => setFormData({ ...formData, delivery_date: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
            >
              <option value="pending">Pending</option>
              <option value="ordered">Ordered</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
              rows="3"
              placeholder="Additional notes about this order..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              type="submit" 
              disabled={isSubmitting}
              className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors shadow-sm ${
                isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isSubmitting ? 'Saving...' : (mode === 'add' ? 'Place Order' : 'Update Order')}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

// ─── Delete Confirmation Modal ───
const DeleteModal = ({ isOpen, onClose, onConfirm, order, isDeleting }) => {
  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">Delete Order</h3>
            <p className="text-sm text-gray-500 mt-1">
              Are you sure you want to delete this order? This action cannot be undone.
              {order && (
                <span className="block mt-1 text-gray-700">
                  <strong>Vendor:</strong> {order.vendors?.vendor_name || 'Unknown'} - 
                  <strong> Product:</strong> {order.products?.name || 'Unknown'}
                </span>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onConfirm}
            disabled={isDeleting}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors shadow-sm ${
              isDeleting ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {isDeleting ? 'Deleting...' : 'Delete Order'}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─── Status Badge Component ───
const StatusBadge = ({ status }) => {
  const styles = {
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    ordered: 'bg-blue-50 text-blue-700 border-blue-200',
    shipped: 'bg-purple-50 text-purple-700 border-purple-200',
    delivered: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    cancelled: 'bg-rose-50 text-rose-700 border-rose-200'
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status] || styles.pending}`}>
      {status?.charAt(0).toUpperCase() + status?.slice(1) || 'Pending'}
    </span>
  );
};

// ─── Pagination Component ───
const Pagination = ({ currentPage, totalPages, onPageChange, totalItems, itemsPerPage }) => {
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      
      if (currentPage > 3) {
        pages.push('...');
      }
      
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) {
        if (i !== 1 && i !== totalPages) {
          pages.push(i);
        }
      }
      
      if (currentPage < totalPages - 2) {
        pages.push('...');
      }
      
      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  if (totalPages <= 1) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-gray-100">
      <div className="text-xs text-gray-500 order-2 sm:order-1">
        Showing <span className="font-medium text-gray-700">{((currentPage - 1) * itemsPerPage) + 1}</span> to{' '}
        <span className="font-medium text-gray-700">
          {Math.min(currentPage * itemsPerPage, totalItems)}
        </span>{' '}
        of <span className="font-medium text-gray-700">{totalItems}</span> orders
      </div>
      
      <div className="flex items-center gap-1 order-1 sm:order-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
        
        {getPageNumbers().map((page, index) => (
          <button
            key={index}
            onClick={() => typeof page === 'number' && onPageChange(page)}
            className={`min-w-[32px] h-8 px-2 rounded-lg text-sm font-medium transition-colors ${
              page === currentPage
                ? 'bg-blue-600 text-white'
                : page === '...'
                ? 'text-gray-400 cursor-default'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
            disabled={page === '...'}
          >
            {page}
          </button>
        ))}
        
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};

// ─── Main Component ───
export default function VendorOrders({ vendors = [], products = [], onRefresh, loading: parentLoading }) {
  const queryClient = useQueryClient();

  // ─── State ───
  const [modalState, setModalState] = useState({ isOpen: false, mode: 'add', item: null });
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, order: null });
  const [filters, setFilters] = useState({
    vendorId: '',
    productId: '',
    status: '',
    search: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // ─── React Query: Fetch Vendor Orders ───
  const {
    data: ordersData = [],
    isLoading: ordersLoading,
    isFetching: ordersFetching,
    error: ordersError,
    refetch: refetchOrders,
  } = useQuery({
    queryKey: [...QUERY_KEYS.VENDOR_ORDERS, filters],
    queryFn: async () => {
      const params = {};
      if (filters.vendorId) params.vendorId = filters.vendorId;
      if (filters.productId) params.productId = filters.productId;
      if (filters.status) params.status = filters.status;
      if (filters.search) params.search = filters.search;
      
      const response = await inventoryAPI.getVendorOrders(params);
      return response.data?.orders || [];
    },
    staleTime: 30000,
    gcTime: 120000,
    refetchOnWindowFocus: false,
    refetchInterval: 60000,
    placeholderData: (previousData) => previousData,
  });

  // ─── React Query: Fetch Vendor Summary ───
  const {
    data: summaryData = [],
    isLoading: summaryLoading,
    refetch: refetchSummary,
  } = useQuery({
    queryKey: QUERY_KEYS.VENDOR_SUMMARY,
    queryFn: async () => {
      const response = await inventoryAPI.getVendorPurchaseSummary();
      return response.data?.summary || [];
    },
    staleTime: 120000,
    gcTime: 300000,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData,
  });

  // ─── React Query: Create Vendor Order Mutation ───
  const createOrderMutation = useMutation({
    mutationFn: async (payload) => {
      const response = await inventoryAPI.createVendorOrder(payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.VENDOR_ORDERS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.VENDOR_SUMMARY });
      toast.success('Vendor order placed successfully!');
      setModalState({ isOpen: false, mode: 'add', item: null });
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to place vendor order');
    },
  });

  // ─── React Query: Update Vendor Order Mutation ───
  const updateOrderMutation = useMutation({
    mutationFn: async ({ id, payload }) => {
      const response = await inventoryAPI.updateVendorOrder(id, payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.VENDOR_ORDERS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.VENDOR_SUMMARY });
      toast.success('Vendor order updated successfully!');
      setModalState({ isOpen: false, mode: 'add', item: null });
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to update vendor order');
    },
  });

  // ─── React Query: Delete Vendor Order Mutation ───
  const deleteOrderMutation = useMutation({
    mutationFn: async (id) => {
      const response = await inventoryAPI.deleteVendorOrder(id);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.VENDOR_ORDERS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.VENDOR_SUMMARY });
      toast.success('Order deleted successfully!');
      setDeleteModal({ isOpen: false, order: null });
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to delete order');
    },
  });

  // ─── Memoized Data ───
  const totalItems = useMemo(() => ordersData.length, [ordersData]);
  
  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return ordersData.slice(startIndex, endIndex);
  }, [ordersData, currentPage, itemsPerPage]);

  const totalSpent = useMemo(() => {
    return summaryData.reduce((sum, v) => sum + (v.total_spent || 0), 0);
  }, [summaryData]);

  const totalOrders = useMemo(() => ordersData.length, [ordersData]);

  const deliveredOrders = useMemo(() => {
    return ordersData.filter(o => o.status === 'delivered').length;
  }, [ordersData]);

  const filteredVendorTotal = useMemo(() => {
    if (!filters.vendorId) return null;
    
    const vendorOrders = ordersData.filter(order => 
      order.vendor_id === parseInt(filters.vendorId)
    );
    
    const total = vendorOrders.reduce((sum, order) => sum + (order.total || 0), 0);
    const orderCount = vendorOrders.length;
    const vendorName = vendorOrders[0]?.vendors?.vendor_name || 'Unknown Vendor';
    
    return { vendorName, total, orderCount };
  }, [ordersData, filters.vendorId]);

  const chartData = useMemo(() => {
    return summaryData.map(v => ({
      name: v.vendor_name || 'Unknown',
      spent: v.total_spent || 0,
      bottles: v.total_bottles || 0,
      other: v.total_other || 0
    }));
  }, [summaryData]);

  // ─── Handlers ───
  const handleRefresh = useCallback(() => {
    refetchOrders();
    refetchSummary();
    if (onRefresh) onRefresh();
  }, [refetchOrders, refetchSummary, onRefresh]);

  const handleSave = useCallback((formData) => {
    const payload = {
      vendor_id: parseInt(formData.vendor_id),
      product_id: parseInt(formData.product_id),
      order_type: formData.order_type,
      quantity: formData.quantity,
      unit_price: formData.unit_price,
      order_date: formData.order_date,
      delivery_date: formData.delivery_date || null,
      status: formData.status,
      notes: formData.notes || null
    };

    if (modalState.mode === 'add') {
      createOrderMutation.mutate(payload);
    } else {
      updateOrderMutation.mutate({ id: modalState.item?.id, payload });
    }
  }, [modalState, createOrderMutation, updateOrderMutation]);

  const handleDelete = useCallback(() => {
    if (!deleteModal.order) return;
    deleteOrderMutation.mutate(deleteModal.order.id);
  }, [deleteModal.order, deleteOrderMutation]);

  const handleFilterChange = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({ vendorId: '', productId: '', status: '', search: '' });
    setCurrentPage(1);
  }, []);

  const handlePageChange = useCallback((page) => {
    if (page >= 1 && page <= Math.ceil(totalItems / itemsPerPage)) {
      setCurrentPage(page);
    }
  }, [totalItems, itemsPerPage]);

  // ─── Loading State ───
  const isLoading = ordersLoading || summaryLoading || parentLoading;

  if (isLoading && ordersData.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading vendor orders...</p>
        </div>
      </div>
    );
  }

  // ─── Error State ───
  if (ordersError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700">
        <h3 className="font-semibold text-lg mb-2">Error Loading Orders</h3>
        <p>{ordersError.message || 'Failed to load vendor orders'}</p>
        <button
          onClick={handleRefresh}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const isRefreshing = ordersFetching;
  const isSubmitting = createOrderMutation.isPending || updateOrderMutation.isPending;
  const isDeleting = deleteOrderMutation.isPending;

  return (
    <>
      <VendorOrderModal
        isOpen={modalState.isOpen}
        onClose={() => setModalState({ isOpen: false, mode: 'add', item: null })}
        onSave={handleSave}
        mode={modalState.mode}
        item={modalState.item}
        vendors={vendors}
        products={products}
        isSubmitting={isSubmitting}
      />

      <DeleteModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, order: null })}
        onConfirm={handleDelete}
        order={deleteModal.order}
        isDeleting={isDeleting}
      />

      <div className="space-y-6">
        {/* ─── Summary Cards ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <ShoppingCart size={18} className="text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium">Total Orders</p>
                <p className="text-xl font-bold text-gray-900">{totalOrders}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                <CircleDollarSign size={18} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium">Total Spent</p>
                <p className="text-xl font-bold text-gray-900">LKR {totalSpent.toFixed(2)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                <Truck size={18} className="text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium">Vendors</p>
                <p className="text-xl font-bold text-gray-900">{summaryData.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                <FileText size={18} className="text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium">Delivered</p>
                <p className="text-xl font-bold text-gray-900">{deliveredOrders}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Vendor Total Card ─── */}
        {filteredVendorTotal && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 p-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-600/10 flex items-center justify-center">
                  <Truck size={24} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Vendor Summary</p>
                  <h3 className="text-lg font-bold text-gray-900">{filteredVendorTotal.vendorName}</h3>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-6">
                <div>
                  <p className="text-xs text-gray-500">Total Orders</p>
                  <p className="text-lg font-bold text-gray-900">{filteredVendorTotal.orderCount}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Total Spent</p>
                  <p className="text-lg font-bold text-blue-600">LKR {filteredVendorTotal.total.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── Charts ─── */}
        {chartData.length > 0 && !filters.vendorId && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Vendor Purchase Summary</h2>
                <p className="text-xs text-gray-400 mt-0.5">Total spend and items purchased per vendor</p>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <p className="text-xs text-gray-400 mb-2 text-center">Spend by Vendor</p>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={chartData}
                      dataKey="spent"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(value) => `LKR ${Number(value).toFixed(2)}`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-2 text-center">Items by Vendor</p>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} />
                    <RechartsTooltip />
                    <Legend />
                    <Bar dataKey="bottles" name="Bottles" fill="#0088FE" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="other" name="Other Items" fill="#FF8042" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* ─── Orders Table ─── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Vendor Orders</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                All orders placed with vendors
                {isRefreshing && ' (updating...)'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-none">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search orders..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all w-full sm:w-48"
                />
              </div>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`p-1.5 rounded-lg transition-colors ${
                  showFilters || filters.vendorId || filters.productId || filters.status
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Filter size={18} />
              </button>

              <button 
                onClick={handleRefresh} 
                disabled={isRefreshing}
                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
              >
                <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
              </button>

              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setModalState({ isOpen: true, mode: 'add', item: null })}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors shadow-sm whitespace-nowrap"
              >
                <Plus size={14} />
                Place Order
              </motion.button>
            </div>
          </div>

          {/* ─── Filters ─── */}
          {showFilters && (
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex flex-wrap gap-4 items-end">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Vendor</label>
                <select
                  value={filters.vendorId}
                  onChange={(e) => handleFilterChange('vendorId', e.target.value)}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-white"
                >
                  <option value="">All Vendors</option>
                  {vendors.map(v => (
                    <option key={v.id} value={v.id}>{v.vendor_name || v.name || 'Unknown Vendor'}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Product</label>
                <select
                  value={filters.productId}
                  onChange={(e) => handleFilterChange('productId', e.target.value)}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-white"
                >
                  <option value="">All Products</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-white"
                >
                  <option value="">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="ordered">Ordered</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <button
                onClick={clearFilters}
                className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Clear Filters
              </button>
            </div>
          )}

          <div className="overflow-x-auto">
            {paginatedOrders.length > 0 ? (
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Order Date</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedOrders.map((order) => (
                    <tr key={order.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="py-3 px-4 font-medium text-gray-900">
                        {order.vendors?.vendor_name || 'Unknown Vendor'}
                      </td>
                      <td className="py-3 px-4 text-gray-700">
                        {order.products?.name || order.product_id || 'Unknown Product'}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          order.order_type === 'bottle' ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-700'
                        }`}>
                          {order.order_type === 'bottle' ? 'Bottle' : 'Other'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-700">{order.quantity}</td>
                      <td className="py-3 px-4 text-gray-500">LKR {Number(order.unit_price).toFixed(2)}</td>
                      <td className="py-3 px-4 font-semibold text-blue-600">LKR {Number(order.total).toFixed(2)}</td>
                      <td className="py-3 px-4 text-gray-500 text-xs">
                        {order.order_date ? new Date(order.order_date).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setModalState({ isOpen: true, mode: 'edit', item: order })}
                            className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Edit Order"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => setDeleteModal({ isOpen: true, order })}
                            className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Delete Order"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-12 text-center">
                <ShoppingCart size={40} className="mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500 font-medium">No vendor orders found</p>
                <p className="text-xs text-gray-400 mt-1">
                  {filters.vendorId || filters.productId || filters.status || filters.search
                    ? 'Try adjusting your filters'
                    : 'Place your first vendor order using the "Place Order" button'}
                </p>
              </div>
            )}
          </div>

          {/* ─── Pagination ─── */}
          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(totalItems / itemsPerPage)}
            onPageChange={handlePageChange}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
          />
        </div>
      </div>
    </>
  );
}