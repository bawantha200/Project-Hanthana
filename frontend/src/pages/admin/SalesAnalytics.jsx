import React, { useState, useEffect, useCallback } from "react";
import { Trophy, Package, TrendingUp, Users, Loader2 } from "lucide-react";
import api from "../../services/api";

function formatLKR(value) {
  return "LKR " + Number(value || 0).toLocaleString();
}

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

export default function SalesAnalytics() {
  const [topCustomers, setTopCustomers] = useState([]);
  const [bestSellingProducts, setBestSellingProducts] = useState([]);
  const [repeatCustomerCount, setRepeatCustomerCount] = useState(0);
  const [avgOrderValue, setAvgOrderValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Reuses the same /orders endpoint the admin Orders Management page
      // already uses (ordersService.getAllOrders on the backend) — this
      // already returns every order with its items, customer name, and status.
      const response = await api.get("/orders");
      const allOrders = response.data.orders || response.data || [];

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

      setTopCustomers(sortedCustomers);
      setBestSellingProducts(sortedProducts);
      setRepeatCustomerCount(repeatCount);
      setAvgOrderValue(deliveredOrders.length > 0 ? totalRevenue / deliveredOrders.length : 0);
    } catch (err) {
      console.error("Failed to load sales analytics:", err);
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">
            Top customers and best-selling products, based on delivered orders
          </p>
        </div>
        {!loading && (
          <button
            onClick={loadData}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Refresh
          </button>
        )}
      </div>

      {error && (
        <div className="bg-white rounded-xl border border-rose-100 shadow-sm p-5 mb-6 text-sm text-rose-500">
          Couldn't load sales data: {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400 text-sm gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading sales analytics...
        </div>
      ) : (
        <>
          {/* Quick stat strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
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
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-3">
                <div className="bg-emerald-500 rounded-lg p-2.5">
                  <Package className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Top product overall</p>
                  <p className="text-lg font-bold text-gray-900">
                    {bestSellingProducts[0]?.name || "—"}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
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
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Customers */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
              <div className="flex items-center gap-2 p-5 border-b border-gray-50">
                <Trophy className="w-4 h-4 text-amber-500" />
                <h2 className="text-base font-semibold text-gray-900">Top Customers</h2>
              </div>
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
                    <tr key={c.rank} className="border-b border-gray-50 last:border-0">
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

            {/* Best Selling Products */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
              <div className="flex items-center gap-2 p-5 border-b border-gray-50">
                <Package className="w-4 h-4 text-blue-500" />
                <h2 className="text-base font-semibold text-gray-900">Best Selling Products</h2>
              </div>
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
                    <tr key={p.rank} className="border-b border-gray-50 last:border-0">
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
        </>
      )}
    </div>
  );
}
