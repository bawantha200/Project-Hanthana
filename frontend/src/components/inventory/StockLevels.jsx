// frontend/src/components/inventory/StockLevels.jsx
import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  Package, Plus, Edit, Trash2, AlertTriangle, RefreshCw, 
  Search, History, CheckCircle, X, Clipboard, FlaskConical, RefreshCcw
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
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {t.type === 'add' ? 'Sealed Add' :
                         t.type === 'reduce' ? 'Sealed Reduce' :
                         t.type === 'empty_bottle_add' ? 'Empty Add' :
                         t.type === 'empty_bottle_usage' ? 'Empty Used' :
                         t.type || 'Unknown'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold">{t.quantity > 0 ? `+${t.quantity}` : t.quantity}</td>
                    <td className="py-3 px-4 text-gray-600 text-xs">{t.reason || '-'}</td>
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

// Stock Modal
const StockModal = ({ isOpen, onClose, onSave, onDelete, mode, item, products }) => {
  const [formData, setFormData] = useState({
    product_id: '',
    quantity: 1,
    reason: 'restock',
    notes: ''
  });

  const selectedProduct = products?.find(p => p.id === parseInt(formData.product_id));
  const isRefill = selectedProduct?.type?.toLowerCase() === 'refill' || 
                   selectedProduct?.type?.toLowerCase() === 'empty';

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

  const currentStock = selectedProduct?.stock ?? 0;
  const emptyStock = selectedProduct?.empty_bottle_stock ?? 0;
  const isInsufficient = isRefill ? false : emptyStock < formData.quantity;

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
              <div className={`p-3 rounded-lg text-xs ${isRefill ? 'bg-purple-50' : 'bg-blue-50'}`}>
                <p className="font-medium">{isRefill ? '🔄 Refill/Empty Bottle' : '📦 Sealed Bottle'}</p>
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
                      {isInsufficient && ' ⚠️ Insufficient!'}
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
                <p className="text-xs text-red-600 mt-1">⚠️ Not enough empty bottles! Available: {emptyStock}</p>
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
  const [searchTerm, setSearchTerm] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [showTransactions, setShowTransactions] = useState(false);
  const [stockSummary, setStockSummary] = useState({ sealed_bottles: 0, empty_bottles: 0, total: 0 });
  const [syncing, setSyncing] = useState(false);
  const [localProducts, setLocalProducts] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Update local products when prop changes
  useEffect(() => {
    console.log('📊 StockLevels received products:', products);
    if (Array.isArray(products)) {
      setLocalProducts(products);
      console.log(`📊 Set ${products.length} products to local state`);
    } else {
      console.warn('⚠️ Products is not an array:', products);
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
      toast.success('Data refreshed!');
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
      toast.success('Empty bottle stock synced!');
      await handleRefresh();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Sync failed');
    } finally {
      setSyncing(false);
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
        toast.success(response.data.message || 'Stock updated successfully!');
        setStockModal({ isOpen: false, mode: 'add', item: null });
        
        // IMPORTANT: Refresh data immediately
        await handleRefresh();
      } else {
        throw new Error(response.data?.message || 'Failed to update stock');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      if (msg.includes('Insufficient empty bottles')) {
        toast.error(`⚠️ ${msg}`, { duration: 6000 });
      } else if (msg.includes('No matching empty/refill product found')) {
        toast.error(`⚠️ ${msg}\n\nCreate a matching refill product first.`, { duration: 6000 });
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

  // Use localProducts for display
  const productList = Array.isArray(localProducts) ? localProducts : [];
  const totalStock = productList.reduce((sum, item) => sum + (item.stock || 0), 0);
  const lowStockItems = productList.filter((item) => item.status === 'low');
  const filteredProducts = productList.filter(p => 
    p.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Debug: Log what we're displaying
  console.log('📊 Rendering with productList:', productList.length, 'items');
  console.log('📊 First product:', productList[0]);

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
                <CheckCircle size={18} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium">Sealed</p>
                <p className="text-xl font-bold text-gray-900">{stockSummary.sealed_bottles}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                <FlaskConical size={18} className="text-purple-600" />
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
              <button onClick={() => setStockModal({ isOpen: true, mode: 'add', item: null })} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700">
                <Plus size={14} className="inline mr-1" /> Add
              </button>
              <button onClick={handleRefresh} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg" disabled={loading || isRefreshing}>
                <RefreshCw size={18} className={(loading || isRefreshing) ? 'animate-spin' : ''} />
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
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${isRefill ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                            {isRefill ? 'Refill' : 'Sealed'}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium">{item.stock}</td>
                        <td className="py-3 px-4">{item.empty_bottle_stock || 0}</td>
                        <td className="py-3 px-4">
                          {isLow ? (
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">⚠️ Low</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">✓ OK</span>
                          )}
                        </td>
                        <td className="py-3 px-4">{formatCurrency(item.unit_price)}</td>
                        <td className="py-3 px-4 text-center">
                          <button onClick={() => setStockModal({ isOpen: true, mode: 'edit', item })} className="p-1 text-gray-500 hover:text-blue-600">
                            <Edit size={14} />
                          </button>
                          <button onClick={() => setStockModal({ isOpen: true, mode: 'delete', item })} className="p-1 text-gray-500 hover:text-red-600 ml-1">
                            <Trash2 size={14} />
                          </button>
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
              <h2 className="text-base font-semibold text-gray-900">⚠️ Low Stock Alerts</h2>
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
                        <button onClick={() => setStockModal({ isOpen: true, mode: 'edit', item })} className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700">
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