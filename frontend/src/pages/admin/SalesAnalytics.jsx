import React, { useState, useCallback } from 'react';
import { Trophy, Package, TrendingUp, Users, Loader2, RefreshCw } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';

export const formatLKR = (amount) => {
  const num = Number(amount) || 0;
  return `Rs. ${num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const RANK_COLORS = {
  1: "bg-amber-100 text-amber-700",
  2: "bg-gray-100 text-gray-600",
  3: "bg-orange-100 text-orange-700",
};

function RankBadge({ rank }) {
  return (
    <span
      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
        RANK_COLORS[rank] || "bg-blue-50 text-blue-600"
      }`}
    >
      {rank}
    </span>
  );
}

// ===== API FUNCTION =====
const fetchOrders = async () => {
  const response = await api.get("/orders");
  const data = response.data;
  return data.orders || data || [];
};

// ===== ANALYTICS PROCESSING FUNCTION =====
const processAnalytics = (allOrders) => {
  // Only count orders that were actually completed
  const deliveredOrders = allOrders.filter(
    (o) => (o.order_status || o.status || "").toUpperCase() === "DELIVERED"
  );

  // ---- Top customers: aggregate by customer ----
  const customerMap = {};
  let totalRevenue = 0;

  deliveredOrders.forEach((o) => {
    const amount = Number(o.total_amount ?? o.amount ?? 0);
    totalRevenue += amount;

    const key = o.customer_id || o.customer_phone || o.customer_name || "unknown";
    if (!customerMap[key]) {
      customerMap[key] = {
        name: o.customer_name || o.customer?.name || "Unknown",
        phone: o.customer_phone || o.customer?.phone || "",
        orders: 0,
        totalSpent: 0,
      };
    }
    customerMap[key].orders += 1;
    customerMap[key].totalSpent += amount;
  });

  const sortedCustomers = Object.values(customerMap)
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 5)
    .map((c, idx) => ({ ...c, rank: idx + 1 }));

  const repeatCount = Object.values(customerMap).filter((c) => c.orders > 1).length;

  // ---- Best selling products: aggregate across every order's items ----
  const productMap = {};
  deliveredOrders.forEach((o) => {
    (o.items || []).forEach((item) => {
      const name = item.product_name || item.productName || item.product || "Unknown product";
      if (!productMap[name]) {
        productMap[name] = { name, unitsSold: 0, revenue: 0 };
      }
      productMap[name].unitsSold += Number(item.quantity || 0);
      productMap[name].revenue += Number(item.sub_total ?? item.subTotal ?? 0);
    });
  });

  const sortedProducts = Object.values(productMap)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)
    .map((p, idx) => ({ ...p, rank: idx + 1 }));

  return {
    topCustomers: sortedCustomers,
    bestSellingProducts: sortedProducts,
    repeatCustomerCount: repeatCount,
    avgOrderValue: deliveredOrders.length > 0 ? totalRevenue / deliveredOrders.length : 0,
    totalDeliveredOrders: deliveredOrders.length,
    totalRevenue: totalRevenue,
  };
};

export default function SalesAnalytics() {
  const [refreshKey, setRefreshKey] = useState(0);

  // ===== REACT QUERY: Fetch Orders with Caching & Polling =====
  const {
    data: allOrders = [],
    isLoading,
    error,
    refetch,
    isFetching,
    dataUpdatedAt,
  } = useQuery({
    queryKey: ['sales-analytics', refreshKey],
    queryFn: fetchOrders,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 60000, // Poll every 60 seconds
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: false,
    retry: 2,
  });

  // ===== PROCESS DATA =====
  const analytics = processAnalytics(allOrders);
  const {
    topCustomers,
    bestSellingProducts,
    repeatCustomerCount,
    avgOrderValue,
    totalDeliveredOrders,
    totalRevenue,
  } = analytics;

  // ===== HANDLERS =====
  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    refetch();
  };

  // Get last updated time
  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : 'Never';

  // ===== LOADING STATE =====
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-sm text-gray-500">Loading sales analytics...</p>
      </div>
    );
  }

  // ===== ERROR STATE =====
  if (error) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-xl border border-rose-100 shadow-sm p-6 text-center">
          <div className="text-rose-500 text-sm mb-3">Failed to load sales data</div>
          <p className="text-xs text-gray-400 mb-4">{error.message || 'Something went wrong'}</p>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">
            Top customers and best-selling products, based on delivered orders
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Last updated: {lastUpdated} • {totalDeliveredOrders} delivered orders • Total revenue: {formatLKR(totalRevenue)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isFetching && (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              Updating...
            </span>
          )}
          <button
            onClick={handleRefresh}
            disabled={isFetching}
            className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:text-blue-700 font-medium bg-white rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Quick stat strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="bg-blue-500 rounded-lg p-2.5">
              <Users className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Repeat customers</p>
              <p className="text-lg font-bold text-gray-900">{repeatCustomerCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500 rounded-lg p-2.5">
              <Package className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Top product overall</p>
              <p className="text-lg font-bold text-gray-900 truncate max-w-[120px]">
                {bestSellingProducts[0]?.name || "—"}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="bg-purple-500 rounded-lg p-2.5">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Avg. order value</p>
              <p className="text-lg font-bold text-gray-900">{formatLKR(avgOrderValue)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="bg-amber-500 rounded-lg p-2.5">
              <Trophy className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Total revenue</p>
              <p className="text-lg font-bold text-gray-900">{formatLKR(totalRevenue)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Customers */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 p-5 border-b border-gray-50">
            <Trophy className="w-4 h-4 text-amber-500" />
            <h2 className="text-base font-semibold text-gray-900">Top Customers</h2>
            <span className="ml-auto text-xs text-gray-400">
              {topCustomers.length} customers
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase tracking-wide bg-gray-50">
                  <th className="px-5 py-2 font-medium">#</th>
                  <th className="px-5 py-2 font-medium">Customer</th>
                  <th className="px-5 py-2 font-medium text-center">Orders</th>
                  <th className="px-5 py-2 font-medium text-right">Total spent</th>
                </tr>
              </thead>
              <tbody>
                {topCustomers.map((c) => (
                  <tr key={c.rank} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3">
                      <RankBadge rank={c.rank} />
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-gray-900 font-medium">{c.name}</p>
                      <p className="text-xs text-gray-400">{c.phone}</p>
                    </td>
                    <td className="px-5 py-3 text-center text-gray-600">{c.orders}</td>
                    <td className="px-5 py-3 text-right font-semibold text-gray-900">
                      {formatLKR(c.totalSpent)}
                    </td>
                  </tr>
                ))}
                {topCustomers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-gray-400">
                      No delivered orders yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Best Selling Products */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 p-5 border-b border-gray-50">
            <Package className="w-4 h-4 text-blue-500" />
            <h2 className="text-base font-semibold text-gray-900">Best Selling Products</h2>
            <span className="ml-auto text-xs text-gray-400">
              {bestSellingProducts.length} products
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase tracking-wide bg-gray-50">
                  <th className="px-5 py-2 font-medium">#</th>
                  <th className="px-5 py-2 font-medium">Product</th>
                  <th className="px-5 py-2 font-medium text-center">Units sold</th>
                  <th className="px-5 py-2 font-medium text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {bestSellingProducts.map((p) => (
                  <tr key={p.rank} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3">
                      <RankBadge rank={p.rank} />
                    </td>
                    <td className="px-5 py-3 text-gray-900 font-medium">{p.name}</td>
                    <td className="px-5 py-3 text-center text-gray-600">{p.unitsSold}</td>
                    <td className="px-5 py-3 text-right font-semibold text-gray-900">
                      {formatLKR(p.revenue)}
                    </td>
                  </tr>
                ))}
                {bestSellingProducts.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-gray-400">
                      No delivered order items yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Additional Stats Footer */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-gray-400 bg-white rounded-xl border border-gray-100 p-4">
        <div>
          <span className="font-medium text-gray-600">Total Customers:</span> {topCustomers.length + (repeatCustomerCount > 5 ? ' + more' : '')}
        </div>
        <div>
          <span className="font-medium text-gray-600">Delivered Orders:</span> {totalDeliveredOrders}
        </div>
        <div>
          <span className="font-medium text-gray-600">Auto-refresh:</span> Every 60 seconds
        </div>
      </div>
    </div>
  );
}