// frontend/src/components/VendorExpensesTable.jsx
import { formatCurrency } from '../utils/helpers';
import { useEffect, useState } from 'react';

const STATUS_STYLES = {
  pending: 'bg-amber-50 text-amber-700',
  ordered: 'bg-blue-50 text-blue-700',
  shipped: 'bg-indigo-50 text-indigo-700',
  delivered: 'bg-emerald-50 text-emerald-700',
  cancelled: 'bg-gray-100 text-gray-500',
};

export default function VendorExpensesTable({ orders }) {
  const [normalizedOrders, setNormalizedOrders] = useState([]);

  useEffect(() => {
    // Normalize the orders data to handle different data structures
    const normalizeOrders = (ordersData) => {
      if (!ordersData || !Array.isArray(ordersData)) return [];
      
      return ordersData.map(order => {
        // Handle different possible data structures
        return {
          id: order.id || order.order_id,
          vendorName: order.vendorName || 
                       order.vendors?.vendor_name || 
                       order.vendor_name || 
                       order.vendor?.name ||
                       'Unknown Vendor',
          productName: order.productName || 
                       order.products?.name || 
                       order.product_name || 
                       order.product?.name ||
                       'Unknown Product',
          quantity: order.quantity || 0,
          unitPrice: Number(order.unitPrice || order.unit_price || 0),
          total: Number(order.total || order.total_amount || 0),
          orderDate: order.orderDate || order.order_date || order.created_at || new Date().toISOString().split('T')[0],
          status: order.status || 'pending',
          // Keep original data for debugging if needed
          _raw: order
        };
      });
    };

    const normalized = normalizeOrders(orders);
    setNormalizedOrders(normalized);
  }, [orders]);

  const activeOrders = normalizedOrders.filter((o) => o.status !== 'cancelled');
  const total = activeOrders.reduce((sum, o) => sum + o.total, 0);

  if (normalizedOrders.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
        <p className="text-gray-400 text-sm">No vendor orders found</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left py-3 px-4 font-semibold text-gray-600">Vendor</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-600">Product</th>
              <th className="text-right py-3 px-4 font-semibold text-gray-600">Qty</th>
              <th className="text-right py-3 px-4 font-semibold text-gray-600">Unit Price</th>
              <th className="text-right py-3 px-4 font-semibold text-gray-600">Total</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-600">Order Date</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-600">Status</th>
            </tr>
          </thead>
          <tbody>
            {normalizedOrders.map((order) => (
              <tr key={order.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                <td className="py-3 px-4 font-medium text-gray-900">{order.vendorName}</td>
                <td className="py-3 px-4 text-gray-700">{order.productName}</td>
                <td className="py-3 px-4 text-right text-gray-700">{order.quantity}</td>
                <td className="py-3 px-4 text-right text-gray-700">{formatCurrency(order.unitPrice)}</td>
                <td className="py-3 px-4 text-right font-medium text-gray-900">{formatCurrency(order.total)}</td>
                <td className="py-3 px-4 text-gray-700">{order.orderDate}</td>
                <td className="py-3 px-4">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[order.status] || 'bg-gray-100 text-gray-500'}`}>
                    {order.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
        <span className="text-xs text-gray-400">
          {activeOrders.length} active order(s)
        </span>
        <span className="text-sm font-semibold text-gray-900">
          Total: {formatCurrency(total)}
        </span>
      </div>
    </div>
  );
}