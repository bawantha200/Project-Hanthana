// frontend/src/components/inventory/StockTable.jsx
import { useState } from 'react';
import { 
  Search, 
  History, 
  RefreshCcw, 
  RefreshCw, 
  CirclePlus, 
  Undo2, 
  Package, 
  Power, 
  CheckCircle2, 
  XCircle 
} from 'lucide-react';

export default function StockTable({
  products = [],
  isRefreshing = false,
  searchTerm = '',
  setSearchTerm,
  setShowTransactions,
  handleSyncEmptyStock,
  syncEmptyStockMutation = {},
  handleRefresh,
  formatCurrency = (val) => `Rs. ${Number(val || 0).toFixed(2)}`,
  setConversionModal,
  isSubmitting = false,
  handleToggleActive, // Callback function to handle activate/deactivate API calls
  togglingId = null,  // ID of product currently being toggled
}) {
  // State for filtering by active status: 'all', 'active', 'inactive'
  const [activeFilter, setActiveFilter] = useState('all');

  // Filter products by search term AND active status
  const filteredProducts = products.filter((item) => {
    // Determine active status (defaults to true if undefined)
    const isActive = item.is_active !== false && item.is_active !== 0;

    // Filter by Active/Inactive tab
    if (activeFilter === 'active' && !isActive) return false;
    if (activeFilter === 'inactive' && isActive) return false;

    // Filter by Search Term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        item.name?.toLowerCase().includes(term) ||
        item.type?.toLowerCase().includes(term)
      );
    }

    return true;
  });

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header Bar */}
      <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Stock Levels</h2>
          <p className="text-xs text-gray-400">
            {filteredProducts.length} of {products.length} products showing
            {isRefreshing && ' (updating...)'}
          </p>
        </div>

        {/* Filter Tabs & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          {/* Active / Inactive Status Filter */}
          <div className="flex bg-gray-100 p-0.5 rounded-lg text-xs font-medium">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                activeFilter === 'all'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setActiveFilter('active')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                activeFilter === 'active'
                  ? 'bg-white text-green-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setActiveFilter('inactive')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                activeFilter === 'inactive'
                  ? 'bg-white text-red-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-900'
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
              className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg w-36 sm:w-40 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
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
            disabled={syncEmptyStockMutation?.isPending} 
            className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-xs font-medium hover:bg-amber-200 disabled:opacity-50 transition-colors"
          >
            <RefreshCcw size={14} className={`inline mr-1 ${syncEmptyStockMutation?.isPending ? 'animate-spin' : ''}`} /> Sync
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

      {/* Table Section */}
      <div className="overflow-x-auto">
        {filteredProducts.length > 0 ? (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">Product</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">Type</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">Stock</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">Empty</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">Stock Level</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">Active State</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500">Price</th>
                <th className="text-center py-3 px-4 text-xs font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((item) => {
                const isLow = item.status === 'low';
                const isRefill = item.type?.toLowerCase() === 'refill' || item.type?.toLowerCase() === 'empty';
                const isActive = item.is_active !== false && item.is_active !== 0;
                const isTogglingThis = togglingId === item.id;

                return (
                  <tr 
                    key={item.id} 
                    className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${
                      !isActive ? 'bg-gray-50/70 text-gray-400' : ''
                    }`}
                  >
                    {/* Product Name */}
                    <td className="py-3 px-4 font-medium text-gray-900">
                      <div className="flex items-center gap-2">
                        <span>{item.name}</span>
                        {!isActive && (
                          <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded font-normal">
                            Disabled
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Type */}
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${isRefill ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                        {isRefill ? 'Refill' : 'Sealed'}
                      </span>
                    </td>

                    {/* Stock & Empty Stock */}
                    <td className="py-3 px-4 font-medium">{item.stock}</td>
                    <td className="py-3 px-4">{item.empty_bottle_stock || 0}</td>

                    {/* Stock Level (Low / OK) */}
                    <td className="py-3 px-4">
                      {isLow ? (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">Low</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">OK</span>
                      )}
                    </td>

                    {/* Active State Badge */}
                    <td className="py-3 px-4">
                      {isActive ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 size={12} /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                          <XCircle size={12} /> Inactive
                        </span>
                      )}
                    </td>

                    {/* Price */}
                    <td className="py-3 px-4">{formatCurrency(item.unit_price)}</td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {/* Conversion Buttons */}
                        <button 
                          onClick={() => setConversionModal({ isOpen: true, type: 'empty_to_stock', product: item })} 
                          className={`p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors ${
                            !isActive ? 'opacity-30 cursor-not-allowed' : ''
                          }`}
                          title="Empty to Stock"
                          disabled={isSubmitting || !isActive}
                        >
                          <CirclePlus size={14} />
                        </button>
                        <button 
                          onClick={() => setConversionModal({ isOpen: true, type: 'stock_to_empty', product: item })} 
                          className={`p-1 text-amber-600 hover:bg-amber-50 rounded transition-colors ${
                            !isActive ? 'opacity-30 cursor-not-allowed' : ''
                          }`}
                          title="Stock to Empty"
                          disabled={isSubmitting || !isActive}
                        >
                          <Undo2 size={14} />
                        </button>

                        {/* Active / Inactive Toggle Button */}
                        <button
                          onClick={() => handleToggleActive && handleToggleActive(item.id, !isActive)}
                          disabled={isTogglingThis}
                          className={`p-1 rounded transition-colors ${
                            isActive 
                              ? 'text-red-500 hover:bg-red-50 hover:text-red-700' 
                              : 'text-green-600 hover:bg-green-50 hover:text-green-700'
                          }`}
                          title={isActive ? "Deactivate Stock" : "Activate Stock"}
                        >
                          <Power size={14} className={isTogglingThis ? 'animate-spin' : ''} />
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
  );
}