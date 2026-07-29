// frontend/src/components/inventory/EmptyBottles.jsx
import { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  FlaskConical, RefreshCw, AlertTriangle, Calendar, 
  TrendingUp, Truck, Package, ChevronLeft, ChevronRight, Search, X
} from 'lucide-react';
import toast from 'react-hot-toast';
import { inventoryAPI } from '../../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// ─── Query Keys ───
const QUERY_KEYS = {
  EMPTY_BOTTLES: ['emptyBottles'],
  EMPTY_BOTTLES_STOCK: ['emptyBottles', 'stock'],
  EMPTY_BOTTLES_HISTORY: ['emptyBottles', 'history'],
  EMPTY_BOTTLES_AGGREGATE: ['emptyBottles', 'aggregate'],
  EMPTY_BOTTLES_DELIVERIES: ['emptyBottles', 'deliveries'],
};

// ─── Pagination Component ───
const Pagination = ({ currentPage, totalPages, onPageChange, totalItems, itemsPerPage }) => {
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    if (start > 1) {
      pages.push(1);
      if (start > 2) pages.push('...');
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (end < totalPages) {
      if (end < totalPages - 1) pages.push('...');
      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex-wrap gap-2">
      <div className="text-sm text-gray-500">
        Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} entries
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={18} />
        </button>
        
        {getPageNumbers().map((page, index) => (
          <button
            key={index}
            onClick={() => typeof page === 'number' && onPageChange(page)}
            disabled={page === '...'}
            className={`min-w-[36px] h-9 px-3 text-sm font-medium rounded-lg transition-colors ${
              page === currentPage
                ? 'bg-amber-600 text-white hover:bg-amber-700'
                : page === '...'
                ? 'text-gray-400 cursor-default'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {page}
          </button>
        ))}
        
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
};

// ─── Main Component ───
export default function EmptyBottles({ onRefresh, loading: parentLoading }) {
  const queryClient = useQueryClient();

  // ─── State ───
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');

  // ─── React Query: Fetch Empty Bottles Stock ───
  const {
    data: stockData,
    isLoading: stockLoading,
    isFetching: stockFetching,
    error: stockError,
    refetch: refetchStock,
  } = useQuery({
    queryKey: QUERY_KEYS.EMPTY_BOTTLES_STOCK,
    queryFn: async () => {
      const response = await inventoryAPI.getEmptyBottles();
      return response.data?.emptyBottles || null;
    },
    staleTime: 60000,
    gcTime: 300000,
    refetchOnWindowFocus: false,
    refetchInterval: 120000,
    placeholderData: (previousData) => previousData,
  });

  // ─── React Query: Fetch Empty Bottles History ───
  const {
    data: returnsData = [],
    isLoading: historyLoading,
    isFetching: historyFetching,
    error: historyError,
    refetch: refetchHistory,
  } = useQuery({
    queryKey: QUERY_KEYS.EMPTY_BOTTLES_HISTORY,
    queryFn: async () => {
      const response = await inventoryAPI.getEmptyBottleHistory();
      return response.data?.returns || [];
    },
    staleTime: 60000,
    gcTime: 300000,
    refetchOnWindowFocus: false,
    refetchInterval: 120000,
    placeholderData: (previousData) => previousData,
  });

  // ─── React Query: Fetch Aggregate Data ───
  const {
    data: aggregateData = [],
    isLoading: aggregateLoading,
  } = useQuery({
    queryKey: QUERY_KEYS.EMPTY_BOTTLES_AGGREGATE,
    queryFn: async () => {
      const response = await inventoryAPI.getEmptyBottleDailyAggregate(30);
      return response.data?.aggregate || [];
    },
    staleTime: 300000, // 5 minutes for historical data
    gcTime: 600000,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData,
  });

  // ─── React Query: Fetch Completed Deliveries ───
  const {
    data: deliveriesData = [],
    isLoading: deliveriesLoading,
  } = useQuery({
    queryKey: QUERY_KEYS.EMPTY_BOTTLES_DELIVERIES,
    queryFn: async () => {
      const response = await inventoryAPI.getCompletedDeliveries();
      return response.data?.deliveries || [];
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
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.EMPTY_BOTTLES_STOCK });
      toast.success('Empty stock synced successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to sync empty stock');
    },
  });

  // ─── React Query: Record Empty Bottle Return Mutation ───
  const recordReturnMutation = useMutation({
    mutationFn: async (data) => {
      const response = await inventoryAPI.recordEmptyBottleReturn(data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.EMPTY_BOTTLES_STOCK });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.EMPTY_BOTTLES_HISTORY });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.EMPTY_BOTTLES_AGGREGATE });
      toast.success('Empty bottle return recorded successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to record return');
    },
  });

  // ─── Memoized Computations ───
  const totalReturns = useMemo(() => {
    return returnsData.reduce((sum, r) => sum + (r.quantity || 0), 0);
  }, [returnsData]);

  const emptyBottleStatus = useMemo(() => {
    const stock = stockData?.stock || 0;
    return stock < 10 ? 'low' : 'sufficient';
  }, [stockData]);

  // ─── Filter and Paginate Returns ───
  const filteredReturns = useMemo(() => {
    let filtered = [...returnsData];

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(r => 
        r.delivery_id?.toString().includes(term) ||
        r.customer?.name?.toLowerCase().includes(term) ||
        r.customer?.phone?.includes(term) ||
        r.quantity?.toString().includes(term)
      );
    }

    return filtered;
  }, [returnsData, searchTerm]);

  const totalPages = Math.ceil(filteredReturns.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentReturns = filteredReturns.slice(startIndex, startIndex + itemsPerPage);

  // ─── Handlers ───
  const handleRefresh = useCallback(() => {
    refetchStock();
    refetchHistory();
    if (onRefresh) onRefresh();
  }, [refetchStock, refetchHistory, onRefresh]);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      const tableContainer = document.getElementById('collection-history-table');
      if (tableContainer) {
        tableContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const clearSearch = () => {
    setSearchTerm('');
    setCurrentPage(1);
  };

  const handleItemsPerPageChange = (e) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  const handleSyncStock = () => {
    syncEmptyStockMutation.mutate();
  };

  // ─── Loading State ───
  const isLoading = stockLoading || historyLoading || aggregateLoading || deliveriesLoading || parentLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading empty bottle data...</p>
        </div>
      </div>
    );
  }

  // ─── Error State ───
  if (stockError || historyError) {
    const error = stockError || historyError;
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700">
        <h3 className="font-semibold text-lg mb-2">Error Loading Data</h3>
        <p>{error.message || 'Failed to load empty bottle data'}</p>
        <button
          onClick={handleRefresh}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const isRefreshing = stockFetching || historyFetching;

  return (
    <div className="space-y-6">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">19L Empty Bottle Tracking</h2>
          <p className="text-sm text-gray-500">Empty bottles collected from completed deliveries</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSyncStock}
            disabled={syncEmptyStockMutation.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={syncEmptyStockMutation.isPending ? 'animate-spin' : ''} />
            Sync Stock
          </button>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ─── Summary Cards ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <FlaskConical size={18} className="text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">Available Empty Bottles</p>
              <p className="text-2xl font-bold text-gray-900">{stockData?.stock || 0}</p>
            </div>
          </div>
          <div className="flex gap-2 mt-2">
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
              emptyBottleStatus === 'low' ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'
            }`}>
              {emptyBottleStatus === 'low' ? '⚠️ Low Stock' : '✅ Sufficient'}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Calendar size={18} className="text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">Total Collections</p>
              <p className="text-2xl font-bold text-gray-900">{returnsData.length}</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">{totalReturns} bottles total</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
              <Truck size={18} className="text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">From Deliveries</p>
              <p className="text-2xl font-bold text-gray-900">{returnsData.length}</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">All from completed deliveries</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
              <TrendingUp size={18} className="text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">Total Collected</p>
              <p className="text-2xl font-bold text-gray-900">{stockData?.total_collected || 0}</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">Lifetime collection</p>
        </div>
      </div>

      {/* ─── Chart ─── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Daily Collection</h3>
            <p className="text-xs text-gray-400 mt-0.5">19L bottles collected per day (Last 30 days)</p>
          </div>
          {aggregateData.length > 0 && (
            <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">
              {aggregateData.reduce((sum, d) => sum + (d.bottles_collected || 0), 0)} bottles total
            </span>
          )}
        </div>
        {aggregateData.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={aggregateData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="period" tick={{ fontSize: 10 }} angle={-15} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip 
                formatter={(value) => [`${value} bottles`, 'Collected']}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Bar dataKey="bottles_collected" name="Empty Bottles Collected" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <FlaskConical size={32} className="mx-auto mb-2 text-gray-300" />
            <p>No collection data available</p>
          </div>
        )}
      </div>

      {/* ─── Returns Table ─── */}
      <div id="collection-history-table" className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Collection History</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Empty bottles collected from completed deliveries
              {isRefreshing && ' (updating...)'}
            </p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search delivery, customer..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="w-full sm:w-56 pl-9 pr-8 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all"
              />
              {searchTerm && (
                <button
                  onClick={clearSearch}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <select
              value={itemsPerPage}
              onChange={handleItemsPerPageChange}
              className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all bg-white"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          {currentReturns.length > 0 ? (
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Delivery</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                </tr>
              </thead>
              <tbody>
                {currentReturns.map((record, index) => (
                  <tr key={record.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="py-3 px-4 text-gray-400 text-xs">
                      {startIndex + index + 1}
                    </td>
                    <td className="py-3 px-4 text-gray-700">
                      {record.return_date ? new Date(record.return_date).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 text-xs text-blue-600">
                        <Truck size={12} />
                        Delivery #{record.delivery_id}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-gray-900">{record.quantity}</td>
                    <td className="py-3 px-4 text-gray-600">
                      {record.customer?.name || 'N/A'}
                      {record.customer?.phone && (
                        <span className="text-xs text-gray-400 block">{record.customer.phone}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-12 text-center">
              {searchTerm ? (
                <>
                  <Package size={40} className="mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-500 font-medium">No results found</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Try adjusting your search term
                  </p>
                  <button
                    onClick={clearSearch}
                    className="mt-4 text-sm text-amber-600 hover:text-amber-700 font-medium"
                  >
                    Clear search
                  </button>
                </>
              ) : (
                <>
                  <FlaskConical size={40} className="mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-500 font-medium">No empty bottles collected yet</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Empty bottles are automatically collected when deliveries are completed
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Pagination */}
        {filteredReturns.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            totalItems={filteredReturns.length}
            itemsPerPage={itemsPerPage}
          />
        )}
      </div>

      {/* ─── Footer Summary ─── */}
      {filteredReturns.length > 0 && (
        <div className="flex items-center justify-between text-xs text-gray-400 px-1 flex-wrap gap-2">
          <span>
            Showing {startIndex + 1} - {Math.min(startIndex + itemsPerPage, filteredReturns.length)} of {filteredReturns.length} records
            {searchTerm && ` (filtered from ${returnsData.length} total)`}
          </span>
          <span>
            {filteredReturns.reduce((sum, r) => sum + (r.quantity || 0), 0)} bottles in this view
          </span>
        </div>
      )}
    </div>
  );
}