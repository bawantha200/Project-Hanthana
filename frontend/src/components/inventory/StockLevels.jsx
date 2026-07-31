// frontend/src/components/inventory/StockLevels.jsx
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Package, Plus, Edit, Trash2, AlertTriangle, RefreshCw, 
  Search, History, CheckCircle, X, Clipboard, FlaskConical, 
  RefreshCcw, ArrowLeftRight, ArrowRight, ArrowLeft, AlertCircle,
  RotateCcw, ArrowUp, ArrowDown, Layers, Box,
  CirclePlus, Power,
  Undo2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { inventoryAPI } from '../../services/api';

// ─── Query Keys ───
const QUERY_KEYS = {
  PRODUCTS: ['products'],
  TRANSACTIONS: ['transactions'],
  STOCK_SUMMARY: ['stockSummary'],
  EMPTY_BOTTLES: ['emptyBottles'],
};

// ─── Helper Functions ───
const formatCurrency = (amount) => {
  if (amount === undefined || amount === null) return 'N/A';
  return `LKR ${Number(amount).toFixed(2)}`;
};

// ─── Transaction Modal ───
const TransactionModal = ({ isOpen, onClose, transactions, isFetching }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Stock Update History</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>
        {isFetching && (
          <div className="flex justify-center py-4">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        <div className="overflow-x-auto">
          {transactions && transactions.length > 0 ? (
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">Date</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">Product</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">Type</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">Qty</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">Reason</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">Notes</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id} className="border-b border-gray-50">
                    <td className="py-3 px-4 text-xs text-gray-600">
                      {new Date(t.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 font-medium">{t.products?.name || 'Unknown'}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        t.type === 'add' ? 'bg-green-100 text-green-700' :
                        t.type === 'reduce' ? 'bg-red-100 text-red-700' :
                        t.type === 'empty_bottle_add' ? 'bg-blue-100 text-blue-700' :
                        t.type === 'empty_bottle_usage' ? 'bg-amber-100 text-amber-700' :
                        t.type === 'conversion_empty_to_stock' ? 'bg-blue-100 text-blue-700' :
                        t.type === 'conversion_stock_to_empty' ? 'bg-indigo-100 text-indigo-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {t.type === 'add' ? 'Sealed Add' :
                         t.type === 'reduce' ? 'Sealed Reduce' :
                         t.type === 'empty_bottle_add' ? 'Empty Add' :
                         t.type === 'empty_bottle_usage' ? 'Empty Used' :
                         t.type === 'conversion_empty_to_stock' ? 'Empty → Stock' :
                         t.type === 'conversion_stock_to_empty' ? 'Stock → Empty' :
                         t.type || 'Unknown'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold">{t.quantity > 0 ? `+${t.quantity}` : t.quantity}</td>
                    <td className="py-3 px-4 text-gray-600 text-xs">{t.reason || '-'}</td>
                    <td className="py-3 px-4 text-gray-600 text-xs">{t.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-8 text-gray-400">No transactions available</div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Empty to Stock Conversion Modal ───
const EmptyToStockModal = ({ isOpen, onClose, onConvert, product, isSubmitting }) => {
  const [formData, setFormData] = useState({
    quantity: 1,
    reason: 'restock',
    notes: ''
  });

  const emptyStock = product?.empty_bottle_stock || 0;
  const sealedStock = product?.stock || 0;

  if (!isOpen || !product) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const qty = Number(formData.quantity);
    if (qty <= 0) {
      toast.error('Quantity must be positive');
      return;
    }
    if (emptyStock < qty) {
      toast.error(`Insufficient empty bottles. Available: ${emptyStock}`);
      return;
    }
    onConvert({
      product_id: product.id,
      quantity: qty,
      conversion_direction: 'empty_to_stock',
      reason: formData.reason,
      notes: formData.notes
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Empty → Stock</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="font-medium text-gray-900">{product.name}</p>
            <div className="flex gap-4 mt-1 text-sm">
              <span className="text-gray-600">Sealed: <strong>{sealedStock}</strong></span>
              <span className="text-gray-600">Empty: <strong className="text-blue-700">{emptyStock}</strong></span>
            </div>
          </div>

          <div className="p-3 bg-blue-50 rounded-lg text-xs text-blue-800">
            <p className="font-medium">Convert empty bottles to sealed stock</p>
            <p className="mt-0.5">Uses empty bottles to produce sealed products</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Quantity</label>
            <input
              type="number"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
              min="1"
              max={emptyStock}
              required
            />
            <p className="text-xs text-gray-400 mt-1">Available: {emptyStock}</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Reason</label>
            <select
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
            >
              <option value="restock">Restock</option>
              <option value="correction">Correction</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes (Optional)</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
              rows="2"
              placeholder="Optional notes..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium bg-gray-100 rounded-lg hover:bg-gray-200">
              Cancel
            </button>
            <button 
              type="submit" 
              className={`px-4 py-2 text-sm font-medium text-white rounded-lg ${
                isSubmitting || emptyStock < formData.quantity
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
              disabled={isSubmitting || emptyStock < formData.quantity}
            >
              {isSubmitting ? 'Converting...' : 'Convert to Stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Stock to Empty Conversion Modal ───
const StockToEmptyModal = ({ isOpen, onClose, onConvert, product, isSubmitting }) => {
  const [formData, setFormData] = useState({
    quantity: 1,
    reason: 'correction',
    notes: ''
  });

  const emptyStock = product?.empty_bottle_stock || 0;
  const sealedStock = product?.stock || 0;

  if (!isOpen || !product) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const qty = Number(formData.quantity);
    if (qty <= 0) {
      toast.error('Quantity must be positive');
      return;
    }
    if (sealedStock < qty) {
      toast.error(`Insufficient sealed stock. Available: ${sealedStock}`);
      return;
    }
    onConvert({
      product_id: product.id,
      quantity: qty,
      conversion_direction: 'stock_to_empty',
      reason: formData.reason,
      notes: formData.notes
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Stock → Empty</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="font-medium text-gray-900">{product.name}</p>
            <div className="flex gap-4 mt-1 text-sm">
              <span className="text-gray-600">Sealed: <strong className="text-blue-700">{sealedStock}</strong></span>
              <span className="text-gray-600">Empty: <strong>{emptyStock}</strong></span>
            </div>
          </div>

          <div className="p-3 bg-amber-50 rounded-lg text-xs text-amber-800">
            <p className="font-medium">Convert sealed stock to empty bottles</p>
            <p className="mt-0.5">Reverses production / corrects inventory mistakes</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Quantity</label>
            <input
              type="number"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
              min="1"
              max={sealedStock}
              required
            />
            <p className="text-xs text-gray-400 mt-1">Available: {sealedStock}</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Reason</label>
            <select
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
            >
              <option value="correction">Correction</option>
              <option value="adjustment">Adjustment</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes (Optional)</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
              rows="2"
              placeholder="Optional notes..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium bg-gray-100 rounded-lg hover:bg-gray-200">
              Cancel
            </button>
            <button 
              type="submit" 
              className={`px-4 py-2 text-sm font-medium text-white rounded-lg ${
                isSubmitting || sealedStock < formData.quantity
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-amber-600 hover:bg-amber-700'
              }`}
              disabled={isSubmitting || sealedStock < formData.quantity}
            >
              {isSubmitting ? 'Converting...' : 'Convert to Empty'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Stock Modal ───
const StockModal = ({ isOpen, onClose, onSave, products, mode, item }) => {
  const [formData, setFormData] = useState({
    product_id: '',
    quantity: '',
    reason: 'restock',
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedProduct = products?.find(p => p.id === parseInt(formData.product_id));

  // Reset form when modal opens - FIXED with proper dependency
  useEffect(() => {
    if (isOpen && products?.length > 0) {
      setFormData({
        product_id: products[0]?.id || '',
        quantity: '',
        reason: 'restock',
        notes: ''
      });
    }
  }, [isOpen, products]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const qty = Number(formData.quantity);
    if (qty <= 0) {
      toast.error('Quantity must be positive');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await onSave({
        product_id: formData.product_id,
        quantity: qty,
        reason: formData.reason,
        notes: formData.notes
      });
      setIsSubmitting(false);
      onClose();
    } catch (error) {
      setIsSubmitting(false);
      toast.error('Failed to add stock');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Add Stock</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Product</label>
            <select
              value={formData.product_id}
              onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
              required
            >
              <option value="">Select a product...</option>
              {products?.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.type})
                </option>
              ))}
            </select>
          </div>

          {selectedProduct && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="font-medium text-gray-900">{selectedProduct.name}</p>
              <div className="flex gap-4 mt-1 text-sm">
                <span className="text-gray-600">Sealed: <strong>{selectedProduct.stock}</strong></span>
                <span className="text-gray-600">Empty: <strong className="text-blue-700">{selectedProduct.empty_bottle_stock || 0}</strong></span>
              </div>
            </div>
          )}

          <div className="p-3 bg-blue-50 rounded-lg text-xs text-blue-800">
            <p className="font-medium">Add sealed stock</p>
            <p className="mt-0.5">This will increase the sealed product stock</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Quantity to Add</label>
            <input
              type="number"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
              min="1"
              placeholder="Enter quantity"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Reason</label>
            <select
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
            >
              <option value="restock">Restock</option>
              <option value="adjustment">Adjustment</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes (Optional)</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
              rows="2"
              placeholder="Optional notes..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-4 py-2 text-sm font-medium bg-gray-100 rounded-lg hover:bg-gray-200"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className={`px-4 py-2 text-sm font-medium text-white rounded-lg ${
                isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
              }`}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Adding...' : 'Add Stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Status Toggle Modal ───
const StatusToggleModal = ({ isOpen, onClose, onConfirm, product, isSubmitting }) => {
  if (!isOpen || !product) return null;

  const isActive = product.is_active ?? true;
  const actionText = isActive ? 'disable' : 'enable';
  const titleText = isActive ? 'Disable Product' : 'Enable Product';
  const descriptionText = isActive 
    ? `This will deactivate "${product.name}". The product will no longer be available for use.`
    : `This will activate "${product.name}". The product will be available for use again.`;
  const confirmColor = isActive ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700';
  const iconBg = isActive ? 'bg-red-100' : 'bg-emerald-100';
  const iconColor = isActive ? 'text-red-600' : 'text-emerald-600';

  const handleConfirm = () => {
    onConfirm(product);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{titleText}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="flex items-center gap-4 mb-4">
          <div className={`w-12 h-12 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
            <Power size={24} className={iconColor} />
          </div>
          <div>
            <p className="font-medium text-gray-900">{product.name}</p>
            <p className="text-sm text-gray-500">{descriptionText}</p>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <button 
            type="button" 
            onClick={onClose} 
            className="px-4 py-2 text-sm font-medium bg-gray-100 rounded-lg hover:bg-gray-200"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button 
            type="button" 
            onClick={handleConfirm} 
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg ${confirmColor} ${
              isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Processing...' : isActive ? 'Disable' : 'Enable'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ───
export default function StockLevels({ products: propProducts = [], onRefresh, loading: parentLoading }) {
  const queryClient = useQueryClient();
  const isInitialMount = useRef(true);

  // ─── State ───
  const [stockModal, setStockModal] = useState({ isOpen: false, mode: 'add', item: null });
  const [conversionModal, setConversionModal] = useState({ isOpen: false, type: null, product: null });
  const [statusFilter, setStatusFilter] = useState('active');
  const [searchTerm, setSearchTerm] = useState('');
  const [showTransactions, setShowTransactions] = useState(false);
  const [localProducts, setLocalProducts] = useState([]);
  const [statusToggleModal, setStatusToggleModal] = useState({ isOpen: false, product: null });

  // ─── React Query: Fetch Products ───
  const {
    data: productsData = [],
    isLoading: productsLoading,
    isFetching: productsFetching,
    error: productsError,
    refetch: refetchProducts,
  } = useQuery({
    queryKey: QUERY_KEYS.PRODUCTS,
    queryFn: async () => {
      const response = await inventoryAPI.getProductsWithStock();
      return response.data?.products || [];
    },
    staleTime: 60000,
    gcTime: 300000,
    refetchOnWindowFocus: false,
    refetchInterval: 120000,
    placeholderData: (previousData) => previousData,
    enabled: propProducts.length === 0,
  });

  // ─── React Query: Fetch Transactions ───
  const {
    data: transactionsData = [],
    isLoading: transactionsLoading,
    isFetching: transactionsFetching,
    refetch: refetchTransactions,
  } = useQuery({
    queryKey: QUERY_KEYS.TRANSACTIONS,
    queryFn: async () => {
      const response = await inventoryAPI.getTransactions({ limit: 50 });
      return response.data?.transactions || [];
    },
    staleTime: 30000,
    gcTime: 120000,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData,
  });

  // ─── React Query: Fetch Stock Summary ───
  const {
    data: stockSummaryData = { sealed_bottles: 0, empty_bottles: 0, total: 0 },
    isLoading: summaryLoading,
    refetch: refetchSummary,
  } = useQuery({
    queryKey: QUERY_KEYS.STOCK_SUMMARY,
    queryFn: async () => {
      const response = await inventoryAPI.getStockSummary();
      return response.data?.summary || { sealed_bottles: 0, empty_bottles: 0, total: 0 };
    },
    staleTime: 60000,
    gcTime: 300000,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData,
  });

  // ─── React Query: Sync Empty Stock Mutation ───
  const syncEmptyStockMutation = useMutation({
    mutationFn: async () => {
      const response = await inventoryAPI.syncEmptyStock();
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PRODUCTS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.STOCK_SUMMARY });
      toast.success('Empty bottle stock synced');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Sync failed');
    },
  });

  // ─── React Query: Convert Stock Mutation ───
  const convertStockMutation = useMutation({
    mutationFn: async (payload) => {
      const response = await inventoryAPI.convertStock(payload);
      return response.data;
    },
    onSuccess: (data, variables) => {
      const direction = variables.conversion_direction === 'empty_to_stock' 
        ? 'Empty to Stock' 
        : 'Stock to Empty';
      toast.success(`${direction}: ${variables.quantity} units converted`);
      
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PRODUCTS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.STOCK_SUMMARY });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TRANSACTIONS });
      
      setConversionModal({ isOpen: false, type: null, product: null });
    },
    onError: (error, variables) => {
      const msg = error.response?.data?.message || error.message;
      if (msg.includes('Insufficient empty bottles')) {
        toast.error(`Insufficient empty bottles: ${msg}`);
      } else if (msg.includes('Insufficient sealed stock')) {
        toast.error(`Insufficient sealed stock: ${msg}`);
      } else {
        toast.error(msg || 'Conversion failed');
      }
    },
  });

  // ─── React Query: Add Stock Mutation ───
  const addStockMutation = useMutation({
    mutationFn: async (payload) => {
      const response = await inventoryAPI.addStock(payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PRODUCTS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.STOCK_SUMMARY });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TRANSACTIONS });
      toast.success('Stock added successfully');
      setStockModal({ isOpen: false, mode: 'add', item: null });
    },
    onError: (error) => {
      const msg = error.response?.data?.message || error.message;
      if (msg.includes('Insufficient empty bottles')) {
        toast.error(`Insufficient empty bottles: ${msg}`, { duration: 6000 });
      } else if (msg.includes('No matching empty/refill product found')) {
        toast.error(`No matching refill product found. Create one first.`, { duration: 6000 });
      } else {
        toast.error(msg || 'Failed to add stock');
      }
    },
  });

  // ─── React Query: Toggle Product Status Mutation ───
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, is_active }) => {
      const response = await inventoryAPI.toggleProductActive(id, is_active);
      return response.data;
    },
    onSuccess: (data, variables) => {
      const { id, is_active } = variables;
      const actionText = is_active ? 'enabled' : 'disabled';
      
      setLocalProducts((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, is_active: is_active } : p
        )
      );
      
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PRODUCTS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.STOCK_SUMMARY });
      
      toast.success(`Product ${actionText} successfully.`);
      setStatusToggleModal({ isOpen: false, product: null });
    },
    onError: (error, variables) => {
      const actionText = variables.is_active ? 'enable' : 'disable';
      // Revert optimistic update on error
      const { id, is_active } = variables;
      setLocalProducts((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, is_active: !is_active } : p
        )
      );
      toast.error(error.response?.data?.message || `Failed to ${actionText} product.`);
      setStatusToggleModal({ isOpen: false, product: null });
    },
  });

  // ─── Memoized Data ───
  const products = useMemo(() => {
    const source = propProducts.length > 0 ? propProducts : productsData;
    return source.map(p => ({
      ...p,
      is_active: p.is_active !== undefined ? p.is_active : true
    }));
  }, [propProducts, productsData]);

  // FIXED: Sync local products when products change - only on initial mount and when data changes
  useEffect(() => {
    // Only update if products have actually changed
    const productsString = JSON.stringify(products);
    const currentString = JSON.stringify(localProducts);
    
    if (productsString !== currentString) {
      setLocalProducts(products);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products]);

  const filteredProducts = useMemo(() => {
    return localProducts.filter((p) => {
      const matchesSearch = p.name?.toLowerCase().includes(searchTerm.toLowerCase());

      let matchesStatus = true;
      if (statusFilter === 'active') {
        matchesStatus = p.is_active !== false;
      } else if (statusFilter === 'inactive') {
        matchesStatus = p.is_active === false;
      }

      return matchesSearch && matchesStatus;
    });
  }, [localProducts, searchTerm, statusFilter]);

  const totalStock = useMemo(() => {
    return localProducts.reduce((sum, item) => sum + (item.stock || 0), 0);
  }, [localProducts]);

  const lowStockItems = useMemo(() => {
    return localProducts.filter((item) => item.status === 'low');
  }, [localProducts]);

  // ─── Handlers ───
  const handleRefresh = useCallback(async () => {
    if (propProducts.length === 0) {
      await refetchProducts();
    }
    await refetchTransactions();
    await refetchSummary();
    if (onRefresh) {
      await onRefresh();
    }
  }, [propProducts.length, refetchProducts, refetchTransactions, refetchSummary, onRefresh]);

  const handleSyncEmptyStock = () => {
    syncEmptyStockMutation.mutate();
  };

  const handleConvertStock = (payload) => {
    convertStockMutation.mutate(payload);
  };

  const handleToggleStatus = (item) => {
    setStatusToggleModal({ isOpen: true, product: item });
  };

  const handleConfirmToggleStatus = (item) => {
    const newStatus = !item.is_active;
    
    // Optimistic update
    setLocalProducts((prev) =>
      prev.map((p) =>
        p.id === item.id ? { ...p, is_active: newStatus } : p
      )
    );

    toggleStatusMutation.mutate({
      id: item.id,
      is_active: newStatus,
    });
  };

  const handleStockSave = (formData) => {
    const payload = {
      product_id: parseInt(formData.product_id),
      quantity: formData.quantity,
      reason: formData.reason,
      notes: formData.notes
    };
    addStockMutation.mutate(payload);
  };

  // ─── Loading State ───
  const isLoading = productsLoading || summaryLoading || parentLoading;

  if (isLoading && products.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading stock levels...</p>
        </div>
      </div>
    );
  }

  // ─── Error State ───
  if (productsError && propProducts.length === 0) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700">
        <h3 className="font-semibold text-lg mb-2">Error Loading Products</h3>
        <p>{productsError.message || 'Failed to load products'}</p>
        <button
          onClick={handleRefresh}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const isRefreshing = productsFetching || syncEmptyStockMutation.isPending;
  const isSubmitting = convertStockMutation.isPending || addStockMutation.isPending || toggleStatusMutation.isPending;

  return (
    <>
      <StockModal
        isOpen={stockModal.isOpen}
        onClose={() => setStockModal({ isOpen: false, mode: 'add', item: null })}
        onSave={handleStockSave}
        mode={stockModal.mode}
        item={stockModal.item}
        products={products}
      />

      <EmptyToStockModal
        isOpen={conversionModal.isOpen && conversionModal.type === 'empty_to_stock'}
        onClose={() => setConversionModal({ isOpen: false, type: null, product: null })}
        onConvert={handleConvertStock}
        product={conversionModal.product}
        isSubmitting={isSubmitting}
      />

      <StockToEmptyModal
        isOpen={conversionModal.isOpen && conversionModal.type === 'stock_to_empty'}
        onClose={() => setConversionModal({ isOpen: false, type: null, product: null })}
        onConvert={handleConvertStock}
        product={conversionModal.product}
        isSubmitting={isSubmitting}
      />

      <TransactionModal
        isOpen={showTransactions}
        onClose={() => setShowTransactions(false)}
        transactions={transactionsData}
        isFetching={transactionsFetching}
      />

      <StatusToggleModal
        isOpen={statusToggleModal.isOpen}
        onClose={() => setStatusToggleModal({ isOpen: false, product: null })}
        onConfirm={handleConfirmToggleStatus}
        product={statusToggleModal.product}
        isSubmitting={toggleStatusMutation.isPending}
      />

      <div className="space-y-6">
        {/* ─── Summary Cards ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <Package size={18} className="text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium">Total Stock</p>
                <p className="text-xl font-bold text-gray-900">{totalStock.toLocaleString()}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                <AlertTriangle size={18} className="text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium">Low Stock</p>
                <p className="text-xl font-bold text-gray-900">{lowStockItems.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                <Box size={18} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium">Sealed</p>
                <p className="text-xl font-bold text-gray-900">{stockSummaryData.sealed_bottles}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <FlaskConical size={18} className="text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium">Empty</p>
                <p className="text-xl font-bold text-gray-900">{stockSummaryData.empty_bottles}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Stock Table ─── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Stock Levels</h2>
              <p className="text-xs text-gray-400">
                {products.length} products loaded
                {isRefreshing && ' (updating...)'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {/* ─── Status Filter Tabs ─── */}
              <div className="flex bg-gray-100 p-1 rounded-lg text-xs font-medium mr-2">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1 rounded-md transition-all ${
                    statusFilter === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setStatusFilter('active')}
                  className={`px-3 py-1 rounded-md transition-all ${
                    statusFilter === 'active' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Active
                </button>
                <button
                  onClick={() => setStatusFilter('inactive')}
                  className={`px-3 py-1 rounded-md transition-all ${
                    statusFilter === 'inactive' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Inactive
                </button>
              </div>

              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg w-40 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                />
              </div>
              <button 
                onClick={() => setShowTransactions(true)} 
                className="px-3 py-1.5 bg-gray-100 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors"
              >
                <History size={14} className="inline mr-1" /> History
              </button>
              <button 
                onClick={handleSyncEmptyStock} 
                disabled={syncEmptyStockMutation.isPending} 
                className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-xs font-medium hover:bg-amber-200 disabled:opacity-50 transition-colors"
              >
                <RefreshCcw size={14} className={`inline mr-1 ${syncEmptyStockMutation.isPending ? 'animate-spin' : ''}`} /> Sync
              </button>
              <button 
                onClick={handleRefresh} 
                disabled={isRefreshing}
                className="px-3 py-1.5 bg-gray-100 rounded-lg text-xs font-medium hover:bg-gray-200 disabled:opacity-50 transition-colors"
              >
                <RefreshCw size={14} className={`inline mr-1 ${isRefreshing ? 'animate-spin' : ''}`} /> Refresh
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            {filteredProducts.length > 0 ? (
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">Product</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">Type</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">Stock</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">Empty</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">Inventory Level</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">Status</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">Price</th>
                    <th className="text-center py-3 px-4 text-xs font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredProducts.map((item) => {
                    const isLow = item.status === 'low';
                    const isRefill = item.type?.toLowerCase() === 'refill' || item.type?.toLowerCase() === 'empty';
                    const isActive = item.is_active ?? true;

                    return (
                      <tr 
                        key={item.id} 
                        className={`transition-colors ${
                          !isActive 
                            ? 'bg-gray-50/80 text-gray-400 opacity-75' 
                            : 'hover:bg-gray-50/50 text-gray-900'
                        }`}
                      >
                        <td className="py-3 px-4 font-medium">
                          <div className="flex items-center gap-2">
                            <span>{item.name}</span>
                            {!isActive && (
                              <span className="text-[10px] font-normal px-1.5 py-0.5 bg-gray-200 text-gray-600 rounded">
                                Disabled
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            isRefill ? 'bg-blue-100 text-blue-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {isRefill ? 'Refill' : 'Sealed'}
                          </span>
                        </td>

                        <td className="py-3 px-4 font-medium">{item.stock}</td>

                        <td className="py-3 px-4">{item.empty_bottle_stock || 0}</td>

                        <td className="py-3 px-4">
                          {isLow ? (
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">Low</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">OK</span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium inline-flex items-center gap-1 ${
                            isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-200'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-red-400'}`} />
                            {isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>

                        <td className="py-3 px-4">{formatCurrency(item.unit_price)}</td>

                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button 
                              onClick={() => setConversionModal({ isOpen: true, type: 'empty_to_stock', product: item })} 
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-30"
                              title="Empty to Stock"
                              disabled={isSubmitting || !isActive}
                            >
                              <CirclePlus size={14} />
                            </button>
                            <button 
                              onClick={() => setConversionModal({ isOpen: true, type: 'stock_to_empty', product: item })} 
                              className="p-1 text-amber-600 hover:bg-amber-50 rounded transition-colors disabled:opacity-30"
                              title="Stock to Empty"
                              disabled={isSubmitting || !isActive}
                            >
                              <Undo2 size={14} />
                            </button>
                            <button 
                              onClick={() => handleToggleStatus(item)} 
                              className={`p-1 rounded transition-colors ${
                                isActive ? 'text-red-500 hover:bg-red-50' : 'text-emerald-600 hover:bg-emerald-50'
                              }`}
                              title={isActive ? 'Disable Item' : 'Enable Item'}
                              disabled={toggleStatusMutation.isPending}
                            >
                              <Power size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center text-gray-400">
                <Package size={32} className="mx-auto mb-2" />
                <p>No matching products found</p>
              </div>
            )}
          </div>
        </div>

        {/* ─── Low Stock Alerts ─── */}
        {lowStockItems.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">Low Stock Alerts</h2>
              <p className="text-xs text-gray-400">{lowStockItems.length} items need restocking</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">Product</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">Stock</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">Empty</th>
                    <th className="text-center py-3 px-4 text-xs font-medium text-gray-500">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStockItems.map((item) => (
                    <tr key={item.id} className="border-b border-gray-50">
                      <td className="py-3 px-4 font-medium">{item.name}</td>
                      <td className="py-3 px-4 text-red-600 font-bold">{item.stock}</td>
                      <td className="py-3 px-4">{item.empty_bottle_stock || 0}</td>
                      <td className="py-3 px-4 text-center">
                        <button 
                          onClick={() => setConversionModal({ isOpen: true, type: 'empty_to_stock', product: item })} 
                          className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700 transition-colors"
                          disabled={isSubmitting}
                        >
                          Restock
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}