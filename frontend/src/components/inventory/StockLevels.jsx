// frontend/src/components/inventory/StockLevels.jsx
import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  Package, Plus, Edit, Trash2, AlertTriangle, RefreshCw, 
  Search, History, CheckCircle, X, Clipboard, FlaskConical, 
  RefreshCcw, ArrowLeftRight, ArrowRight, ArrowLeft, AlertCircle,
  RotateCcw, ArrowUp, ArrowDown, Layers, Box,
  CirclePlus,
  Undo2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { inventoryAPI } from '../../services/api';

const formatCurrency = (amount) => {
  if (amount === undefined || amount === null) return 'N/A';
  return `LKR ${Number(amount).toFixed(2)}`;
};

// Transaction Modal
const TransactionModal = ({ isOpen, onClose, transactions }) => {
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

// Empty to Stock Conversion Modal
const EmptyToStockModal = ({ isOpen, onClose, onConvert, product }) => {
  const [formData, setFormData] = useState({
    quantity: 1,
    reason: 'production',
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setIsSubmitting(false);
      setFormData({ quantity: 1, reason: 'production', notes: '' });
    }
  }, [isOpen]);

  if (!isOpen || !product) return null;

  const emptyStock = product.empty_bottle_stock || 0;
  const sealedStock = product.stock || 0;

  const handleSubmit = async (e) => {
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

    setIsSubmitting(true);
    try {
      await onConvert({
        product_id: product.id,
        quantity: qty,
        conversion_direction: 'empty_to_stock',
        reason: formData.reason,
        notes: formData.notes
      });
      onClose();
    } catch (error) {
      // Error already handled by parent
    } finally {
      setIsSubmitting(false);
    }
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

// Stock to Empty Conversion Modal
const StockToEmptyModal = ({ isOpen, onClose, onConvert, product }) => {
  const [formData, setFormData] = useState({
    quantity: 1,
    reason: 'correction',
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setIsSubmitting(false);
      setFormData({ quantity: 1, reason: 'correction', notes: '' });
    }
  }, [isOpen]);

  if (!isOpen || !product) return null;

  const emptyStock = product.empty_bottle_stock || 0;
  const sealedStock = product.stock || 0;

  const handleSubmit = async (e) => {
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

    setIsSubmitting(true);
    try {
      await onConvert({
        product_id: product.id,
        quantity: qty,
        conversion_direction: 'stock_to_empty',
        reason: formData.reason,
        notes: formData.notes
      });
      onClose();
    } catch (error) {
      // Error already handled by parent
    } finally {
      setIsSubmitting(false);
    }
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

// Stock Modal (Add/Edit/Delete)
const StockModal = ({ isOpen, onClose, onSave, onDelete, mode, item, products }) => {
  const [formData, setFormData] = useState({
    product_id: '',
    quantity: '',
    reason: 'restock',
    notes: ''
  });

  const selectedProduct = products?.find(p => p.id === parseInt(formData.product_id));
  const isRefill = selectedProduct?.type?.toLowerCase() === 'refill' || 
                   selectedProduct?.type?.toLowerCase() === 'empty';
  const currentStock = selectedProduct?.stock ?? 0;
  const emptyStock = selectedProduct?.empty_bottle_stock ?? 0;
  const isInsufficient = isRefill ? false : emptyStock < formData.quantity;

  useEffect(() => {
    if (mode === 'edit' && item) {
      setFormData({
        product_id: item.id || '',
        quantity: item.stock || 0,
        reason: 'adjustment',
        notes: ''
      });
    } else if (mode === 'add' && products?.length > 0) {
      setFormData({
        product_id: products[0]?.id || '',
        quantity: 1,
        reason: 'restock',
        notes: ''
      });
    }
  }, [mode, item, products]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.quantity <= 0) {
      toast.error('Quantity must be positive');
      return;
    }
    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {mode === 'add' ? 'Add Stock' : mode === 'edit' ? 'Edit Stock' : 'Delete Stock'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {mode === 'delete' ? (
          <div className="space-y-4">
            <p className="text-gray-600">Delete stock for <strong>{item?.name}</strong>?</p>
            <div className="flex justify-end gap-3">
              <button onClick={onClose} className="px-4 py-2 text-sm font-medium bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
              <button onClick={() => onDelete(item)} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700">Delete</button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Product</label>
              <select
                value={formData.product_id}
                onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
                required
                disabled={mode === 'edit'}
              >
                {products?.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.type}) - Stock: {p.stock} | Empty: {p.empty_bottle_stock || 0}
                  </option>
                ))}
              </select>
            </div>

            {selectedProduct && (
              <div className={`p-3 rounded-lg text-xs ${isRefill ? 'bg-blue-50' : 'bg-blue-50'}`}>
                <p className="font-medium">{isRefill ? 'Refill / Empty Bottle' : 'Sealed Bottle'}</p>
                {isRefill ? (
                  <p className="text-gray-600">Adding will increase empty bottle stock</p>
                ) : (
                  <p className="text-gray-600">Adding will increase sealed stock and deduct empty bottles</p>
                )}
              </div>
            )}

            {selectedProduct && (
              <div className="grid grid-cols-2 gap-2 p-3 bg-gray-50 rounded-lg text-sm">
                <div>
                  <span className="text-gray-600">Current Stock:</span>
                  <span className="font-semibold block">{currentStock}</span>
                </div>
                {!isRefill && (
                  <div>
                    <span className="text-gray-600">Empty Bottles:</span>
                    <span className={`font-semibold block ${isInsufficient ? 'text-red-600' : 'text-green-600'}`}>
                      {emptyStock}
                      {isInsufficient && ' Insufficient!'}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Quantity</label>
              <input
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                className={`w-full px-3 py-2 text-sm border rounded-lg ${isInsufficient ? 'border-red-400 bg-red-50' : 'border-gray-200'}`}
                min="1"
                required
              />
              {isInsufficient && (
                <p className="text-xs text-red-600 mt-1">Not enough empty bottles! Available: {emptyStock}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Reason</label>
              <select
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
              >
                {isRefill ? (
                  <>
                    <option value="restock">Restock Empty Bottles</option>
                    <option value="adjustment">Adjustment</option>
                  </>
                ) : (
                  <>
                    <option value="restock">Restock Sealed</option>
                    <option value="adjustment">Adjustment</option>
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
                rows="2"
                placeholder="Optional notes..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
              <button 
                type="submit" 
                className={`px-4 py-2 text-sm font-medium text-white rounded-lg ${isInsufficient ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                disabled={isInsufficient}
              >
                {mode === 'add' ? (isRefill ? 'Add Empty Bottles' : 'Add Sealed Stock') : 'Update Stock'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default function StockLevels({ products = [], onRefresh, loading }) {
  const [stockModal, setStockModal] = useState({ isOpen: false, mode: 'add', item: null });
  const [conversionModal, setConversionModal] = useState({ isOpen: false, type: null, product: null });
  const [searchTerm, setSearchTerm] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [showTransactions, setShowTransactions] = useState(false);
  const [stockSummary, setStockSummary] = useState({ sealed_bottles: 0, empty_bottles: 0, total: 0 });
  const [syncing, setSyncing] = useState(false);
  const [localProducts, setLocalProducts] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Update local products when prop changes
  useEffect(() => {
    if (Array.isArray(products)) {
      setLocalProducts(products);
    } else {
      setLocalProducts([]);
    }
  }, [products]);

  const fetchAdditionalData = useCallback(async () => {
    try {
      const [txnRes, summaryRes] = await Promise.all([
        inventoryAPI.getTransactions({ limit: 50 }),
        inventoryAPI.getStockSummary()
      ]);
      setTransactions(txnRes.data?.transactions || []);
      setStockSummary(summaryRes.data?.summary || { sealed_bottles: 0, empty_bottles: 0, total: 0 });
    } catch (error) {
      console.error('Failed to fetch additional data:', error);
    }
  }, []);

  useEffect(() => {
    fetchAdditionalData();
  }, [fetchAdditionalData]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await fetchAdditionalData();
      if (onRefresh) {
        await onRefresh();
      }
      toast.success('Data refreshed');
    } catch (error) {
      console.error('Refresh failed:', error);
      toast.error('Refresh failed');
    } finally {
      setIsRefreshing(false);
    }
  }, [onRefresh, fetchAdditionalData]);

  const handleSyncEmptyStock = async () => {
    try {
      setSyncing(true);
      await inventoryAPI.syncEmptyStock();
      // toast.success('Empty bottle stock synced');
      await handleRefresh();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  // Handle stock conversion (both directions)
  const handleConvertStock = async (payload) => {
    try {
      const response = await inventoryAPI.convertStock(payload);
      if (response.data?.success) {
        const direction = payload.conversion_direction === 'empty_to_stock' 
          ? 'Empty to Stock' 
          : 'Stock to Empty';
        toast.success(`${direction}: ${payload.quantity} units converted`);
        setConversionModal({ isOpen: false, type: null, product: null });
        await handleRefresh();
      } else {
        throw new Error(response.data?.message || 'Conversion failed');
      }
    } catch (error) {
      const msg = error.response?.data?.message || error.message;
      if (msg.includes('Insufficient empty bottles')) {
        toast.error(`Insufficient empty bottles: ${msg}`);
      } else if (msg.includes('Insufficient sealed stock')) {
        toast.error(`Insufficient sealed stock: ${msg}`);
      } else {
        toast.error(msg || 'Conversion failed');
      }
      throw error;
    }
  };

  const handleStockSave = async (formData) => {
    try {
      const payload = {
        product_id: parseInt(formData.product_id),
        quantity: formData.quantity,
        reason: formData.reason,
        notes: formData.notes
      };

      let response;
      if (stockModal.mode === 'add') {
        response = await inventoryAPI.addStock(payload);
      } else {
        response = await inventoryAPI.updateStock(formData.product_id, payload);
      }

      if (response.data?.success) {
        toast.success(response.data.message || 'Stock updated');
        setStockModal({ isOpen: false, mode: 'add', item: null });
        await handleRefresh();
      } else {
        throw new Error(response.data?.message || 'Failed to update stock');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      if (msg.includes('Insufficient empty bottles')) {
        toast.error(`Insufficient empty bottles: ${msg}`, { duration: 6000 });
      } else if (msg.includes('No matching empty/refill product found')) {
        toast.error(`No matching refill product found. Create one first.`, { duration: 6000 });
      } else {
        toast.error(msg || 'Failed to update stock');
      }
    }
  };

  const handleStockDelete = async (item) => {
    try {
      const response = await inventoryAPI.deleteStock(item.id);
      if (response.data?.success) {
        toast.success('Stock deleted');
        setStockModal({ isOpen: false, mode: 'add', item: null });
        await handleRefresh();
      } else {
        throw new Error(response.data?.message || 'Delete failed');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  const productList = Array.isArray(localProducts) ? localProducts : [];
  const totalStock = productList.reduce((sum, item) => sum + (item.stock || 0), 0);
  const lowStockItems = productList.filter((item) => item.status === 'low');
  const filteredProducts = productList.filter(p => 
    p.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (productList.length === 0 && !loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
        <Package size={48} className="mx-auto text-gray-300 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Products Found</h3>
        <p className="text-gray-500">Add products to start tracking inventory.</p>
        <button
          onClick={handleRefresh}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Refresh
        </button>
      </div>
    );
  }

  return (
    <>
      <StockModal
        isOpen={stockModal.isOpen}
        onClose={() => setStockModal({ isOpen: false, mode: 'add', item: null })}
        onSave={handleStockSave}
        onDelete={handleStockDelete}
        mode={stockModal.mode}
        item={stockModal.item}
        products={productList}
      />

      <EmptyToStockModal
        isOpen={conversionModal.isOpen && conversionModal.type === 'empty_to_stock'}
        onClose={() => setConversionModal({ isOpen: false, type: null, product: null })}
        onConvert={handleConvertStock}
        product={conversionModal.product}
      />

      <StockToEmptyModal
        isOpen={conversionModal.isOpen && conversionModal.type === 'stock_to_empty'}
        onClose={() => setConversionModal({ isOpen: false, type: null, product: null })}
        onConvert={handleConvertStock}
        product={conversionModal.product}
      />

      <TransactionModal
        isOpen={showTransactions}
        onClose={() => setShowTransactions(false)}
        transactions={transactions}
      />

      <div className="space-y-6">
        {/* Summary Cards */}
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
                <p className="text-xl font-bold text-gray-900">{stockSummary.sealed_bottles}</p>
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
                <p className="text-xl font-bold text-gray-900">{stockSummary.empty_bottles}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stock Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Stock Levels</h2>
              <p className="text-xs text-gray-400">{productList.length} products loaded</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg w-40"
                />
              </div>
              <button onClick={() => setShowTransactions(true)} className="px-3 py-1.5 bg-gray-100 rounded-lg text-xs font-medium hover:bg-gray-200">
                <History size={14} className="inline mr-1" /> History
              </button>
              <button onClick={handleSyncEmptyStock} disabled={syncing} className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-xs font-medium hover:bg-amber-200 disabled:opacity-50">
                <RefreshCcw size={14} className={`inline mr-1 ${syncing ? 'animate-spin' : ''}`} /> Sync
              </button>
              {/* <button onClick={() => setStockModal({ isOpen: true, mode: 'add', item: null })} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700">
                <Plus size={14} className="inline mr-1" /> Add
              </button> */}
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
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">Status</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">Price</th>
                    <th className="text-center py-3 px-4 text-xs font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((item) => {
                    const isLow = item.status === 'low';
                    const isRefill = item.type?.toLowerCase() === 'refill' || item.type?.toLowerCase() === 'empty';
                    
                    return (
                      <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="py-3 px-4 font-medium text-gray-900">{item.name}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${isRefill ? 'bg-blue-100 text-blue-700' : 'bg-blue-100 text-blue-700'}`}>
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
                        <td className="py-3 px-4">{formatCurrency(item.unit_price)}</td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button 
                              onClick={() => setConversionModal({ isOpen: true, type: 'empty_to_stock', product: item })} 
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                              title="Empty to Stock"
                            >
                              <CirclePlus size={14} />
                            </button>
                            <button 
                              onClick={() => setConversionModal({ isOpen: true, type: 'stock_to_empty', product: item })} 
                              className="p-1 text-amber-600 hover:bg-amber-50 rounded"
                              title="Stock to Empty"
                            >
                              <Undo2 size={14} />
                            </button>
                            {/* <button 
                              onClick={() => setStockModal({ isOpen: true, mode: 'edit', item })} 
                              className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                              title="Edit"
                            >
                              <Edit size={14} />
                            </button> */}
                            {/* <button 
                              onClick={() => setStockModal({ isOpen: true, mode: 'delete', item })} 
                              className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                              title="Delete"
                            >
                              <Trash2 size={14} />
                            </button> */}
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

        {/* Low Stock Alerts */}
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
                          className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700 mr-1"
                        >
                          <ArrowRight size={12} className="inline mr-1" /> Convert
                        </button>
                        <button 
                          onClick={() => setStockModal({ isOpen: true, mode: 'edit', item })} 
                          className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700"
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