import { formatCurrency } from '../utils/helpers';

const STATUS_STYLES = {
  pending: 'bg-amber-50 text-amber-700',
  ordered: 'bg-blue-50 text-blue-700',
  shipped: 'bg-indigo-50 text-indigo-700',
  delivered: 'bg-emerald-50 text-emerald-700',
  cancelled: 'bg-gray-100 text-gray-500',
};

export default function VendorExpensesTable({ orders }) {
  const total = orders
    .filter((o) => o.status !== 'cancelled')
    .reduce((sum, o) => sum + o.total, 0);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
      {orders.length === 0 ? (
        <div className="p-8 text-center text-gray-400 text-sm">No vendor orders found</div>
      ) : (
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
              {orders.map((order) => (
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
      )}

      <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
        <span className="text-xs text-gray-400">
          {orders.filter((o) => o.status !== 'cancelled').length} active order(s)
        </span>
        <span className="text-sm font-semibold text-gray-900">
          Total: {formatCurrency(total)}
        </span>
      </div>
    </div>
  );
}